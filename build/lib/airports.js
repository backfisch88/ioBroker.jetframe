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
var airports_exports = {};
__export(airports_exports, {
	parseAirportCsv: () => parseAirportCsv,
	updateAirportJson: () => updateAirportJson,
});
module.exports = __toCommonJS(airports_exports);
var https = __toESM(require('https'));
var import_airportNamesDe = require('./airportNamesDe');
const AIRPORTS_URL = 'https://ourairports.com/data/airports.csv';
const IATA_WIKI_DE_BASE = 'https://de.wikipedia.org/wiki/Liste_der_IATA-Codes/';
function countryFlagEmoji(countryCode) {
	if (!countryCode || countryCode.length !== 2) {
		return '';
	}
	return countryCode.toUpperCase().replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0)));
}
async function updateAirportJson(adapter, logDebug, logWarn) {
	try {
		logDebug == null ? void 0 : logDebug('Lade Airport Datenbank...', 1);
		const csv = await downloadCsv(AIRPORTS_URL);
		let airports = parseAirportCsv(csv);
		logDebug == null ? void 0 : logDebug(`Airport DB parsed: ${airports.length} Airports`, 1);
		try {
			const deNames = await getGermanIataNamesCached(adapter, logDebug);
			airports = airports.map(a => ({
				...a,
				city_DE: deNames[a.iata] || '',
			}));
			logDebug == null ? void 0 : logDebug(`Airport DB DE-Namen erg\xE4nzt: ${Object.keys(deNames).length}`, 1);
		} catch (e) {
			logWarn == null ? void 0 : logWarn(`Airport DB DE-Namen Fehler: ${(e == null ? void 0 : e.message) || e}`);
		}
		await adapter.setForeignStateAsync(`${adapter.namespace}.airportjson`, JSON.stringify(airports), true);
		await adapter.setForeignStateAsync(
			`${adapter.namespace}.airportjsonLastUpdate`,
			/* @__PURE__ */ new Date().toISOString(),
			true,
		);
		logDebug == null ? void 0 : logDebug('Airport Datenbank aktualisiert', 1);
	} catch (e) {
		logWarn == null ? void 0 : logWarn(`Airport DB Fehler: ${(e == null ? void 0 : e.message) || e}`);
	}
}
async function getGermanIataNamesCached(adapter, logDebug) {
	try {
		const st = await adapter.getForeignStateAsync(`${adapter.namespace}.airportjson`);
		const raw = (st == null ? void 0 : st.val) ? String(st.val) : '';
		if (raw && raw !== '[]') {
			const airports = JSON.parse(raw);
			if (Array.isArray(airports)) {
				const cached = {};
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
					logDebug == null
						? void 0
						: logDebug(`Airport DB DE-Namen aus Cache \xFCbernommen: ${Object.keys(cached).length}`, 1);
					return cached;
				}
			}
		}
	} catch {}
	return (0, import_airportNamesDe.loadGermanIataNames)(logDebug);
}
function parseAirportCsv(csv) {
	const lines = csv
		.split('\n')
		.map(l => l.trim())
		.filter(Boolean);
	if (lines.length < 2) {
		return [];
	}
	const headers = parseCsvLine(lines[0]);
	const idx = name => headers.indexOf(name);
	const result = [];
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
		} catch {}
	}
	result.sort((a, b) => {
		return a.iata.localeCompare(b.iata);
	});
	return result;
}
function parseCsvLine(line) {
	const result = [];
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
function downloadCsv(url, redirects = 0) {
	return new Promise((resolve, reject) => {
		const req = https.get(
			url,
			{
				timeout: 2e4,
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
					if (!text) return reject(new Error('Airport CSV leer'));
					if (text.startsWith('<')) return reject(new Error('Airport CSV Download lieferte HTML statt CSV'));
					if (!text.includes('iata_code'))
						return reject(new Error('Airport CSV sieht ung\xFCltig aus: Header iata_code fehlt'));
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
// Annotate the CommonJS export names for ESM import in node:
0 &&
	(module.exports = {
		parseAirportCsv,
		updateAirportJson,
	});
//# sourceMappingURL=airports.js.map
