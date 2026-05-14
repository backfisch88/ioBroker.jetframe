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
var airportNamesDe_exports = {};
__export(airportNamesDe_exports, {
	loadGermanIataNames: () => loadGermanIataNames,
});
module.exports = __toCommonJS(airportNamesDe_exports);
var https = __toESM(require('https'));
const IATA_WIKI_DE_BASE = 'https://de.wikipedia.org/wiki/Liste_der_IATA-Codes/';
async function loadGermanIataNames(logDebug) {
	const result = {};
	const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
	for (const letter of letters) {
		try {
			const url = IATA_WIKI_DE_BASE + letter;
			logDebug == null ? void 0 : logDebug(`Lade IATA-DE Namen ${letter}...`, 2);
			const html = await downloadText(url);
			const parsed = parseGermanIataPage(html);
			for (const [iata, city] of Object.entries(parsed)) {
				if (!result[iata] && city) {
					result[iata] = city;
				}
			}
		} catch {}
	}
	return result;
}
function parseGermanIataPage(html) {
	const result = {};
	const rows = String(html || '').match(/<tr[\s\S]*?<\/tr>/gi) || [];
	for (const row of rows) {
		const cells = row.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || [];
		if (cells.length < 4) {
			continue;
		}
		const texts = cells.map(cleanWikiText).filter(Boolean);
		const iata = texts.find(t => /^[A-Z]{3}$/.test(t));
		if (!iata) {
			continue;
		}
		const city = normalizeGermanCity(texts[3] || '');
		if (city) {
			result[iata] = city;
		}
	}
	return result;
}
function cleanWikiText(html) {
	return decodeHtml(
		String(html || '')
			.replace(/<style[\s\S]*?<\/style>/gi, ' ')
			.replace(/<script[\s\S]*?<\/script>/gi, ' ')
			.replace(/<sup[\s\S]*?<\/sup>/gi, ' ')
			.replace(/<br\s*\/?>/gi, ' ')
			.replace(/<[^>]+>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim(),
	);
}
function normalizeGermanCity(value) {
	return String(value || '')
		.replace(/\s*\[[^\]]+\]/g, '')
		.replace(/\s+/g, ' ')
		.replace(/^–$/, '')
		.trim();
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
		.replace(/&Uuml;/g, '\xDC')
		.replace(/&ouml;/g, '\xF6')
		.replace(/&Ouml;/g, '\xD6')
		.replace(/&auml;/g, '\xE4')
		.replace(/&Auml;/g, '\xC4')
		.replace(/&szlig;/g, '\xDF');
}
function downloadText(url, redirects = 0) {
	return new Promise((resolve, reject) => {
		const req = https.get(
			url,
			{
				timeout: 2e4,
				headers: {
					'User-Agent': 'Mozilla/5.0 JetFrame',
					Accept: 'text/html,text/plain,*/*',
				},
			},
			res => {
				if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
					if (redirects >= 5) {
						reject(new Error('Zu viele Redirects'));
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
					resolve(String(body || '').trim());
				});
			},
		);
		req.on('timeout', () => {
			req.destroy(new Error('Download Timeout'));
		});
		req.on('error', reject);
	});
}
// Annotate the CommonJS export names for ESM import in node:
0 &&
	(module.exports = {
		loadGermanIataNames,
	});
//# sourceMappingURL=airportNamesDe.js.map
