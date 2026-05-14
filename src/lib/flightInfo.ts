import type { Aircraft, JetFrameConfig } from './types';

export type HttpJson = (url: string) => Promise<any>;
export type HttpText = (url: string) => Promise<string>;

const flighteraPlaneRouteCache: Record<string, CacheEntry<any>> = {};
const fr24LiveRouteCache: Record<string, CacheEntry<any>> = {};
const fr24AircraftCache: Record<string, CacheEntry<any>> = {};
const adsbdbCallsignCache: Record<string, CacheEntry<any>> = {};
const hexdbRouteCache: Record<string, CacheEntry<any>> = {};

const CACHE = {
	flighteraMs: 12 * 60 * 60 * 1000,
	fr24LiveMs: 60 * 60 * 1000,
	fr24Ms: 24 * 60 * 60 * 1000,
	adsbdbMs: 12 * 60 * 60 * 1000,
	hexdbRouteMs: 6 * 60 * 60 * 1000,
};

interface CacheEntry<T> {
	ts: number;
	data?: T | null;
	imageUrl?: string;
}

/**
 *
 */
export async function enrichFlightInfo(
	adapter: any,
	config: JetFrameConfig,
	a: Aircraft,
	httpJson: HttpJson,
	httpText: HttpText,
	logDebug: (msg: string, level?: number) => void,
	logWarn: (msg: string) => void,
): Promise<Aircraft> {
	if (!a.callsign) {
		return {
			...a,
			aircraftType: a.aircraftType || a.type || '',
			...buildSpecialInfo(a),
		};
	}

	try {
		const operationalCallsign = clean(a.callsign).toUpperCase();

		const operationalData = await loadAdsbdbByCallsign(operationalCallsign, httpJson, logDebug, logWarn);

		let parsed = parseAdsbdbResponse(operationalData, a, operationalCallsign, operationalCallsign);

		const regForRoute = parsed.registration || a.registration;

		let routeFound = false;

		const hexRoute = await resolveRouteViaHexDb(adapter, operationalCallsign, httpJson, logDebug, logWarn, config);

		const flighteraRoute = await resolveRouteViaFlighteraPlane(
			regForRoute,
			operationalCallsign,
			a.mode || '',
			httpText,
			logDebug,
			logWarn,
			config,
		);

		const mergedRoute = mergeHexAndFlighteraRoute(hexRoute, flighteraRoute);

		if (mergedRoute?.originIata && mergedRoute?.destIata) {
			parsed.routeCallsign =
				flighteraRoute?.routeCallsign || hexRoute?.routeCallsign || parsed.routeCallsign || operationalCallsign;

			parsed.originIata = mergedRoute.originIata;
			parsed.destIata = mergedRoute.destIata;
			parsed.routeReliable = true;

			if (
				hexRoute?.originIata &&
				hexRoute?.destIata &&
				flighteraRoute?.originIata &&
				flighteraRoute?.destIata &&
				(hexRoute.originIata !== flighteraRoute.originIata || hexRoute.destIata !== flighteraRoute.destIata)
			) {
				parsed.routeWarning = flighteraRoute?.isLive
					? 'Flightera Live bevorzugt, HexDB abweichend'
					: 'HexDB bevorzugt, Flightera abweichend';
				parsed.routeSource = flighteraRoute?.isLive
					? 'flightera-live-route-conflict-hexdb+airportjson'
					: 'hexdb-route-verified-conflict+airportjson';
			} else if (hexRoute?.originIata && hexRoute?.destIata) {
				parsed.routeWarning = flighteraRoute ? 'HexDB + Flightera geprüft' : 'HexDB Route';
				parsed.routeSource = flighteraRoute
					? 'hexdb-route+flightera-check+airportjson'
					: 'hexdb-route+airportjson';
			} else {
				parsed.routeWarning = flighteraRoute?.isLive ? 'Live-Flug erkannt' : '';
				parsed.routeSource = flighteraRoute?.isLive
					? 'flightera-plane-live-route+airportjson'
					: 'flightera-plane-callsign-route+airportjson';
			}

			parsed.routeText = `${parsed.originIata} → ${parsed.destIata}`;
			routeFound = true;
		}

		if (!routeFound) {
			const fr24Live = await resolveRouteViaFr24Live(
				operationalCallsign,
				a.mode || '',
				httpText,
				logDebug,
				logWarn,
				config,
			);

			if (fr24Live?.originIata && fr24Live?.destIata) {
				parsed.routeCallsign = fr24Live.routeCallsign || parsed.routeCallsign || operationalCallsign;

				parsed.originIata = fr24Live.originIata;
				parsed.destIata = fr24Live.destIata;
				parsed.routeReliable = true;
				parsed.routeWarning = 'FR24 Live-Fallback';
				parsed.routeSource = 'fr24-live-route+airportjson';
				parsed.routeText = `${parsed.originIata} → ${parsed.destIata}`;
				routeFound = true;
			}

			if (fr24Live?.imageUrl) {
				parsed.fr24ImageUrl = fr24Live.imageUrl;
			}
		}

		if (!routeFound) {
			const adsbdbRoute = parseAdsbdbRouteFallback(operationalData, a.mode || '', config);

			if (adsbdbRoute?.originIata && adsbdbRoute?.destIata) {
				parsed.routeCallsign = adsbdbRoute.routeCallsign || parsed.routeCallsign || operationalCallsign;

				parsed.originIata = adsbdbRoute.originIata;
				parsed.destIata = adsbdbRoute.destIata;
				parsed.routeReliable = true;
				parsed.routeWarning = 'ADSBDB Fallback';
				parsed.routeSource = 'adsbdb-route-fallback+airportjson';
				parsed.routeText = `${parsed.originIata} → ${parsed.destIata}`;
				routeFound = true;
			}
		}

		if (!routeFound) {
			parsed = makeUnknownAirportRoute(a.mode || '', parsed, config);
		}

		// Kein FR24-Bildabruf in flightInfo.
		// Bildlogik läuft zentral in images.ts:
		// Cache → HexDB → FR24-Fallback nur bei HexDB-Fehler.
		if (!parsed.fr24ImageUrl) {
			parsed.fr24ImageUrl = '';
		}

		parsed = await applyAirportNamesFromJson(adapter, config, parsed, logWarn);

		const jet = parsed.fr24ImageUrl ? { best: parsed.fr24ImageUrl } : { best: '' };

		const baseInfo: Partial<Aircraft> = {
			...parsed,

			operationalCallsign,

			jetphotosUrl: parsed.registration
				? `https://www.flightradar24.com/data/aircraft/${encodeURIComponent(
						String(parsed.registration).toLowerCase(),
					)}`
				: '',

			jetphotosImageUrl: jet.best || '',

			aircraftType: parsed.aircraftType || a.aircraftType || a.type || '',

			aircraftModel:
				parsed.aircraftModel || parsed.aircraftType || a.aircraftModel || a.aircraftType || a.type || '',
		};

		const specialInfo = buildSpecialInfo({
			...a,
			...baseInfo,
		});

		return {
			...a,
			...baseInfo,
			...specialInfo,
		};
	} catch (e) {
		logWarn(`FlightInfo Fehler: ${errorText(e)}`);

		return {
			...a,
			aircraftType: a.aircraftType || a.type || '',
			...buildSpecialInfo(a),
		};
	}
}

