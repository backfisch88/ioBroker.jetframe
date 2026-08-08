import type { AdapterLike } from './types';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';
import { applyWebTranslations, type WebLang } from './webI18n';

// Static files served to the browser. Only these exact files are ever
// served - nothing else on disk is reachable through this server.
const STATIC_FILES: Record<string, { file: string; contentType: string }> = {
	'/': { file: 'index.html', contentType: 'text/html; charset=utf-8' },
	'/index.html': { file: 'index.html', contentType: 'text/html; charset=utf-8' },
	'/frame.html': { file: 'frame.html', contentType: 'text/html; charset=utf-8' },
	'/heatmap.html': { file: 'heatmap.html', contentType: 'text/html; charset=utf-8' },
	'/stats.html': { file: 'stats.html', contentType: 'text/html; charset=utf-8' },
	'/jetframe.css': { file: 'jetframe.css', contentType: 'text/css; charset=utf-8' },
	'/jetframe.png': { file: 'jetframe.png', contentType: 'image/png' },
	'/SF-Pro.ttf': { file: 'SF-Pro.ttf', contentType: 'font/ttf' },
	'/manifest.webmanifest': { file: 'manifest.webmanifest', contentType: 'application/manifest+json' },
};

// Only states directly under the adapter's own namespace can ever be read,
// and only these specific suffixes can ever be written - this is a
// narrower, safer surface than a generic "write any state" API.
const WRITABLE_STATE_SUFFIXES = ['.enabled', '.speechEnabled', '.clearImageCache'];

function sendText(
	res: http.ServerResponse,
	status: number,
	body: string,
	contentType = 'text/plain; charset=utf-8',
): void {
	res.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
	res.end(body);
}

/**
 * Starts JetFrame's own built-in HTTP server for the user-facing web UI.
 * This makes the adapter fully self-contained: no external Simple-API (or
 * any other) adapter is required for the visualization to work.
 */
export function startWebServer(adapter: AdapterLike, config: JetFrameWebConfig): http.Server {
	const staticDir = path.resolve(__dirname, '../../admin');

	const server = http.createServer((req, res) => {
		void handleRequest(adapter, config, staticDir, req, res).catch(e => {
			adapter.log.warn(`[JetFrame] Web server request error: ${e instanceof Error ? e.message : String(e)}`);
			try {
				sendText(res, 500, 'Internal error');
			} catch {
				// response may already be closed
			}
		});
	});

	server.on('error', e => {
		adapter.log.error(
			`[JetFrame] Web server could not be started on port ${config.webPort}: ${e instanceof Error ? e.message : String(e)}`,
		);
	});

	server.listen(config.webPort, () => {
		adapter.log.info(`[JetFrame] Web server listening on port ${config.webPort}`);
	});

	return server;
}

export interface JetFrameWebConfig {
	dpRoot: string;
	webPort: number;
	visualSource: 'current' | 'airport' | 'overflight';
	webLang: WebLang;
}

async function handleRequest(
	adapter: AdapterLike,
	config: JetFrameWebConfig,
	staticDir: string,
	req: http.IncomingMessage,
	res: http.ServerResponse,
): Promise<void> {
	const url = new URL(req.url || '/', 'http://localhost');
	const pathname = decodeURIComponent(url.pathname);

	if (pathname === '/config') {
		res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
		res.end(JSON.stringify({ dpRoot: config.dpRoot, visualSource: config.visualSource }));
		return;
	}

	if (pathname.startsWith('/state/')) {
		await handleStateRequest(adapter, config, pathname.slice('/state/'.length), url, req, res);
		return;
	}

	const staticEntry = STATIC_FILES[pathname];

	if (staticEntry) {
		serveStaticFile(adapter, staticDir, staticEntry, config.webLang, res);
		return;
	}

	if (pathname.startsWith('/img/')) {
		await serveCachedFile(adapter, pathname.slice(1), res);
		return;
	}

	sendText(res, 404, 'Not found');
}

/**
 * Serves images/logos that were cached at runtime into ioBroker's own file
 * storage (jetframe.admin namespace) by images.ts - these are not part of
 * the on-disk admin/ folder, so they need a separate read path.
 */
async function serveCachedFile(adapter: AdapterLike, relPath: string, res: http.ServerResponse): Promise<void> {
	try {
		const result = await adapter.readFileAsync('jetframe.admin', relPath);
		const buffer = Buffer.isBuffer(result)
			? result
			: Buffer.isBuffer(result?.file)
				? result.file
				: Buffer.from(result?.file ?? result);
		const contentType =
			result?.mimeType ||
			(relPath.endsWith('.png') ? 'image/png' : relPath.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg');

		res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
		res.end(buffer);
	} catch {
		sendText(res, 404, 'Not found');
	}
}

function serveStaticFile(
	adapter: AdapterLike,
	staticDir: string,
	entry: { file: string; contentType: string },
	webLang: WebLang,
	res: http.ServerResponse,
): void {
	const filePath = path.join(staticDir, entry.file);

	fs.readFile(filePath, (err, data) => {
		if (err) {
			adapter.log.warn(`[JetFrame] Web server could not read static file ${entry.file}: ${err.message}`);
			sendText(res, 404, 'Not found');
			return;
		}

		res.writeHead(200, { 'Content-Type': entry.contentType, 'Cache-Control': 'no-store' });

		if (entry.file.endsWith('.html')) {
			res.end(applyWebTranslations(data.toString('utf8'), webLang));
		} else {
			res.end(data);
		}
	});
}

async function handleStateRequest(
	adapter: AdapterLike,
	config: JetFrameWebConfig,
	rawId: string,
	url: URL,
	req: http.IncomingMessage,
	res: http.ServerResponse,
): Promise<void> {
	const id = rawId.replace(/\/+$/, '');

	// Only states within this adapter instance's own namespace are ever
	// reachable through this endpoint.
	if (!id.startsWith(`${config.dpRoot}.`) && id !== config.dpRoot) {
		sendText(res, 403, 'Forbidden');
		return;
	}

	if (req.method === 'GET') {
		const state = await adapter.getForeignStateAsync(id);
		sendText(res, 200, state && state.val !== null && state.val !== undefined ? String(state.val) : '');
		return;
	}

	if (req.method === 'POST') {
		const isWritable = WRITABLE_STATE_SUFFIXES.some(suffix => id.endsWith(suffix));

		if (!isWritable) {
			sendText(res, 403, 'Forbidden');
			return;
		}

		const rawValue = url.searchParams.get('value') ?? (await readRequestBodyValue(req));
		const value = coerceStateValue(rawValue);

		await adapter.setForeignStateAsync(id, value, false);
		sendText(res, 200, 'OK');
		return;
	}

	sendText(res, 405, 'Method not allowed');
}

function coerceStateValue(raw: string | null): ioBroker.StateValue {
	if (raw === null) {
		return '';
	}
	if (raw === 'true') {
		return true;
	}
	if (raw === 'false') {
		return false;
	}
	if (raw !== '' && !Number.isNaN(Number(raw))) {
		return Number(raw);
	}
	return raw;
}

function readRequestBodyValue(req: http.IncomingMessage): Promise<string | null> {
	return new Promise(resolve => {
		let body = '';

		req.on('data', chunk => {
			body += chunk;
		});

		req.on('end', () => {
			const params = new URLSearchParams(body);
			resolve(params.get('value'));
		});

		req.on('error', () => resolve(null));
	});
}
