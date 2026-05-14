'use strict';
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
	for (var name in all) __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
	if ((from && typeof from === 'object') || typeof from === 'function') {
		for (let key of __getOwnPropNames(from))
			if (!__hasOwnProp.call(to, key) && key !== except)
				__defProp(to, key, {
					get: () => from[key],
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
				});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (
	(target = mod != null ? __create(__getProtoOf(mod)) : {}),
	__copyProps(
		// If the importer is in node compatibility mode or this is not an ESM
		// file that has been converted to a CommonJS file using a Babel-
		// compatible transform (i.e. "__esModule" has not been set), then set
		// "default" to the CommonJS "module.exports" for node compatibility.
		isNodeMode || !mod || !mod.__esModule ? __defProp(target, 'default', { value: mod, enumerable: true }) : target,
		mod,
	)
);
var __toCommonJS = mod => __copyProps(__defProp({}, '__esModule', { value: true }), mod);
var specialLiveries_exports = {};
__export(specialLiveries_exports, {
	parseSpecialLiveriesHtml: () => parseSpecialLiveriesHtml,
	updateSpecialLiveries: () => updateSpecialLiveries,
});
module.exports = __toCommonJS(specialLiveries_exports);
var https = __toESM(require('https'));
var http = __toESM(require('http'));
const SPECIAL_LIVERIES_URL = 'https://airportwebcams.net/special-liveries/';
async function updateSpecialLiveries(adapter, logDebug, logWarn) {
	try {
		logDebug == null ? void 0 : logDebug('Lade Special-Liveries Datenbank...', 1);
		const html = await downloadText(SPECIAL_LIVERIES_URL);
		logDebug == null ? void 0 : logDebug(`Special-Liveries HTML L\xE4nge: ${html.length}`, 1);
		const liveries = parseSpecialLiveriesHtml(html);
		logDebug == null ? void 0 : logDebug(`Special-Liveries parsed: ${liveries.length}`, 1);
		await adapter.setForeignStateAsync(`${adapter.namespace}.specialLiveries`, JSON.stringify(liveries), true);
		await adapter.setForeignStateAsync(
			`${adapter.namespace}.specialLiveriesLastUpdate`,
			/* @__PURE__ */ new Date().toISOString(),
			true,
		);
		logDebug == null ? void 0 : logDebug(`Special-Liveries DB aktualisiert: ${liveries.length} Eintr\xE4ge`, 1);
	} catch (e) {
		logWarn == null ? void 0 : logWarn(`Special-Liveries DB Fehler: ${errorText(e)}`);
	}
}
function parseSpecialLiveriesHtml(html) {
	const fromTable = parseFromHtmlTable(html);
	if (fromTable.length) {
		return uniqueAndSort(fromTable);
	}
	const text = htmlToText(html);
	return uniqueAndSort(parseFromPlainText(text));
}
function parseFromHtmlTable(html) {
	const rows = extractTableRows(html);
	const result = [];
	for (const row of rows) {
		const cells = extractTableCells(row);
		if (cells.length < 5) continue;
		const item = buildEntry(cells[0], cells[1], cells[2], cells[3], cells.slice(4).join(' '));
		if (item) result.push(item);
	}
	return result;
}
function parseFromPlainText(text) {
	const result = [];
	const startMarker = 'Country Airline Aircraft Type Registration Description';
	const start = text.indexOf(startMarker);
	if (start < 0) {
		return [];
	}
	const data = text.substring(start + startMarker.length);
	const regRe =
		/\b([A-Z0-9]{1,3}-[A-Z0-9]{3,5}|[A-Z]{1,2}\d{3,5}[A-Z]?|[A-Z]{2}-[A-Z0-9]{3}|N\d{1,5}[A-Z]{0,2}|JA\d{3,4}[A-Z]|B-\d{4}|C-[A-Z0-9]{4}|VH-[A-Z0-9]{3}|OE-[A-Z0-9]{3}|OO-[A-Z0-9]{3}|D-[A-Z0-9]{4})\b/g;
	let m;
	const hits = [];
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
		if (parts.length < 3) continue;
		const country = parts[0];
		const airline = parts.slice(1, -2).join(' ');
		const aircraft = parts.slice(-2).join(' ');
		const description = after.replace(/^[-–—: ]+/, '').trim();
		const item = buildEntry(country, airline, aircraft, hit.reg, description);
		if (item) result.push(item);
	}
	return result;
}
function buildEntry(countryRaw, airlineRaw, aircraftRaw, registrationRaw, descriptionRaw) {
	const country = clean(countryRaw);
	const airline = clean(airlineRaw);
	const aircraft = clean(aircraftRaw);
	const registration = cleanRegistration(registrationRaw);
	const description = clean(descriptionRaw);
	if (!isRegistration(registration)) return null;
	if (!airline || !description) return null;
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
function uniqueAndSort(items) {
	const unique = [];
	const seen = /* @__PURE__ */ new Set();
	for (const item of items) {
		if (seen.has(item.registration)) continue;
		seen.add(item.registration);
		unique.push(item);
	}
	unique.sort((a, b) => a.registration.localeCompare(b.registration));
	return unique;
}
function extractTableRows(html) {
	const rows = [];
	const re = /<tr[\s\S]*?<\/tr>/gi;
	let m;
	while ((m = re.exec(html)) !== null) {
		rows.push(m[0]);
	}
	return rows;
}
function extractTableCells(row) {
	const cells = [];
	const re = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
	let m;
	while ((m = re.exec(row)) !== null) {
		cells.push(htmlToText(m[1]));
	}
	return cells;
}
function htmlToText(html) {
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
function decodeHtml(s) {
	return String(s || '')
		.replace(/&amp;/g, '&')
		.replace(/&nbsp;/g, ' ')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&uuml;/g, '\xFC')
		.replace(/&ouml;/g, '\xF6')
		.replace(/&auml;/g, '\xE4')
		.replace(/&Uuml;/g, '\xDC')
		.replace(/&Ouml;/g, '\xD6')
		.replace(/&Auml;/g, '\xC4')
		.replace(/&szlig;/g, '\xDF');
}
function clean(v) {
	return String(v || '')
		.replace(/\s+/g, ' ')
		.trim();
}
function cleanRegistration(v) {
	return clean(v)
		.toUpperCase()
		.replace(/[^A-Z0-9-]/g, '');
}
function isRegistration(v) {
	if (!v) return false;
	if (v.length < 4 || v.length > 8) return false;
	if (!/[A-Z]/.test(v)) return false;
	if (!/[0-9A-Z]/.test(v)) return false;
	return true;
}
function guessTitle(description) {
	const d = clean(description);
	return d
		.replace(/\s+Livery$/i, '')
		.replace(/\s+Special Livery$/i, '')
		.trim();
}
function guessType(description) {
	const d = description.toLowerCase();
	if (d.includes('star alliance')) return 'Alliance Livery';
	if (d.includes('oneworld')) return 'Alliance Livery';
	if (d.includes('skyteam')) return 'Alliance Livery';
	if (d.includes('retro')) return 'Retro Livery';
	if (d.includes('football') || d.includes('fanhansa') || d.includes('real madrid')) return 'Sports Livery';
	if (d.includes('pokemon') || d.includes('pikachu')) return 'Pokemon Livery';
	if (d.includes('star wars')) return 'Movie Livery';
	if (d.includes('anniversary') || d.includes('years') || d.includes('100')) return 'Anniversary Livery';
	if (d.includes('disney')) return 'Disney Livery';
	if (d.includes('sustainable') || d.includes('green')) return 'Eco Livery';
	return 'Special Livery';
}
function guessEmoji(description) {
	const d = description.toLowerCase();
	if (d.includes('star alliance') || d.includes('oneworld') || d.includes('skyteam')) return '\u2B50';
	if (d.includes('retro')) return '\u{1F3A8}';
	if (d.includes('football') || d.includes('fanhansa') || d.includes('real madrid')) return '\u26BD';
	if (d.includes('pokemon') || d.includes('pikachu')) return '\u26A1';
	if (d.includes('star wars')) return '\u{1F916}';
	if (d.includes('anniversary') || d.includes('years') || d.includes('100')) return '\u{1F389}';
	if (d.includes('disney')) return '\u{1F3F0}';
	if (d.includes('sustainable') || d.includes('green')) return '\u{1F331}';
	if (d.includes('tintin')) return '\u{1F680}';
	if (d.includes('retro')) return '\u{1F6E9}\uFE0F';
	return '\u{1F3A8}';
}
function downloadText(url, redirects = 0) {
	return new Promise((resolve, reject) => {
		const client = url.startsWith('https') ? https : http;
		const req = client.get(
			url,
			{
				timeout: 25e3,
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
function errorText(e) {
	if (!e) return 'unbekannter Fehler';
	if (typeof e === 'string') return e;
	if (e instanceof Error) return e.message;
	try {
		return JSON.stringify(e);
	} catch {
		return String(e);
	}
}
// Annotate the CommonJS export names for ESM import in node:
0 &&
	(module.exports = {
		parseSpecialLiveriesHtml,
		updateSpecialLiveries,
	});
//# sourceMappingURL=specialLiveries.js.map
