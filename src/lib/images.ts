import * as https from 'node:https';
import * as http from 'node:http';

import type { Aircraft, JetFrameConfig, AdapterLike } from './types';

const IMAGE_CACHE = {
	jetDir: 'img/jet',
	logoDir: 'img/logos',
	manufacturerDir: 'img/manufacturer',
};

const NEGATIVE_IMAGE_CACHE = new Map<string, number>();

const MAX_CACHED_JET_IMAGES = 300;
const MAX_CACHED_LOGOS = 500;

/**
 * Keeps the number of files in a cache directory bounded by evicting the
 * oldest files (by modification time) once the count exceeds maxFiles.
 * Without this, the aircraft/airline image cache grows without bound over
 * the adapter's lifetime, since every newly seen registration/airline gets
 * a permanently cached image that is never removed.
 */
async function enforceCacheLimit(
	adapter: AdapterLike,
	dir: string,
	maxFiles: number,
	logDebug: (msg: string, level?: number) => void,
): Promise<void> {
	try {
		const files = await adapter.readDirAsync('jetframe.admin', dir);
		const entries = (files || []).filter((f: any) => f?.file && !f.isDir);

		if (entries.length <= maxFiles) {
			return;
		}

		entries.sort((a: any, b: any) => {
			const ta = new Date(a.modifiedAt || a.stats?.mtime || 0).getTime();
			const tb = new Date(b.modifiedAt || b.stats?.mtime || 0).getTime();
			return ta - tb;
		});

		const toDelete = entries.slice(0, entries.length - maxFiles);

		for (const file of toDelete) {
			try {
				await adapter.unlinkAsync('jetframe.admin', `${dir}/${file.file}`);
			} catch {
				// ignore single file
			}
		}

		logDebug(`Cache limit enforced for ${dir}: removed ${toDelete.length} old file(s), keeping max ${maxFiles}`, 1);
	} catch {
		// directory may not exist yet - nothing to enforce
	}
}

const NEGATIVE_CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6h
const NEGATIVE_CACHE_SPECIAL_TTL_MS = 1000 * 60 * 30; // 30min

const MANUFACTURER_CACHE_LOGGED: Record<string, boolean> = {};

/**
 *
 */
export async function ensureImageDirs(
	adapter: AdapterLike,
	logDebug: (msg: string, level?: number) => void,
	logWarn: (msg: string) => void,
): Promise<void> {
	try {
		await adapter.writeFileAsync('jetframe.admin', '.keep', Buffer.from(''));

		logDebug('jetframe.admin file storage ready');
	} catch (e) {
		logWarn(`jetframe.admin storage error: ${errorText(e)}`);
	}
}

/**
 *
 */
export async function saveImages(
	adapter: AdapterLike,
	config: JetFrameConfig,
	a: Aircraft,
	logDebug: (msg: string, level?: number) => void,
	logWarn: (msg: string) => void,
): Promise<void> {
	let logoUrl = '';
	let jetUrl = '';

	if (config.cacheExternalImages) {
		logoUrl = await cacheLogoIfNeeded(adapter, a, logDebug, logWarn);
		jetUrl = await cacheJetIfNeeded(adapter, a, logDebug, logWarn);
	} else {
		logoUrl = a.logoUrl || '';

		// Cache aus:
		// Kein lokales Speichern, aber trotzdem bestes externes Bild ermitteln.
		jetUrl = String((a as any).fr24ImageUrl || '').trim() || String(a.jetphotosImageUrl || '').trim();

		if (!jetUrl) {
			jetUrl = await resolveFr24AircraftImageFromPage(a, logDebug, logWarn);
		}

		if (!jetUrl) {
			jetUrl = buildHexDbImageUrl(a);
		}
	}

	a.localLogoUrl = logoUrl;
	a.localImageUrl = jetUrl;
	a.finalImageUrl = jetUrl || '';

	const bases = [`${config.dpRoot}.current`];

	if (a.mode === 'OVERFLIGHT') {
		bases.push(`${config.dpRoot}.overflight`);
	} else {
		bases.push(`${config.dpRoot}.airport`);
	}

	for (const base of bases) {
		await adapter.setForeignStateAsync(`${base}.localLogoUrl`, logoUrl, true);

		await adapter.setForeignStateAsync(`${base}.localImageUrl`, jetUrl, true);

		await adapter.setForeignStateAsync(`${base}.finalImageUrl`, jetUrl || '', true);
	}
}

/**
 *
 */