/************************************************************
 * ADSBDB
 ************************************************************/

async function loadAdsbdbByCallsign(
	callsign: string,
	httpJson: HttpJson,
	logDebug: (msg: string, level?: number) => void,
	logWarn: (msg: string) => void,
): Promise<any | null> {
	const cs = clean(callsign).toUpperCase();

	if (!cs || cs.length < 3) {
		logDebug('ADSBDB übersprungen: ungültiger Callsign');
		return null;
	}

	const now = Date.now();
	const cached = adsbdbCallsignCache[cs];

	if (cached && now - cached.ts < CACHE.adsbdbMs) {
		logDebug(`ADSBDB Cache hit: ${cs}`);
		return cached.data || null;
	}

	try {
		logDebug(`ADSBDB Anfrage EINMALIG: ${cs}`);

		const data = await httpJson(`https://api.adsbdb.com/v0/callsign/${encodeURIComponent(cs)}`);

		adsbdbCallsignCache[cs] = {
			ts: now,
			data: data || null,
		};

		return data || null;
	} catch (e) {
		adsbdbCallsignCache[cs] = {
			ts: now,
			data: null,
		};

		logWarn(`ADSBDB Fehler gecached für ${cs}: ${errorText(e)}`);
		return null;
	}
}

function parseAdsbdbResponse(data: any, a: Aircraft, operationalCallsign: string, routeCallsign: string): ParsedInfo {
	const response = data?.response || {};
	const route = response.flightroute || null;
	const aircraft = response.aircraft || null;

	const airlineName = route?.airline ? clean(route.airline.name) : guessAirlineName(operationalCallsign);

	const airlineIata = route?.airline ? clean(route.airline.iata) : guessAirlineIata(operationalCallsign);

	const airlineIcao = route?.airline ? clean(route.airline.icao) : guessAirlineIcao(operationalCallsign);

	const aircraftType = aircraft ? clean(aircraft.type) : a.type || '';
	const aircraftModel = (aircraft ? clean(aircraft.model) : '') || aircraftType || a.aircraftModel || '';
	const registration = aircraft ? clean(aircraft.registration) : a.registration || '';
	const logoKey = airlineIcao || guessAirlineIcao(operationalCallsign);

	const logoUrl = logoKey
		? `https://raw.githubusercontent.com/Jxck-S/airline-logos/refs/heads/main/radarbox_banners/${logoKey}.png`
		: '';

	const logoFallbackUrl = logoKey
		? `https://raw.githubusercontent.com/Jxck-S/airline-logos/refs/heads/main/fr24_banners/${logoKey}.png`
		: '';
	return {
		operationalCallsign,
		routeCallsign,

		airlineName,
		airlineIata,
		airlineIcao,

		originIata: '',
		destIata: '',
		originName: '',
		destName: '',
		routeText: '',
		routeTextLong: '',
		routeReliable: false,
		routeWarning: '',
		routeSource: 'adsbdb-no-route',

		aircraftModel,
		aircraftType,
		registration,

		logoUrl,
		logoFallbackUrl,
		fr24ImageUrl: '',
	};
}

function parseAdsbdbRouteFallback(data: any, mode: string, config: JetFrameConfig): RouteResult | null {
	const response = data?.response || {};
	const route = response.flightroute || null;

	if (!route) {
		return null;
	}

	const originIata = route.origin ? clean(route.origin.iata_code).toUpperCase() : '';

	const destIata = route.destination ? clean(route.destination.iata_code).toUpperCase() : '';

	const callsign = clean(route.callsign || route.flight_number || '').toUpperCase();

	if (!isIataCode(originIata) || !isIataCode(destIata)) {
		return null;
	}
	if (originIata === destIata) {
		return null;
	}

	if (mode === 'TAKEOFF' && originIata !== config.airport.iata) {
		return null;
	}
	if (mode === 'LANDING' && destIata !== config.airport.iata) {
		return null;
	}

	return {
		routeCallsign: callsign,
		originIata,
		destIata,
	};
}

/************************************************************
 * HexDB Route
 ************************************************************/

async function resolveRouteViaHexDb(
	adapter: any,
	operationalCallsign: string,
	httpJson: HttpJson,
	logDebug: (msg: string, level?: number) => void,
	logWarn: (msg: string) => void,
	config: JetFrameConfig,
): Promise<RouteResult | null> {
	const op = clean(operationalCallsign).toUpperCase();

	if (!op) {
		return null;
	}

	const now = Date.now();
	const cached = hexdbRouteCache[op];

	if (cached && now - cached.ts < CACHE.hexdbRouteMs) {
		logDebug(`HexDB Route Cache hit: ${op}`);
		return cached.data || null;
	}

	try {
		const url = `https://hexdb.io/api/v1/route/icao/${encodeURIComponent(op)}`;

		logDebug(`HexDB Route Anfrage: ${op} → ${url}`);

		const data = await httpJson(url);

		if (data?.status === '404' || data?.error) {
			hexdbRouteCache[op] = {
				ts: now,
				data: null,
			};

			logDebug(`HexDB Route nicht gefunden: ${op}`);
			return null;
		}

		const routeRaw = clean(data?.route).toUpperCase();

		if (!routeRaw || !routeRaw.includes('-')) {
			hexdbRouteCache[op] = {
				ts: now,
				data: null,
			};

			return null;
		}

		const parts = routeRaw.split('-').map(x => clean(x).toUpperCase());
		const originIcao = parts[0] || '';
		const destIcao = parts[1] || '';

		if (!isIcaoCode(originIcao) || !isIcaoCode(destIcao)) {
			hexdbRouteCache[op] = {
				ts: now,
				data: null,
			};

			return null;
		}

		const originIata = await iataFromIcao(adapter, config, originIcao);
		const destIata = await iataFromIcao(adapter, config, destIcao);

		if (!originIata || !destIata) {
			hexdbRouteCache[op] = {
				ts: now,
				data: null,
			};

			logDebug(`HexDB Route ohne IATA-Mapping: ${originIcao}-${destIcao}`);
			return null;
		}

		const result: RouteResult = {
			routeCallsign: clean(data?.flight).toUpperCase() || op,
			originIata,
			destIata,
			isLive: true,
		};

		hexdbRouteCache[op] = {
			ts: now,
			data: result,
		};

		logDebug(`HexDB Route parsed: ${op} | ${originIata} → ${destIata}`);

		return result;
	} catch (e) {
		hexdbRouteCache[op] = {
			ts: now,
			data: null,
		};

		logDebug(`HexDB Route Fehler für ${op}: ${errorText(e)}`);
		return null;
	}
}

