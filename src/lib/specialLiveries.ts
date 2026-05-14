import * as https from 'https';
import * as http from 'http';

/**
 *
 */
export interface SpecialLiveryEntry {
	/**
	 *
	 */
	registration: string;
	/**
	 *
	 */
	country: string;
	/**
	 *
	 */
	airline: string;
	/**
	 *
	 */
	aircraft: string;
	/**
	 *
	 */
	type: string;
	/**
	 *
	 */
	title: string;
	/**
	 *
	 */
	description: string;
	/**
	 *
	 */
	emoji: string;
	/**
	 *
	 */
	source: string;
}

const SPECIAL_LIVERIES_URL = 'https://airportwebcams.net/special-liveries/';

/**
 *
 */
export async function updateSpecialLiveries(
	adapter: any,
	logDebug?: (msg: string, level?: number) => void,
	logWarn?: (msg: string) => void,
): Promise<void> {
	try {
		logDebug?.('Lade Special-Liveries Datenbank...', 1);

		const html = await downloadText(SPECIAL_LIVERIES_URL);
		logDebug?.(`Special-Liveries HTML Länge: ${html.length}`, 1);

		const liveries = parseSpecialLiveriesHtml(html);
		logDebug?.(`Special-Liveries parsed: ${liveries.length}`, 1);

		await adapter.setForeignStateAsync(`${adapter.namespace}.specialLiveries`, JSON.stringify(liveries), true);

		await adapter.setForeignStateAsync(
			`${adapter.namespace}.specialLiveriesLastUpdate`,
			new Date().toISOString(),
			true,
		);

		logDebug?.(`Special-Liveries DB aktualisiert: ${liveries.length} Einträge`, 1);
	} catch (e) {
		logWarn?.(`Special-Liveries DB Fehler: ${errorText(e)}`);
	}
}

/**
 *
 */
export function parseSpecialLiveriesHtml(html: string): SpecialLiveryEntry[] {
	const fromTable = parseFromHtmlTable(html);

	if (fromTable.length) {
		return uniqueAndSort(fromTable);
	}

	const text = htmlToText(html);

	return uniqueAndSort(parseFromPlainText(text));
}

function parseFromHtmlTable(html: string): SpecialLiveryEntry[] {
	const rows = extractTableRows(html);
	const result: SpecialLiveryEntry[] = [];

	for (const row of rows) {
		const cells = extractTableCells(row);

		if (cells.length < 5) {
			continue;
		}

		const item = buildEntry(cells[0], cells[1], cells[2], cells[3], cells.slice(4).join(' '));

		if (item) {
			result.push(item);
		}
	}

	return result;
}

function parseFromPlainText(text: string): SpecialLiveryEntry[] {
	const result: SpecialLiveryEntry[] = [];

	const startMarker = 'Country Airline Aircraft Type Registration Description';
	const start = text.indexOf(startMarker);

	if (start < 0) {
		return [];
	}

	const data = text.substring(start + startMarker.length);

	const regRe =
		/\b([A-Z0-9]{1,3}-[A-Z0-9]{3,5}|[A-Z]{1,2}\d{3,5}[A-Z]?|[A-Z]{2}-[A-Z0-9]{3}|N\d{1,5}[A-Z]{0,2}|JA\d{3,4}[A-Z]|B-\d{4}|C-[A-Z0-9]{4}|VH-[A-Z0-9]{3}|OE-[A-Z0-9]{3}|OO-[A-Z0-9]{3}|D-[A-Z0-9]{4})\b/g;

	let m: RegExpExecArray | null;
	const hits: Array<{ reg: string; index: number }> = [];

	while ((m = regRe.exec(data)) !== null) {
		hits.push({
			reg: cleanRegistration(m[1]),
			index: m.index,
		});
	}

	for (let i = 0; i < hits.length; i++) {
		const hit = hits[i];
		const next = hits[i + 1];

		const beforeStart = Math.max(0, hit.index - 140);
		const afterEnd = next ? next.index : Math.min(data.length, hit.index + 180);

		const before = clean(data.substring(beforeStart, hit.index));
		const after = clean(data.substring(hit.index + hit.reg.length, afterEnd));

		const parts = before.split(' ');

		if (parts.length < 3) {
			continue;
		}

		const country = parts[0];
		const airline = parts.slice(1, -2).join(' ');
		const aircraft = parts.slice(-2).join(' ');

		const description = after.replace(/^[-–—: ]+/, '').trim();

		const item = buildEntry(country, airline, aircraft, hit.reg, description);

		if (item) {
			result.push(item);
		}
	}

	return result;
}

function buildEntry(
	countryRaw: unknown,
	airlineRaw: unknown,
	aircraftRaw: unknown,
	registrationRaw: unknown,
	descriptionRaw: unknown,
): SpecialLiveryEntry | null {
	const country = clean(countryRaw);
	const airline = clean(airlineRaw);
	const aircraft = clean(aircraftRaw);
	const registration = cleanRegistration(registrationRaw);
	const description = clean(descriptionRaw);

	if (!isRegistration(registration)) {
		return null;
	}
	if (!airline || !description) {
		return null;
	}

	return {
		registration,
		country,
		airline,
		aircraft,
		type: guessType(description),
		title: guessTitle(description),
		description,
		emoji: guessEmoji(description),
		source: 'airportwebcams',
	};
}

function uniqueAndSort(items: SpecialLiveryEntry[]): SpecialLiveryEntry[] {
	const unique: SpecialLiveryEntry[] = [];
	const seen = new Set<string>();

	for (const item of items) {
		if (seen.has(item.registration)) {
			continue;
		}

		seen.add(item.registration);
		unique.push(item);
	}

	unique.sort((a, b) => a.registration.localeCompare(b.registration));

	return unique;
}