export async function clearImageCache(
	adapter: AdapterLike,
	logDebug: (msg: string, level?: number) => void,
	logWarn: (msg: string) => void,
): Promise<void> {
	const dirs = [IMAGE_CACHE.jetDir, IMAGE_CACHE.logoDir, 'img/manufacturer'];

	for (const dir of dirs) {
		try {
			await deleteFolderFiles(adapter, dir, logDebug);
		} catch (e) {
			logWarn(`Cache folder could not be cleared: ${dir} | ${errorText(e)}`);
		}
	}

	logDebug('Image/logo cache cleared');
}

async function deleteFolderFiles(
	adapter: AdapterLike,
	dir: string,
	logDebug: (msg: string, level?: number) => void,
): Promise<void> {
	try {
		const files = await adapter.readDirAsync('jetframe.admin', dir);

		for (const file of files || []) {
			if (!file?.file) {
				continue;
			}

			const relPath = `${dir}/${file.file}`;

			try {
				await adapter.unlinkAsync('jetframe.admin', relPath);
				logDebug(`Cache deleted: ${relPath}`);
			} catch {
				// ignore single file
			}
		}
	} catch {
		// Ordner existiert nicht
	}
}

/**
 *
 */
export async function cacheExternalLogoUrl(
	adapter: AdapterLike,
	url: string,
	key: string,
	relDir: string,
	logDebug: (msg: string, level?: number) => void,
	logWarn: (msg: string) => void,
): Promise<string> {
	const cleanUrl = String(url || '').trim();

	if (!cleanUrl) {
		return '';
	}

	const fileBase = safeFileName(key || 'logo');

	const existing = await findExistingImage(adapter, relDir, fileBase);

	if (existing) {
		if (!MANUFACTURER_CACHE_LOGGED[existing.url]) {
			MANUFACTURER_CACHE_LOGGED[existing.url] = true;
			logDebug(`Logo cache hit: ${existing.url}`);
		}

		return existing.url;
	}

	try {
		logDebug(`Logo download: ${cleanUrl}`);

		const buffer = await downloadImageBuffer(cleanUrl, false);

		const ext = detectImageExt(buffer);

		const relPath = `${relDir}/${fileBase}.${ext}`;

		await adapter.writeFileAsync('jetframe.admin', relPath, buffer);

		const cachedUrl = publicUrl(relPath);

		logDebug(`Logo saved: ${cachedUrl}`);

		return cachedUrl;
	} catch (e) {
		logWarn(`Logo download/save error: ${errorText(e)}`);

		return cleanUrl;
	}
}

export const MANUFACTURER_LOGO_CACHE_DIR = IMAGE_CACHE.manufacturerDir;

async function cacheLogoIfNeeded(
	adapter: AdapterLike,
	a: Aircraft,
	logDebug: (msg: string, level?: number) => void,
	logWarn: (msg: string) => void,
): Promise<string> {
	if (!a.logoUrl) {
		return '';
	}

	const logoKey = String(a.airlineIcao || a.airlineIata || a.callsign || 'logo')
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, '')
		.substring(0, 8);

	const fileBase = safeFileName(logoKey);

	const existing = await findExistingImage(adapter, IMAGE_CACHE.logoDir, fileBase);

	if (existing) {
		logDebug(`Airline logo cache hit: ${existing.url}`);
		return existing.url;
	}

	try {
		logDebug(`Logo download: ${a.logoUrl}`);

		const buffer = await downloadImageBuffer(a.logoUrl, false);

		const ext = detectImageExt(buffer);

		const relPath = `${IMAGE_CACHE.logoDir}/${fileBase}.${ext}`;

		await adapter.writeFileAsync('jetframe.admin', relPath, buffer);

		const url = publicUrl(relPath);

		logDebug(`Logo saved: ${url}`);

		await enforceCacheLimit(adapter, IMAGE_CACHE.logoDir, MAX_CACHED_LOGOS, logDebug);

		return url;
	} catch (e) {
		logWarn(`Logo download/save error: ${errorText(e)}`);

		return '';
	}
}

function buildHexDbImageUrl(a: Aircraft): string {
	const hex = String(a.hex || '')
		.trim()
		.toLowerCase()
		.replace(/[^a-f0-9]/g, '');

	if (hex) {
		return `https://hexdb.io/hex-image?hex=${hex}`;
	}

	const reg = String(a.registration || '')
		.trim()
		.toUpperCase()
		.replace(/[^A-Z0-9-]/g, '');

	if (reg) {
		return `https://hexdb.io/static/aircraft-images/${reg}.jpg`;
	}

	return '';
}