async function iataFromIcao(adapter: any, config: JetFrameConfig, icao: string): Promise<string> {
	icao = clean(icao).toUpperCase();

	if (!icao) {
		return '';
	}

	// schnelle lokale Hauptairport-Abkürzung
	if (icao === clean(config.airport.icao).toUpperCase()) {
		return clean(config.airport.iata).toUpperCase();
	}

	try {
		const st = await adapter.getForeignStateAsync(config.airportJsonDp);
		const raw = st?.val ? String(st.val) : '';

		if (!raw || raw === '[]') {
			return '';
		}

		const airports = JSON.parse(raw);

		if (!Array.isArray(airports)) {
			return '';
		}

		const found = airports.find((a: any) => clean(a.icao || a.ICAO).toUpperCase() === icao);

		if (!found) {
			return '';
		}

		return clean(found.iata || found.IATA || '').toUpperCase();
	} catch {
		return '';
	}
}

function mergeHexAndFlighteraRoute(
	hexRoute: RouteResult | null,
	flighteraRoute: RouteResult | null,
): RouteResult | null {
	const flighteraComplete = !!flighteraRoute?.originIata && !!flighteraRoute?.destIata;

	const hexComplete = !!hexRoute?.originIata && !!hexRoute?.destIata;

	// Wichtig:
	// Wenn Flightera eine vollständige LIVE-Zeile hat,
	// gewinnt Flightera gegen HexDB.
	// HexDB ist oft gut, aber bei historischen/alten Callsigns
	// teilweise falsch.
	if (flighteraComplete && flighteraRoute?.isLive) {
		return flighteraRoute;
	}

	// Wenn Flightera vollständig ist und Hex fehlt,
	// gewinnt ebenfalls Flightera.
	if (flighteraComplete && !hexComplete) {
		return flighteraRoute;
	}

	// Sonst HexDB als schneller/stabiler Fallback.
	if (hexComplete) {
		return hexRoute;
	}

	// Falls nur Flightera vollständig ist, nehmen.
	if (flighteraComplete) {
		return flighteraRoute;
	}

	return hexRoute || flighteraRoute || null;
}

function isIcaoCode(code: string): boolean {
	code = clean(code).toUpperCase();
	return /^[A-Z]{4}$/.test(code);
}

/************************************************************
 * Flightera
 ************************************************************/

async function resolveRouteViaFlighteraPlane(
	registration: string | undefined,
	operationalCallsign: string,
	mode: string,
	httpText: HttpText,
	logDebug: (msg: string, level?: number) => void,
	logWarn: (msg: string) => void,
	config: JetFrameConfig,
): Promise<RouteResult | null> {
	const reg = clean(registration).toUpperCase();
	const op = clean(operationalCallsign).toUpperCase();

	if (!reg || !op) {
		return null;
	}

	const cacheKey = `${reg}|${op}`;
	const now = Date.now();
	const cached = flighteraPlaneRouteCache[cacheKey];

	if (cached && now - cached.ts < CACHE.flighteraMs) {
		logDebug(`Flightera Plane Cache hit: ${cacheKey}`);
		return cached.data || null;
	}

	const urls = [
		`https://www.flightera.net/de/planes/${encodeURIComponent(reg)}`,
		`https://www.flightera.net/en/planes/${encodeURIComponent(reg)}`,
	];

	for (const url of urls) {
		try {
			logDebug(`Flightera Plane Anfrage EINMALIG: ${cacheKey} → ${url}`);

			const htmlRaw = await httpText(url);
			const html = normalizeHtml(htmlRaw);
			const text = htmlToText(html);

			const parsed = parseFlighteraPlaneRoute(html, text, op, mode, config, logDebug);

			if (parsed?.originIata && parsed?.destIata) {
				flighteraPlaneRouteCache[cacheKey] = {
					ts: now,
					data: parsed,
				};

				logDebug(
					`Flightera Plane Route parsed: ${op} | ${parsed.originIata} → ${parsed.destIata} | routeCallsign=${parsed.routeCallsign || '?'} | live=${parsed.isLive ? 'ja' : 'nein'}`,
				);

				return parsed;
			}
		} catch (e) {
			logWarn(`Flightera Plane Fehler für ${cacheKey}: ${errorText(e)}`);
		}
	}

	flighteraPlaneRouteCache[cacheKey] = {
		ts: now,
		data: null,
	};

	logDebug(`Flightera Plane keine Route gefunden für ${cacheKey}`);
	return null;
}

function parseFlighteraPlaneRoute(
	html: string,
	text: string,
	operationalCallsign: string,
	mode: string,
	config: JetFrameConfig,
	logDebug: (msg: string, level?: number) => void,
): RouteResult | null {
	const op = clean(operationalCallsign).toUpperCase();

	const rows = extractFlighteraRowsStrict(html, text, op, mode, config, logDebug);

	const picked = pickBestFlighteraRow(rows, op, mode, config, logDebug);

	if (picked) {
		return {
			routeCallsign: /[A-Z]/.test(picked.routeCallsign || '') ? picked.routeCallsign : op,
			originIata: picked.originIata,
			destIata: picked.destIata,
			isLive: !!picked.isLive,
		};
	}

	logDebug('[Flightera] Keine passende Live/Callsign-Zeile → Route verworfen.');
	return null;
}