function extractTableRows(html: string): string[] {
	const rows: string[] = [];
	const re = /<tr[\s\S]*?<\/tr>/gi;

	let m: RegExpExecArray | null;

	while ((m = re.exec(html)) !== null) {
		rows.push(m[0]);
	}

	return rows;
}

function extractTableCells(row: string): string[] {
	const cells: string[] = [];
	const re = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;

	let m: RegExpExecArray | null;

	while ((m = re.exec(row)) !== null) {
		cells.push(htmlToText(m[1]));
	}

	return cells;
}

function htmlToText(html: string): string {
	return decodeHtml(
		String(html || '')
			.replace(/<script[\s\S]*?<\/script>/gi, ' ')
			.replace(/<style[\s\S]*?<\/style>/gi, ' ')
			.replace(/<br\s*\/?>/gi, ' ')
			.replace(/<[^>]+>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim(),
	);
}

function decodeHtml(s: string): string {
	return String(s || '')
		.replace(/&amp;/g, '&')
		.replace(/&nbsp;/g, ' ')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&uuml;/g, 'ü')
		.replace(/&ouml;/g, 'ö')
		.replace(/&auml;/g, 'ä')
		.replace(/&Uuml;/g, 'Ü')
		.replace(/&Ouml;/g, 'Ö')
		.replace(/&Auml;/g, 'Ä')
		.replace(/&szlig;/g, 'ß');
}

function clean(v: unknown): string {
	return String(v || '')
		.replace(/\s+/g, ' ')
		.trim();
}

function cleanRegistration(v: unknown): string {
	return clean(v)
		.toUpperCase()
		.replace(/[^A-Z0-9-]/g, '');
}

function isRegistration(v: string): boolean {
	if (!v) {
		return false;
	}
	if (v.length < 4 || v.length > 8) {
		return false;
	}
	if (!/[A-Z]/.test(v)) {
		return false;
	}
	if (!/[0-9A-Z]/.test(v)) {
		return false;
	}

	return true;
}

function guessTitle(description: string): string {
	const d = clean(description);

	return d
		.replace(/\s+Livery$/i, '')
		.replace(/\s+Special Livery$/i, '')
		.trim();
}

function guessType(description: string): string {
	const d = description.toLowerCase();

	if (d.includes('star alliance')) {
		return 'Alliance Livery';
	}
	if (d.includes('oneworld')) {
		return 'Alliance Livery';
	}
	if (d.includes('skyteam')) {
		return 'Alliance Livery';
	}
	if (d.includes('retro')) {
		return 'Retro Livery';
	}
	if (d.includes('football') || d.includes('fanhansa') || d.includes('real madrid')) {
		return 'Sports Livery';
	}
	if (d.includes('pokemon') || d.includes('pikachu')) {
		return 'Pokemon Livery';
	}
	if (d.includes('star wars')) {
		return 'Movie Livery';
	}
	if (d.includes('anniversary') || d.includes('years') || d.includes('100')) {
		return 'Anniversary Livery';
	}
	if (d.includes('disney')) {
		return 'Disney Livery';
	}
	if (d.includes('sustainable') || d.includes('green')) {
		return 'Eco Livery';
	}

	return 'Special Livery';
}

function guessEmoji(description: string): string {
	const d = description.toLowerCase();

	if (d.includes('star alliance') || d.includes('oneworld') || d.includes('skyteam')) {
		return '⭐';
	}
	if (d.includes('retro')) {
		return '🎨';
	}
	if (d.includes('football') || d.includes('fanhansa') || d.includes('real madrid')) {
		return '⚽';
	}
	if (d.includes('pokemon') || d.includes('pikachu')) {
		return '⚡';
	}
	if (d.includes('star wars')) {
		return '🤖';
	}
	if (d.includes('anniversary') || d.includes('years') || d.includes('100')) {
		return '🎉';
	}
	if (d.includes('disney')) {
		return '🏰';
	}
	if (d.includes('sustainable') || d.includes('green')) {
		return '🌱';
	}
	if (d.includes('tintin')) {
		return '🚀';
	}
	if (d.includes('retro')) {
		return '🛩️';
	}

	return '🎨';
}

function downloadText(url: string, redirects = 0): Promise<string> {
	return new Promise((resolve, reject) => {
		const client = url.startsWith('https') ? https : http;

		const req = client.get(
			url,
			{
				timeout: 25000,
				headers: {
					'User-Agent': 'Mozilla/5.0 JetFrame',
					Accept: 'text/html,application/xhtml+xml,text/plain,*/*',
				},
			},
			res => {
				if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
					if (redirects >= 5) {
						reject(new Error('Zu viele Redirects bei Special-Liveries'));
						return;
					}

					const nextUrl = res.headers.location.startsWith('http')
						? res.headers.location
						: new URL(res.headers.location, url).toString();

					resolve(downloadText(nextUrl, redirects + 1));
					return;
				}

				if (res.statusCode && res.statusCode >= 400) {
					reject(new Error(`HTTP ${res.statusCode}`));
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
						reject(new Error('Special-Liveries HTML leer'));
						return;
					}

					resolve(text);
				});
			},
		);

		req.on('timeout', () => {
			req.destroy(new Error('Special-Liveries Download Timeout'));
		});

		req.on('error', reject);
	});
}

function errorText(e: unknown): string {
	if (!e) {
		return 'unbekannter Fehler';
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
		return String(e);
	}
}