async function cacheJetIfNeeded(
	adapter: AdapterLike,
	a: Aircraft,
	logDebug: (msg: string, level?: number) => void,
	logWarn: (msg: string) => void,
): Promise<string> {
	const key = a.registration || a.callsign || a.hex || 'unknown';

	const fileBase = safeFileName(key);

	// --------------------------------------------------
	// Smarter Negative Cache
	// --------------------------------------------------

	const negativeKey = String(fileBase).toUpperCase();

	const isSpecial =
		String((a as any).specialLivery || '').trim() ||
		String((a as any).specialLiveryVisText || '').trim() ||
		String((a as any).emergency || '').trim() ||
		String((a as any).aircraftSize || '')
			.toLowerCase()
			.includes('heavy');

	const ttl = isSpecial ? NEGATIVE_CACHE_SPECIAL_TTL_MS : NEGATIVE_CACHE_TTL_MS;

	const negativeTs = NEGATIVE_IMAGE_CACHE.get(negativeKey);

	if (negativeTs && Date.now() - negativeTs < ttl) {
		logDebug(`Jet negative-cache hit: ${negativeKey}`);

		return '';
	}

	const existing = await findExistingImage(adapter, IMAGE_CACHE.jetDir, fileBase);

	if (existing) {
		logDebug(`Aircraft image cache hit: ${existing.url}`);
		return existing.url;
	}

	const hexUrl = buildHexDbImageUrl(a);

	if (hexUrl) {
		try {
			logDebug(`Jet image download (HexDB): ${hexUrl}`);

			const buffer = await downloadImageBuffer(hexUrl, false);

			const ext = detectImageExt(buffer);

			const relPath = `${IMAGE_CACHE.jetDir}/${fileBase}.${ext}`;

			await adapter.writeFileAsync('jetframe.admin', relPath, buffer);

			const url = publicUrl(relPath);

			logDebug(`Jet saved (HexDB): ${url}`);

			await enforceCacheLimit(adapter, IMAGE_CACHE.jetDir, MAX_CACHED_JET_IMAGES, logDebug);

			return url;
		} catch (e) {
			logDebug(`Jet image HexDB not usable: ${errorText(e)}`);
		}
	}

	let fr24Url = String((a as any).fr24ImageUrl || a.jetphotosImageUrl || '').trim();

	if (!fr24Url) {
		fr24Url = await resolveFr24AircraftImageFromPage(a, logDebug, logWarn);
	}

	if (!fr24Url) {
		NEGATIVE_IMAGE_CACHE.set(negativeKey, Date.now());

		logDebug(`Jet image negative-cached: ${negativeKey}`);

		return '';
	}

	try {
		logDebug(`Jet image download (FR24 fallback): ${fr24Url}`);

		const buffer = await downloadImageBuffer(fr24Url, true);

		const ext = detectImageExt(buffer);

		const relPath = `${IMAGE_CACHE.jetDir}/${fileBase}.${ext}`;

		await adapter.writeFileAsync('jetframe.admin', relPath, buffer);

		const url = publicUrl(relPath);

		logDebug(`Jet saved (FR24 fallback): ${url}`);

		await enforceCacheLimit(adapter, IMAGE_CACHE.jetDir, MAX_CACHED_JET_IMAGES, logDebug);

		return url;
	} catch (e) {
		const message = errorText(e);

		if (/HTTP 404 at/.test(message)) {
			logDebug(`FR24 image not found: ${message}`);
		} else {
			logWarn(`FR24 image download/save error: ${message}`);
		}

		NEGATIVE_IMAGE_CACHE.set(negativeKey, Date.now());

		logDebug(`Jet image negative-cached: ${negativeKey}`);

		return '';
	}
}

async function findExistingImage(
	adapter: AdapterLike,
	relDir: string,
	fileBase: string,
): Promise<{ url: string } | null> {
	const exts = ['jpg', 'jpeg', 'png', 'webp', 'avif'];

	for (const ext of exts) {
		const relPath = `${relDir}/${fileBase}.${ext}`;

		try {
			const file = await adapter.readFileAsync('jetframe.admin', relPath);

			if (file?.file) {
				return {
					url: publicUrl(relPath),
				};
			}
		} catch {
			// ignore
		}
	}

	return null;
}

