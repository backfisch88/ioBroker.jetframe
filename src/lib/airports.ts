import type { AdapterLike } from './types';
import * as https from 'node:https';
import { loadGermanIataNames } from './airportNamesDe';

/**
 *
 */
export interface AirportEntry {
	/**
	 *
	 */
	iata: string;
	/**
	 *
	 */
	ident: string;
	/**
	 *
	 */
	icao: string;
	/**
	 *
	 */
	name: string;
	/**
	 *
	 */
	city: string;
	/**
	 *
	 */
	city_DE?: string;

	/**
	 *
	 */
	country: string;
	/**
	 *
	 */
	flag: string;
	/**
	 *
	 */
	flagEmoji: string;

	/**
	 *
	 */
	lat: number;
	/**
	 *
	 */
	lon: number;

	/**
	 *
	 */
	type: string;
	/**
	 *
	 */
	scheduled: boolean;
	/**
	 *
	 */
	runways?: RunwayEntry[];
}

export interface RunwayEntry {
	airportIdent: string;
	lengthFt: number;
	widthFt: number;
	surface: string;
	lighted: boolean;
	leIdent: string;
	leHeadingDeg: number | null;
	heIdent: string;
	heHeadingDeg: number | null;
}

const AIRPORTS_URL = 'https://ourairports.com/data/airports.csv';
const RUNWAYS_URL = 'https://ourairports.com/data/runways.csv';

function countryFlagEmoji(countryCode: string): string {
	if (!countryCode || countryCode.length !== 2) {
		return '';
	}

	return countryCode.toUpperCase().replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

/**
 *
 */
export async function updateAirportJson(
	adapter: AdapterLike,
	logDebug?: (msg: string, level?: number) => void,
	logWarn?: (msg: string) => void,
): Promise<void> {
	try {
		logDebug?.('Loading airport database...', 1);

		const csv = await downloadCsv(AIRPORTS_URL, 0, 'iata_code');
		const runwayCsv = await downloadCsv(RUNWAYS_URL, 0, 'airport_ident');

		const runwaysByIdent = parseRunwayCsv(runwayCsv);

		let airports = parseAirportCsv(csv).map(a => ({
			...a,
			runways: runwaysByIdent[a.ident] || [],
		}));

		logDebug?.(`Airport DB parsed: ${airports.length} airports`, 1);
		logDebug?.(`Runways parsed: ${Object.keys(runwaysByIdent).length} airports with runways`, 1);

		try {
			const deNames = await getGermanIataNamesCached(adapter, logDebug);

			airports = airports.map(a => ({
				...a,
				city_DE: deNames[a.iata] || '',
			}));

			logDebug?.(`Airport DB DE names added: ${Object.keys(deNames).length}`, 1);
		} catch (e: any) {
			logWarn?.(`Airport DB DE names error: ${e?.message || e}`);
		}

		await adapter.setForeignStateAsync(`${adapter.namespace}.airportjson`, JSON.stringify(airports), true);

		await adapter.setForeignStateAsync(
			`${adapter.namespace}.airportjsonLastUpdate`,
			new Date().toISOString(),
			true,
		);

		logDebug?.('Airport database updated', 1);
	} catch (e: any) {
		logWarn?.(`Airport DB error: ${e?.message || e}`);
	}
}

async function getGermanIataNamesCached(
	adapter: AdapterLike,
	logDebug?: (msg: string, level?: number) => void,
): Promise<Record<string, string>> {
	try {
		const st = await adapter.getForeignStateAsync(`${adapter.namespace}.airportjson`);

		const raw = st?.val ? String(st.val) : '';

		if (raw && raw !== '[]') {
			const airports = JSON.parse(raw);

			if (Array.isArray(airports)) {
				const cached: Record<string, string> = {};

				for (const a of airports) {
					const iata = String(a.iata || a.IATA || '')
						.trim()
						.toUpperCase();

					const cityDe = String(a.city_DE || '').trim();

					if (iata && cityDe) {
						cached[iata] = cityDe;
					}
				}

				if (Object.keys(cached).length > 100) {
					logDebug?.(`Airport DB DE names loaded from cache: ${Object.keys(cached).length}`, 1);

					return cached;
				}
			}
		}
	} catch {
		// fallback
	}

	return loadGermanIataNames(logDebug);
}

export function parseAirportCsv(csv: string): AirportEntry[] {
	const lines = csv
		.split('\n')
		.map(l => l.trim())
		.filter(Boolean);

	if (lines.length < 2) {
		return [];
	}

	const headers = parseCsvLine(lines[0]);

	const idx = (name: string): number => headers.indexOf(name);

	const result: AirportEntry[] = [];

	for (let i = 1; i < lines.length; i++) {
		try {
			const row = parseCsvLine(lines[i]);

			const iata = String(row[idx('iata_code')] || '')
				.trim()
				.toUpperCase();

			if (!iata || iata.length !== 3) {
				continue;
			}

			const type = String(row[idx('type')] || '');

			if (type === 'closed') {
				continue;
			}

			const lat = Number(row[idx('latitude_deg')]);

			const lon = Number(row[idx('longitude_deg')]);

			if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
				continue;
			}

			const country = String(row[idx('iso_country')] || '')
				.trim()
				.toUpperCase();

			const ident = String(row[idx('ident')] || '')
				.trim()
				.toUpperCase();

			result.push({
				iata,

				ident,

				icao: String(row[idx('icao_code')] || row[idx('gps_code')] || ident || '')
					.trim()
					.toUpperCase(),

				name: String(row[idx('name')] || '').trim(),

				city: String(row[idx('municipality')] || '').trim(),

				country,

				flag: country,

				flagEmoji: countryFlagEmoji(country),

				lat,
				lon,

				type,

				scheduled:
					String(row[idx('scheduled_service')] || '')
						.trim()
						.toLowerCase() === 'yes',
			});
		} catch {
			// ignore broken row
		}
	}

	result.sort((a, b) => {
		return a.iata.localeCompare(b.iata);
	});

	return result;
}

