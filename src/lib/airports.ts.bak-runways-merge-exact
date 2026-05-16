import * as https from 'https';
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
}

const AIRPORTS_URL = 'https://ourairports.com/data/airports.csv';

const IATA_WIKI_DE_BASE = 'https://de.wikipedia.org/wiki/Liste_der_IATA-Codes/';

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
	adapter: any,
	logDebug?: (msg: string, level?: number) => void,
	logWarn?: (msg: string) => void,
): Promise<void> {
	try {
		logDebug?.('Lade Airport Datenbank...', 1);

		const csv = await downloadCsv(AIRPORTS_URL);

		let airports = parseAirportCsv(csv);

		logDebug?.(`Airport DB parsed: ${airports.length} Airports`, 1);

		try {
			const deNames = await getGermanIataNamesCached(adapter, logDebug);

			airports = airports.map(a => ({
				...a,
				city_DE: deNames[a.iata] || '',
			}));

			logDebug?.(`Airport DB DE-Namen ergänzt: ${Object.keys(deNames).length}`, 1);
		} catch (e: any) {
			logWarn?.(`Airport DB DE-Namen Fehler: ${e?.message || e}`);
		}

		await adapter.setForeignStateAsync(`${adapter.namespace}.airportjson`, JSON.stringify(airports), true);

		await adapter.setForeignStateAsync(
			`${adapter.namespace}.airportjsonLastUpdate`,
			new Date().toISOString(),
			true,
		);

		logDebug?.('Airport Datenbank aktualisiert', 1);
	} catch (e: any) {
		logWarn?.(`Airport DB Fehler: ${e?.message || e}`);
	}
}

async function getGermanIataNamesCached(
	adapter: any,
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
					logDebug?.(`Airport DB DE-Namen aus Cache übernommen: ${Object.keys(cached).length}`, 1);

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

			result.push({
				iata,

				icao: String(row[idx('icao_code')] || row[idx('gps_code')] || row[idx('ident')] || '')
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

function downloadCsv(url: string, redirects = 0): Promise<string> {
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
						reject(new Error('Zu viele Redirects beim Airport CSV Download'));
						return;
					}

					const nextUrl = res.headers.location.startsWith('http')
						? res.headers.location
						: new URL(res.headers.location, url).toString();

					resolve(downloadCsv(nextUrl, redirects + 1));
					return;
				}

				if (res.statusCode && res.statusCode >= 400) {
					reject(new Error(`HTTP ${res.statusCode} beim Airport CSV Download`));
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
						return reject(new Error('Airport CSV leer'));
					}
					if (text.startsWith('<')) {
						return reject(new Error('Airport CSV Download lieferte HTML statt CSV'));
					}
					if (!text.includes('iata_code')) {
						return reject(new Error('Airport CSV sieht ungültig aus: Header iata_code fehlt'));
					}

					resolve(text);
				});
			},
		);

		req.on('timeout', () => {
			req.destroy(new Error('Airport CSV Download Timeout'));
		});

		req.on('error', reject);
	});
}