function extractFlighteraRowsStrict(
	html: string,
	text: string,
	operationalCallsign: string,
	mode: string,
	config: JetFrameConfig,
	logDebug: (msg: string, level?: number) => void,
): FlighteraRow[] {
	const blocks: Array<{ text: string; source: string; index: number }> = [];
	const rows: FlighteraRow[] = [];

	function addBlock(raw: string, source: string, index: number): void {
		const plain = htmlToText(raw);

		if (!plain || plain.length < 25) {
			return;
		}

		blocks.push({
			text: plain.replace(/\s+/g, ' ').trim(),
			source,
			index: index || 0,
		});
	}

	let m: RegExpExecArray | null;

	const trRegex = /<tr[\s\S]*?<\/tr>/gi;

	while ((m = trRegex.exec(String(html || ''))) !== null) {
		addBlock(m[0], 'tr', m.index);
	}

	const fullText = String(text || '')
		.replace(/\s+/g, ' ')
		.trim();
	const upperText = fullText.toUpperCase();
	const op = clean(operationalCallsign).toUpperCase();
	const opIndex = upperText.indexOf(op);

	if (opIndex >= 0) {
		const start = Math.max(0, opIndex - 500);
		const end = Math.min(fullText.length, opIndex + 1800);

		addBlock(fullText.substring(start, end), 'op-live-scope', opIndex);
	} else {
		logDebug(`Flightera op-live-scope: Operational Callsign nicht gefunden: ${op}`);
	}

	const iataLike = operationalToLikelyIataCallsign(op);

	if (iataLike && iataLike !== op) {
		const marketingIndex = upperText.indexOf(iataLike.toUpperCase());

		if (marketingIndex >= 0) {
			const start = Math.max(0, marketingIndex - 500);
			const end = Math.min(fullText.length, marketingIndex + 1800);

			addBlock(fullText.substring(start, end), 'marketing-scope', marketingIndex);
		}
	}

	const liveRegex = /\bLIVE\b/gi;
	let liveCount = 0;

	while ((m = liveRegex.exec(fullText)) !== null && liveCount < 5) {
		const liveIndex = m.index;
		const start = Math.max(0, liveIndex - 900);
		const end = Math.min(fullText.length, liveIndex + 2400);

		addBlock(fullText.substring(start, end), 'live-fallback', liveIndex);
		liveCount++;
	}

	for (const b of blocks) {
		const row = parseFlighteraSingleRow(b.text, operationalCallsign, mode, b.source, b.index, config);

		if (row) {
			rows.push(row);
		}
	}

	const unique: FlighteraRow[] = [];
	const seen = new Set<string>();

	for (const r of rows) {
		const key = [
			r.routeCallsign || '',
			r.operationalCallsign || '',
			r.originIata || '',
			r.destIata || '',
			r.isLive ? 'live' : 'no',
			r.source || '',
		].join('|');

		if (!seen.has(key)) {
			seen.add(key);
			unique.push(r);
		}
	}

	return unique;
}