function parseRunwayCsv(csv: string): Record<string, RunwayEntry[]> {
	const lines = csv
		.split('\n')
		.map(l => l.trim())
		.filter(Boolean);

	if (lines.length < 2) {
		return {};
	}

	const headers = parseCsvLine(lines[0]);
	const idx = (name: string): number => headers.indexOf(name);

	const result: Record<string, RunwayEntry[]> = {};

	for (let i = 1; i < lines.length; i++) {
		try {
			const row = parseCsvLine(lines[i]);

			const airportIdent = String(row[idx('airport_ident')] || '')
				.trim()
				.toUpperCase();

			if (!airportIdent) {
				continue;
			}

			if (String(row[idx('closed')] || '').trim() === '1') {
				continue;
			}

			const leIdent = String(row[idx('le_ident')] || '')
				.trim()
				.toUpperCase();

			const heIdent = String(row[idx('he_ident')] || '')
				.trim()
				.toUpperCase();

			const leHeadingDegRaw = Number(row[idx('le_heading_degT')]);
			const heHeadingDegRaw = Number(row[idx('he_heading_degT')]);

			if (!leIdent && !heIdent) {
				continue;
			}

			const runway: RunwayEntry = {
				airportIdent,
				lengthFt: Number(row[idx('length_ft')]) || 0,
				widthFt: Number(row[idx('width_ft')]) || 0,
				surface: String(row[idx('surface')] || '').trim(),
				lighted: String(row[idx('lighted')] || '').trim() === '1',
				leIdent,
				leHeadingDeg: Number.isFinite(leHeadingDegRaw) ? Math.round(leHeadingDegRaw) : null,
				heIdent,
				heHeadingDeg: Number.isFinite(heHeadingDegRaw) ? Math.round(heHeadingDegRaw) : null,
			};

			if (!result[airportIdent]) {
				result[airportIdent] = [];
			}

			result[airportIdent].push(runway);
		} catch {
			// ignore broken runway row
		}
	}

	for (const ident of Object.keys(result)) {
		result[ident].sort((a, b) => Number(b.lengthFt || 0) - Number(a.lengthFt || 0));
	}

	return result;
}

function parseCsvLine(line: string): string[] {
	const result: string[] = [];

	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const c = line[i];

		if (c === '"') {
			if (inQuotes && line[i + 1] === '"') {
				current += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}

			continue;
		}

		if (c === ',' && !inQuotes) {
			result.push(current);
			current = '';
			continue;
		}

		current += c;
	}

	result.push(current);

	return result;
}

function downloadCsv(url: string, redirects = 0, expectedHeader = 'iata_code'): Promise<string> {
	return new Promise((resolve, reject) => {
		const req = https.get(
			url,
			{
				timeout: 20000,
				headers: {
					'User-Agent': 'Mozilla/5.0 JetFrame',
					Accept: 'text/csv,text/plain,*/*',
				},
			},
			res => {
				if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
					if (redirects >= 5) {
						reject(new Error('Too many redirects during airport CSV download'));
						return;
					}

					const nextUrl = res.headers.location.startsWith('http')
						? res.headers.location
						: new URL(res.headers.location, url).toString();

					resolve(downloadCsv(nextUrl, redirects + 1, expectedHeader));
					return;
				}

				if (res.statusCode && res.statusCode >= 400) {
					reject(new Error(`HTTP ${res.statusCode} during airport CSV download`));
					return;
				}

				let body = '';
				res.setEncoding('utf8');

				res.on('data', chunk => {
					body += chunk;
				});

				res.on('end', () => {
					const text = String(body || '').trim();

					if (!text) {
						return reject(new Error('Airport CSV is empty'));
					}
					if (text.startsWith('<')) {
						return reject(new Error('Airport CSV download returned HTML instead of CSV'));
					}
					if (expectedHeader && !text.includes(expectedHeader)) {
						return reject(new Error(`CSV looks invalid: header ${expectedHeader} is missing`));
					}

					resolve(text);
				});
			},
		);

		req.on('timeout', () => {
			req.destroy(new Error('Airport CSV download timeout'));
		});

		req.on('error', reject);
	});
}