async function resolveFr24AircraftImageFromPage(
	a: Aircraft,
	logDebug: (msg: string, level?: number) => void,
	logWarn: (msg: string) => void,
): Promise<string> {
	const reg = String(a.registration || '')
		.trim()
		.toLowerCase();

	if (!reg) {
		return '';
	}

	const url = `https://www.flightradar24.com/data/aircraft/${encodeURIComponent(reg)}`;

	try {
		logDebug(`FR24 aircraft page request: ${url}`);

		const html = await new Promise<string>((resolve, reject) => {
			const req = https.get(
				url,
				{
					headers: {
						'User-Agent': 'Mozilla/5.0 AppleWebKit/605.1.15 Safari/604.1',
					},
					timeout: 20000,
				},
				res => {
					if (res.statusCode !== 200) {
						reject(new Error(`HTTP ${res.statusCode}`));

						return;
					}

					const chunks: Buffer[] = [];

					res.on('data', chunk => {
						chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
					});

					res.on('end', () => {
						resolve(Buffer.concat(chunks).toString('utf8'));
					});
				},
			);

			req.on('timeout', () => {
				req.destroy(new Error('FR24 Timeout'));
			});

			req.on('error', reject);
		});

		const matches = [...html.matchAll(/https:\/\/cdn\.jetphotos\.com\/[^"' ]+\.(jpg|jpeg|png|webp)/gi)];

		if (!matches.length) {
			logDebug(`FR24 aircraft no image found: ${reg}`);

			return '';
		}

		const imageUrl = String(matches[0][0] || '').trim();

		logDebug(`FR24 aircraft image found: ${imageUrl}`);

		return imageUrl;
	} catch (e) {
		const message = errorText(e);

		if (/HTTP 404 at/.test(message)) {
			logDebug(`FR24 aircraft page not found: ${message}`);
		} else {
			logWarn(`FR24 aircraft error: ${message}`);
		}

		return '';
	}
}

function looksLikeImageBuffer(buf: Buffer): boolean {
	if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
		return true;
	}

	if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
		return true;
	}

	if (
		buf.length >= 12 &&
		buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
		buf.subarray(8, 12).toString('ascii') === 'WEBP'
	) {
		return true;
	}

	if (buf.includes(Buffer.from('ftypavif'))) {
		return true;
	}

	return false;
}

function detectImageExt(buf: Buffer): string {
	// JPG
	if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
		return 'jpg';
	}

	// PNG
	if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
		return 'png';
	}

	// WEBP
	if (
		buf.length >= 12 &&
		buf.subarray(0).toString('ascii') === 'RIFF' &&
		buf.subarray(8, 12).toString('ascii') === 'WEBP'
	) {
		return 'webp';
	}

	// AVIF
	if (buf.includes(Buffer.from('ftypavif'))) {
		return 'avif';
	}

	return 'jpg';
}

function publicUrl(relPath: string): string {
	return `/jetframe.admin/${relPath}`;
}

function safeFileName(name: string): string {
	return String(name || 'unknown')
		.trim()
		.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function downloadImageBuffer(url: string, useReferer: boolean, redirects = 0): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		if (redirects > 5) {
			reject(new Error('Too many redirects during image download'));

			return;
		}

		const client = url.startsWith('https') ? https : http;

		const headers: Record<string, string> = {
			'User-Agent': 'Mozilla/5.0 AppleWebKit/605.1.15 Safari/604.1',

			Accept: 'image/avif,image/webp,image/apng,image/png,image/jpeg,image/*,*/*;q=0.8',
		};

		if (useReferer) {
			headers.Referer = 'https://www.flightradar24.com/';
		}

		const req = client.get(
			url,
			{
				headers,
				timeout: 20000,
			},
			res => {
				if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
					const nextUrl = res.headers.location.startsWith('http')
						? res.headers.location
						: new URL(res.headers.location, url).toString();

					downloadImageBuffer(nextUrl, useReferer, redirects + 1)
						.then(resolve)
						.catch(reject);

					return;
				}

				if (res.statusCode !== 200) {
					reject(new Error(`HTTP ${res.statusCode}`));

					return;
				}

				const chunks: Buffer[] = [];

				res.on('data', chunk => {
					chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
				});

				res.on('end', () => {
					const buffer = Buffer.concat(chunks);

					if (!buffer.length) {
						reject(new Error('Leeres Bild erhalten'));

						return;
					}

					const contentType = String(res.headers['content-type'] || '').toLowerCase();

					const text = buffer.toString('utf8').trim();

					if (!contentType.startsWith('image/') && /^https?:\/\//i.test(text)) {
						downloadImageBuffer(text, useReferer, redirects + 1)
							.then(resolve)
							.catch(reject);

						return;
					}

					if (!looksLikeImageBuffer(buffer)) {
						reject(new Error('Response is not an image'));

						return;
					}

					resolve(buffer);
				});
			},
		);

		req.on('timeout', () => {
			req.destroy(new Error('Image download timeout'));
		});

		req.on('error', reject);
	});
}

function errorText(e: unknown): string {
	if (!e) {
		return 'unknown error';
	}

	if (typeof e === 'string') {
		return e;
	}

	if (e instanceof Error) {
		return e.message;
	}

	try {
		return JSON.stringify(e);
	} catch {
		// Last-resort fallback for values JSON.stringify can't handle
		// (e.g. circular references). Object.prototype.toString.call()
		// is always type-safe, unlike a bare String(e) coercion.
		return Object.prototype.toString.call(e);
	}
}