function parseFlighteraSingleRow(
	rowText: string,
	operationalCallsign: string,
	mode: string,
	source: string,
	index: number,
	config: JetFrameConfig,
): FlighteraRow | null {
	const text = String(rowText || '')
		.replace(/\s+/g, ' ')
		.trim();
	const upper = text.toUpperCase();
	const op = clean(operationalCallsign).toUpperCase();
	const iataLike = operationalToLikelyIataCallsign(op);

	const isLive = /\bLIVE\b/i.test(text);
	const containsOp = !!op && upper.indexOf(op) !== -1;
	const containsIataLike = !!iataLike && upper.indexOf(iataLike.toUpperCase()) !== -1;

	const calls: string[] = [];
	let cm: RegExpExecArray | null;

	const callRegex = /\b([A-Z]{2,3}\d{1,4}[A-Z]?)\b/g;

	// LIVE Tabellenzeilen enthalten oft:
	// EN8760 DLA7WL
	// LH54 DLH1KN
	// -> erstes = Marketing
	// -> zweites = operational

	const livePairRegex = /\b([A-Z]{2,3}\d{1,4}[A-Z]?)\s+([A-Z]{3}\d+[A-Z]{0,2})\b/g;

	while ((cm = callRegex.exec(upper)) !== null) {
		const cs = clean(cm[1]).toUpperCase();

		if (!looksLikeMarketingCallsign(cs)) {
			continue;
		}
		if (!calls.includes(cs)) {
			calls.push(cs);
		}
	}

	let routeCallsign = '';

	// WICHTIG:
	// Zuerst LIVE-Zeilen-Paare prüfen:
	// EN8760 DLA7WL
	// LH54 DLH1KN

	const pairMatches = [...text.matchAll(livePairRegex)];

	for (const pm of pairMatches) {
		const marketing = clean(pm[1]).toUpperCase();
		const operational = clean(pm[2]).toUpperCase();

		if (operational === op) {
			routeCallsign = marketing;
			break;
		}
	}

	// Fallback alt
	if (!routeCallsign) {
		if (calls.includes(iataLike)) {
			routeCallsign = iataLike;
		} else if (calls.length) {
			routeCallsign = calls.find(cs => /[A-Z]/.test(cs)) || '';
		} else if (containsOp) {
			routeCallsign = op;
		}
	}

	if (!/[A-Z]/.test(routeCallsign)) {
		routeCallsign = containsOp ? op : '';
	}

	const airportPairs: string[] = [];
	let m: RegExpExecArray | null;

	const pairRegex = /([A-Za-zÄÖÜäöüß .'\-]+?)\s*\(([A-Z]{3})\s*\/\s*[A-Z]{4}\)/g;

	while ((m = pairRegex.exec(text)) !== null) {
		const code = clean(m[2]).toUpperCase();

		if (isIataCode(code)) {
			airportPairs.push(code);
		}
	}

	let originIata = '';
	let destIata = '';

	if (airportPairs.length >= 2) {
		originIata = airportPairs[0];
		destIata = airportPairs[1];
	} else {
		const codes: string[] = [];
		const codeRegex = /\b([A-Z]{3})\s*\/\s*[A-Z]{4}\b/g;

		while ((m = codeRegex.exec(upper)) !== null) {
			const code = clean(m[1]).toUpperCase();

			if (isIataCode(code) && !codes.includes(code)) {
				codes.push(code);
			}
		}

		if (codes.length >= 2) {
			originIata = codes[0];
			destIata = codes[1];
		}
	}

	originIata = clean(originIata).toUpperCase();
	destIata = clean(destIata).toUpperCase();

	if (!originIata || !destIata) {
		return null;
	}
	if (!isIataCode(originIata) || !isIataCode(destIata)) {
		return null;
	}
	if (originIata === destIata) {
		return null;
	}

	if (mode === 'TAKEOFF' && originIata !== config.airport.iata) {
		return null;
	}
	if (mode === 'LANDING' && destIata !== config.airport.iata) {
		return null;
	}

	return {
		routeCallsign,
		operationalCallsign: containsOp ? op : '',
		originIata,
		destIata,
		isLive,
		containsOp,
		containsIataLike,
		source,
		index,
	};
}

function pickBestFlighteraRow(
	rows: FlighteraRow[],
	operationalCallsign: string,
	mode: string,
	config: JetFrameConfig,
	logDebug: (msg: string, level?: number) => void,
): FlighteraRow | null {
	if (!rows.length) {
		return null;
	}

	const op = clean(operationalCallsign).toUpperCase();
	const iataLike = operationalToLikelyIataCallsign(op);

	const scoreAndSort = (list: FlighteraRow[], bonus: number): FlighteraRow => {
		for (const r of list) {
			r.score = scoreFlighteraRow(r, op, iataLike, mode, config) + bonus;
		}

		list.sort((a, b) => (b.score || 0) - (a.score || 0));
		return list[0];
	};

	const liveExact = rows.filter(r => r.isLive && r.containsOp);
	if (liveExact.length) {
		return scoreAndSort(liveExact, 50000);
	}

	const liveMarketing = rows.filter(r => r.isLive && r.containsIataLike);
	if (liveMarketing.length) {
		return scoreAndSort(liveMarketing, 40000);
	}

	const liveRows = rows.filter(r => r.isLive);
	if (liveRows.length) {
		return scoreAndSort(liveRows, 30000);
	}

	const exact = rows.filter(r => r.containsOp || r.containsIataLike);
	if (exact.length) {
		return scoreAndSort(exact, 10000);
	}

	logDebug(`Flightera: keine passende Live/Callsign-Zeile für ${op}`);
	return null;
}

function scoreFlighteraRow(
	r: FlighteraRow,
	op: string,
	iataLike: string,
	mode: string,
	config: JetFrameConfig,
): number {
	let score = 0;

	if (r.isLive) {
		score += 10000;
	}
	if (r.containsOp) {
		score += 5000;
	}
	if (r.containsIataLike) {
		score += 2500;
	}

	if (r.routeCallsign && iataLike && r.routeCallsign === iataLike) {
		score += 1500;
	}

	if (r.routeCallsign && iataLike && r.routeCallsign.startsWith(iataLike.substring(0))) {
		score += 400;
	}

	if (mode === 'TAKEOFF' && r.originIata === config.airport.iata) {
		score += 1000;
	}
	if (mode === 'LANDING' && r.destIata === config.airport.iata) {
		score += 1000;
	}

	score -= Math.min(r.index || 0, 200000) / 1000;

	return score;
}

/************************************************************
 * FR24 Live
 ************************************************************/

async function resolveRouteViaFr24Live(
	operationalCallsign: string,
	mode: string,
	httpText: HttpText,
	logDebug: (msg: string, level?: number) => void,
	logWarn: (msg: string) => void,
	config: JetFrameConfig,
): Promise<(RouteResult & { imageUrl?: string }) | null> {
	const op = clean(operationalCallsign).toUpperCase();

	if (!op) {
		return null;
	}

	const now = Date.now();
	const cached = fr24LiveRouteCache[op];

	if (cached && now - cached.ts < CACHE.fr24LiveMs) {
		logDebug(`FR24 Live Cache hit: ${op}`);
		return cached.data || null;
	}

	const url = `https://www.flightradar24.com/${encodeURIComponent(op)}`;

	try {
		logDebug(`FR24 Live Anfrage EINMALIG: ${op} → ${url}`);

		const htmlRaw = await httpText(url);
		const html = normalizeHtml(htmlRaw);
		const text = htmlToText(html);

		const imageUrl = pickBestFr24Image(collectFr24Images(html));
		const parsed = parseFr24LiveRoute(html, text, op, mode, config);

		const result: RouteResult & { imageUrl?: string } = parsed || {
			routeCallsign: '',
			originIata: '',
			destIata: '',
		};

		if (imageUrl) {
			result.imageUrl = imageUrl;
		}

		fr24LiveRouteCache[op] = {
			ts: now,
			data: result,
		};

		return result;
	} catch (e) {
		fr24LiveRouteCache[op] = {
			ts: now,
			data: null,
		};

		logWarn(`FR24 Live Fehler gecached für ${op}: ${errorText(e)}`);
		return null;
	}
}

function parseFr24LiveRoute(
	html: string,
	text: string,
	operationalCallsign: string,
	mode: string,
	config: JetFrameConfig,
): RouteResult | null {
	const op = clean(operationalCallsign).toUpperCase();
	const iataLike = operationalToLikelyIataCallsign(op);

	const fullText = String(text || '')
		.replace(/\s+/g, ' ')
		.trim();
	const upper = fullText.toUpperCase();

	let scope = fullText;
	let idx = upper.indexOf(op);

	if (idx < 0 && iataLike) {
		idx = upper.indexOf(iataLike.toUpperCase());
	}

	if (idx >= 0) {
		const start = Math.max(0, idx - 700);
		const end = Math.min(fullText.length, idx + 2000);
		scope = fullText.substring(start, end);
	}

	const row = parseRouteFromAirportPairs(scope, op, mode, config);

	if (row) {
		row.routeCallsign = findBestMarketingCallsign(scope, op) || iataLike || op;
		return row;
	}

	const jsonRoute = parseJsonLikeRouteFromHtml(html, op, mode, config);
	if (jsonRoute) {
		return jsonRoute;
	}

	return null;
}

function parseRouteFromAirportPairs(
	scope: string,
	operationalCallsign: string,
	mode: string,
	config: JetFrameConfig,
): RouteResult | null {
	const text = String(scope || '')
		.replace(/\s+/g, ' ')
		.trim();

	const pairs: string[] = [];
	let m: RegExpExecArray | null;

	const pairRegex = /([A-Za-zÄÖÜäöüß .'\-]+?)\s*\(([A-Z]{3})\s*\/\s*[A-Z]{4}\)/g;

	while ((m = pairRegex.exec(text)) !== null) {
		const code = clean(m[2]).toUpperCase();

		if (isIataCode(code)) {
			pairs.push(code);
		}
	}

	if (pairs.length < 2) {
		return null;
	}

	let originIata = '';
	let destIata = '';

	if (mode === 'TAKEOFF') {
		const aptIndex = pairs.indexOf(config.airport.iata);

		if (aptIndex >= 0 && pairs[aptIndex + 1]) {
			originIata = config.airport.iata;
			destIata = pairs[aptIndex + 1];
		}
	} else if (mode === 'LANDING') {
		const aptIndex = pairs.indexOf(config.airport.iata);

		if (aptIndex > 0) {
			originIata = pairs[aptIndex - 1];
			destIata = config.airport.iata;
		}
	} else {
		originIata = pairs[0];
		destIata = pairs[1];
	}

	originIata = clean(originIata).toUpperCase();
	destIata = clean(destIata).toUpperCase();

	if (!isIataCode(originIata) || !isIataCode(destIata)) {
		return null;
	}
	if (originIata === destIata) {
		return null;
	}

	if (mode === 'TAKEOFF' && originIata !== config.airport.iata) {
		return null;
	}
	if (mode === 'LANDING' && destIata !== config.airport.iata) {
		return null;
	}

	return {
		routeCallsign: findBestMarketingCallsign(text, operationalCallsign),
		originIata,
		destIata,
	};
}

function parseJsonLikeRouteFromHtml(
	html: string,
	operationalCallsign: string,
	mode: string,
	config: JetFrameConfig,
): RouteResult | null {
	html = normalizeHtml(html);

	const iataHits: string[] = [];
	let m: RegExpExecArray | null;

	const iataRegexes = [
		/"iata"\s*:\s*"([A-Z]{3})"/g,
		/"iataCode"\s*:\s*"([A-Z]{3})"/g,
		/"iata_code"\s*:\s*"([A-Z]{3})"/g,
	];

	for (const re of iataRegexes) {
		while ((m = re.exec(html)) !== null) {
			const code = clean(m[1]).toUpperCase();

			if (isIataCode(code) && !iataHits.includes(code)) {
				iataHits.push(code);
			}
		}
	}

	if (iataHits.length < 2) {
		return null;
	}

	let originIata = '';
	let destIata = '';

	if (mode === 'TAKEOFF') {
		const aptIndex = iataHits.indexOf(config.airport.iata);

		if (aptIndex >= 0 && iataHits[aptIndex + 1]) {
			originIata = config.airport.iata;
			destIata = iataHits[aptIndex + 1];
		}
	} else if (mode === 'LANDING') {
		const aptIndex = iataHits.indexOf(config.airport.iata);

		if (aptIndex > 0) {
			originIata = iataHits[aptIndex - 1];
			destIata = config.airport.iata;
		}
	} else {
		originIata = iataHits[0];
		destIata = iataHits[1];
	}

	if (!isIataCode(originIata) || !isIataCode(destIata)) {
		return null;
	}
	if (originIata === destIata) {
		return null;
	}

	return {
		routeCallsign: findBestMarketingCallsign(htmlToText(html), operationalCallsign),
		originIata,
		destIata,
	};
}

/************************************************************
 * FR24 Bild
 ************************************************************/

/**
 *
 */
export async function resolveImageViaFr24Aircraft(
	registration: string,
	operationalCallsign: string,
	httpText: HttpText,
	logDebug: (msg: string, level?: number) => void,
	logWarn: (msg: string) => void,
): Promise<string> {
	const reg = clean(registration).toLowerCase();
	const op = clean(operationalCallsign).toUpperCase();

	if (!reg) {
		return '';
	}

	const now = Date.now();
	const cached = fr24AircraftCache[reg];

	if (cached && now - cached.ts < CACHE.fr24Ms) {
		logDebug(`FR24 Bild Cache hit: ${reg}`);
		return cached.imageUrl || '';
	}

	const url = `https://www.flightradar24.com/data/aircraft/${encodeURIComponent(reg)}`;

	try {
		logDebug(`FR24 Aircraft Bild Anfrage EINMALIG: ${reg} / ${op} → ${url}`);

		const htmlRaw = await httpText(url);
		const html = normalizeHtml(htmlRaw);

		const imageUrl = pickBestFr24Image(collectFr24Images(html));

		fr24AircraftCache[reg] = {
			ts: now,
			imageUrl: imageUrl || '',
		};

		return imageUrl || '';
	} catch (e) {
		fr24AircraftCache[reg] = {
			ts: now,
			imageUrl: '',
		};

		logWarn(`FR24 Bild Fehler gecached für ${reg}: ${errorText(e)}`);
		return '';
	}
}

/************************************************************
 * Airport names / unknown route
 ************************************************************/

async function applyAirportNamesFromJson(
	adapter: any,
	config: JetFrameConfig,
	parsed: ParsedInfo,
	logWarn: (msg: string) => void,
): Promise<ParsedInfo> {
	const originName = parsed.originIata ? await cityNameFromIata(adapter, config, parsed.originIata, logWarn) : '';

	const destName = parsed.destIata ? await cityNameFromIata(adapter, config, parsed.destIata, logWarn) : '';

	parsed.originName = originName;
	parsed.destName = destName;

	if (parsed.originIata && parsed.destIata) {
		parsed.routeText = `${parsed.originIata} → ${parsed.destIata}`;
	}

	if (originName && destName) {
		parsed.routeTextLong = `${originName} → ${destName}`;
	} else if (originName && !destName && parsed.destIata) {
		parsed.routeTextLong = `${originName} → ${parsed.destIata}`;
	} else if (!originName && destName && parsed.originIata) {
		parsed.routeTextLong = `${parsed.originIata} → ${destName}`;
	} else {
		parsed.routeTextLong = '';
	}

	return parsed;
}

async function cityNameFromIata(
	adapter: any,
	config: JetFrameConfig,
	iata: string,
	logWarn: (msg: string) => void,
): Promise<string> {
	const lang = await getSystemLanguage(adapter);
	const useGermanNames = lang.toLowerCase().startsWith('de');
	const code = clean(iata).toUpperCase();

	if (!code) {
		return '';
	}

	try {
		const st = await adapter.getForeignStateAsync(config.airportJsonDp);
		const raw = st?.val ? String(st.val) : '';

		if (!raw || raw === '[]') {
			return code;
		}

		const airports = JSON.parse(raw);

		if (!Array.isArray(airports)) {
			return code;
		}

		const found = airports.find((a: any) => clean(a.iata || a.IATA).toUpperCase() === code);

		if (!found) {
			return code;
		}

		// municipality bevorzugen:
		// IAD => Washington statt Dulles
		// CDG => Paris statt Roissy

		const cityDe = clean(found.city_DE);

		const municipality = clean(found.municipality);

		const city = clean(found.city);

		const airport = clean(found.airport || found.name);

		if (useGermanNames && cityDe && cityDe.length >= 3) {
			return cityDe;
		}

		if (municipality && municipality.length >= 3 && !/airport|flug|intl|international/i.test(municipality)) {
			return municipality;
		}

		if (city && city.length >= 3) {
			return city;
		}

		if (airport) {
			return airport
				.replace(/international airport/gi, '')
				.replace(/international/gi, '')
				.replace(/airport/gi, '')
				.replace(/\s+/g, ' ')
				.trim();
		}

		return code;
	} catch (e) {
		logWarn(`airportjson Lookup Fehler für ${code}: ${errorText(e)}`);
		return code;
	}
}

async function getSystemLanguage(adapter: any): Promise<string> {
	try {
		const obj = await adapter.getForeignObjectAsync('system.config');

		return String(obj?.common?.language || obj?.native?.language || '').trim();
	} catch {
		return '';
	}
}

function makeUnknownAirportRoute(mode: string, parsed: ParsedInfo, config: JetFrameConfig): ParsedInfo {
	const A = config.airport.iata;

	if (mode === 'TAKEOFF') {
		return {
			...parsed,
			originIata: A,
			destIata: '',
			originName: '',
			destName: '',
			routeText: `${A} → ?`,
			routeTextLong: '',
			routeReliable: false,
			routeWarning: 'Ziel unbekannt',
			routeSource: 'no-route',
		};
	}

	if (mode === 'LANDING') {
		return {
			...parsed,
			originIata: '',
			destIata: A,
			originName: '',
			destName: '',
			routeText: `? → ${A}`,
			routeTextLong: '',
			routeReliable: false,
			routeWarning: 'Start unbekannt',
			routeSource: 'no-route',
		};
	}

	return {
		...parsed,
		originIata: '',
		destIata: '',
		routeText: '',
		routeTextLong: '',
		routeReliable: false,
		routeWarning: 'Route unbekannt',
		routeSource: 'no-route',
	};
}

/************************************************************
 * Image helpers
 ************************************************************/

function collectFr24Images(html: string): string[] {
	html = normalizeHtml(html);

	const found: string[] = [];

	function add(url: string): void {
		url = normalizeImageUrl(url);

		if (!url) {
			return;
		}
		if (!/\.(jpg|jpeg|webp|png)(\?|$)/i.test(url)) {
			return;
		}
		if (found.includes(url)) {
			return;
		}
		if (/logo|icon|sprite|avatar|upgrade|plans|app-store|google-play/i.test(url)) {
			return;
		}

		found.push(url);
	}

	let m: RegExpExecArray | null;

	const regexes = [
		/<img[^>]+src=["']([^"']+)["'][^>]*alt=["'][^"']*(?:aircraft|plane|photo|picture)[^"']*["']/gi,
		/<img[^>]+alt=["'][^"']*(?:aircraft|plane|photo|picture)[^"']*["'][^>]+src=["']([^"']+)["']/gi,
		/https?:\/\/[^"'<> ]+\.(?:jpg|jpeg|webp|png)(?:\?[^"'<> ]*)?/gi,
		/src=["']([^"']+\.(?:jpg|jpeg|webp|png)(?:\?[^"']*)?)["']/gi,
		/content=["']([^"']+\.(?:jpg|jpeg|webp|png)(?:\?[^"']*)?)["']/gi,
	];

	for (const re of regexes) {
		while ((m = re.exec(html)) !== null) {
			add(m[1] || m[0]);
		}
	}

	return found;
}

function pickBestFr24Image(images: string[]): string {
	if (!images.length) {
		return '';
	}

	return images.sort((a, b) => scoreFr24Image(b) - scoreFr24Image(a))[0];
}

function scoreFr24Image(url: string): number {
	url = String(url || '').toLowerCase();

	let score = 0;

	if (url.includes('fr24')) {
		score += 60;
	}
	if (url.includes('cdn')) {
		score += 50;
	}
	if (url.includes('aircraft')) {
		score += 50;
	}
	if (url.includes('large')) {
		score += 40;
	}
	if (url.includes('full')) {
		score += 40;
	}
	if (url.includes('photo')) {
		score += 20;
	}

	if (url.includes('thumb')) {
		score -= 80;
	}
	if (url.includes('small')) {
		score -= 50;
	}
	if (url.includes('logo') || url.includes('icon')) {
		score -= 100;
	}

	return score;
}

/************************************************************
 * Guessing / special
 ************************************************************/

function buildSpecialInfo(a: Partial<Aircraft>): Partial<Aircraft> {
	const model = String(a.aircraftModel || a.aircraftType || a.type || '').toUpperCase();

	const callsign = String(a.callsign || '').toUpperCase();

	const tags: string[] = [];
	let score = 0;

	// --------------------------------------------------
	// A380
	// --------------------------------------------------

	if (/A38/i.test(model)) {
		tags.push('Airbus A380');
		score += 10;
	}
	// --------------------------------------------------
	// B747 / Jumbo
	// --------------------------------------------------

	if (/B74/i.test(model)) {
		tags.push('Boeing 747');
		score += 8;
	}

	// --------------------------------------------------
	// Beluga
	// --------------------------------------------------

	if (containsAny(model, ['BELUGA'])) {
		tags.push('Airbus Beluga');
		score += 10;
	}

	// --------------------------------------------------
	// Antonov
	// --------------------------------------------------

	if (containsAny(model, ['AN-124', 'ANTONOV', 'AN225', 'AN-225'])) {
		tags.push('Antonov');
		score += 10;
	}

	// --------------------------------------------------
	// Regierungs-/Militärflug
	// --------------------------------------------------

	if (containsAny(callsign, ['GAF', 'GOV', 'BAF', 'NAF', 'RCH', 'IAM'])) {
		tags.push('Regierungs-/Militärflug');
		score += 8;
	}

	return {
		isSpecial: score >= 8,
		specialText: tags.length ? tags.join(', ') : '',
	};
}

function guessAirlineIata(callsign: string): string {
	callsign = clean(callsign).toUpperCase();

	const map: Record<string, string> = {
		DLH: 'LH',
		CFG: 'DE',
		CPA: 'CX',
		KAL: 'KE',
		GEC: 'LH',
		BOX: '3S',
		EWG: 'EW',
		RYR: 'FR',
		EZY: 'U2',
		BAW: 'BA',
		KLM: 'KL',
		AFR: 'AF',
		SWR: 'LX',
		AUA: 'OS',
		SIA: 'SQ',
		THY: 'TK',
		UAE: 'EK',
		QTR: 'QR',
		CCA: 'CA',
		ROT: 'RO',
		SAS: 'SK',
		SEH: 'GQ',
	};

	return map[callsign.substring(0)] || '';
}

function guessAirlineIcao(callsign: string): string {
	callsign = clean(callsign).toUpperCase();
	return callsign.length >= 3 ? callsign.substring(0, 3) : '';
}

function guessAirlineName(callsign: string): string {
	callsign = clean(callsign).toUpperCase();

	if (callsign.startsWith('DLH')) {
		return 'Lufthansa';
	}
	if (callsign.startsWith('CFG')) {
		return 'Condor';
	}
	if (callsign.startsWith('CPA')) {
		return 'Cathay Pacific';
	}
	if (callsign.startsWith('KAL')) {
		return 'Korean Air Cargo';
	}
	if (callsign.startsWith('GEC')) {
		return 'Lufthansa Cargo';
	}
	if (callsign.startsWith('BOX')) {
		return 'AeroLogic';
	}
	if (callsign.startsWith('EWG')) {
		return 'Eurowings';
	}
	if (callsign.startsWith('RYR')) {
		return 'Ryanair';
	}
	if (callsign.startsWith('EZY')) {
		return 'easyJet';
	}
	if (callsign.startsWith('BAW')) {
		return 'British Airways';
	}
	if (callsign.startsWith('KLM')) {
		return 'KLM';
	}
	if (callsign.startsWith('AFR')) {
		return 'Air France';
	}
	if (callsign.startsWith('SWR')) {
		return 'SWISS';
	}
	if (callsign.startsWith('AUA')) {
		return 'Austrian';
	}
	if (callsign.startsWith('SIA')) {
		return 'Singapore Airlines';
	}
	if (callsign.startsWith('THY')) {
		return 'Turkish Airlines';
	}
	if (callsign.startsWith('UAE')) {
		return 'Emirates';
	}
	if (callsign.startsWith('QTR')) {
		return 'Qatar Airways';
	}
	if (callsign.startsWith('CCA')) {
		return 'Air China';
	}
	if (callsign.startsWith('ROT')) {
		return 'TAROM';
	}
	if (callsign.startsWith('SAS')) {
		return 'SAS';
	}
	if (callsign.startsWith('SEH')) {
		return 'Sky Express';
	}

	return '';
}

function operationalToLikelyIataCallsign(callsign: string): string {
	callsign = clean(callsign).toUpperCase();

	const map: Record<string, string> = {
		DLH: 'LH',
		CFG: 'DE',
		CPA: 'CX',
		KAL: 'KE',
		GEC: 'LH',
		BOX: '3S',
		EWG: 'EW',
		RYR: 'FR',
		EZY: 'U2',
		BAW: 'BA',
		KLM: 'KL',
		AFR: 'AF',
		SWR: 'LX',
		AUA: 'OS',
		SIA: 'SQ',
		THY: 'TK',
		UAE: 'EK',
		QTR: 'QR',
		ETD: 'EY',
		IBE: 'IB',
		TAP: 'TP',
		SAS: 'SK',
		FIN: 'AY',
		LOT: 'LO',
		CCA: 'CA',
		ROT: 'RO',
		SEH: 'GQ',
	};

	const prefix = callsign.substring(0, 3);
	const rest = callsign.substring(3);

	if (map[prefix] && rest) {
		return map[prefix] + rest;
	}

	return callsign;
}

/************************************************************
 * Helpers
 ************************************************************/

function findBestMarketingCallsign(text: string, operationalCallsign: string): string {
	const op = clean(operationalCallsign).toUpperCase();
	const iataLike = operationalToLikelyIataCallsign(op);
	const upper = String(text || '').toUpperCase();

	if (iataLike && upper.includes(iataLike)) {
		return iataLike;
	}

	const calls: string[] = [];
	let m: RegExpExecArray | null;

	const re = /\b([A-Z0-9]{2}\d{1,4}[A-Z]?)\b/g;

	while ((m = re.exec(upper)) !== null) {
		const cs = clean(m[1]).toUpperCase();

		if (!looksLikeMarketingCallsign(cs)) {
			continue;
		}
		if (!calls.includes(cs)) {
			calls.push(cs);
		}
	}

	return calls.length ? calls[0] : '';
}

function looksLikeMarketingCallsign(cs: string): boolean {
	cs = clean(cs).toUpperCase();

	if (!/^[A-Z0-9]{2}\d{1,4}[A-Z]?$/.test(cs)) {
		return false;
	}
	if (/^[A-Z]{3}\d/.test(cs)) {
		return false;
	}

	return true;
}

function isIataCode(code: string): boolean {
	code = clean(code).toUpperCase();

	if (!/^[A-Z]{3}$/.test(code)) {
		return false;
	}

	const bad = [
		'THE',
		'AND',
		'FOR',
		'YOU',
		'ARE',
		'NOT',
		'YES',
		'NEW',
		'OLD',
		'AIR',
		'API',
		'APP',
		'MAP',
		'UTC',
		'ETA',
		'STD',
		'STA',
		'ATD',
		'ATA',
		'IMG',
		'PNG',
		'JPG',
		'WEB',
		'CSS',
		'DIV',
		'SVG',
		'WWW',
		'TOP',
		'VAR',
		'REL',
		'ORG',
		'USE',
		'DAY',
		'PER',
		'MMM',
		'MAY',
		'BTN',
		'HEX',
		'NET',
		'SRC',
		'PAN',
		'COL',
		'VON',
		'NACH',
		'ABF',
		'ANK',
		'LIVE',
	];

	return !bad.includes(code);
}

function normalizeHtml(html: string): string {
	return String(html || '')
		.replace(/\\\//g, '/')
		.replace(/&amp;/g, '&')
		.replace(/&#x2F;/g, '/')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\\u002F/g, '/')
		.replace(/\\/g, '');
}

function htmlToText(html: string): string {
	return decodeHtml(html)
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<br\s*\/?>/gi, ' ')
		.replace(/<\/(?:tr|td|th|div|section|article|li|p)>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function decodeHtml(s: string): string {
	return String(s || '')
		.replace(/&amp;/g, '&')
		.replace(/&nbsp;/g, ' ')
		.replace(/&rarr;/g, '→')
		.replace(/&#8594;/g, '→')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>');
}

function normalizeImageUrl(url: string): string {
	return String(url || '')
		.replace(/\\\//g, '/')
		.replace(/&amp;/g, '&')
		.replace(/&#x2F;/g, '/')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.trim();
}

function containsAny(text: string, arr: string[]): boolean {
	text = String(text || '').toUpperCase();
	return arr.some(x => text.includes(String(x).toUpperCase()));
}

function clean(v: unknown): string {
	return String(v || '').trim();
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

/************************************************************
 * Interfaces
 ************************************************************/

interface ParsedInfo extends Partial<Aircraft> {
	fr24ImageUrl?: string;
	logoFallbackUrl?: string;
}

interface RouteResult {
	routeCallsign?: string;
	originIata: string;
	destIata: string;
	isLive?: boolean;
}

interface FlighteraRow {
	routeCallsign: string;
	operationalCallsign: string;
	originIata: string;
	destIata: string;
	isLive: boolean;
	containsOp: boolean;
	containsIataLike: boolean;
	source: string;
	index: number;
	score?: number;
}
