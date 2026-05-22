"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var flightInfo_exports = {};
__export(flightInfo_exports, {
  enrichFlightInfo: () => enrichFlightInfo,
  resolveImageViaFr24Aircraft: () => resolveImageViaFr24Aircraft
});
module.exports = __toCommonJS(flightInfo_exports);
const flighteraPlaneRouteCache = {};
const fr24LiveRouteCache = {};
const fr24AircraftCache = {};
const adsbdbCallsignCache = {};
const hexdbRouteCache = {};
const hexdbAirlineCache = {};
const CACHE = {
  flighteraMs: 12 * 60 * 60 * 1e3,
  fr24LiveMs: 60 * 60 * 1e3,
  fr24Ms: 24 * 60 * 60 * 1e3,
  adsbdbMs: 12 * 60 * 60 * 1e3,
  hexdbRouteMs: 6 * 60 * 60 * 1e3,
  hexdbAirlineMs: 24 * 60 * 60 * 1e3
};
async function enrichFlightInfo(adapter, config, a, httpJson, httpText, logDebug, logWarn) {
  if (!a.callsign) {
    return {
      ...a,
      aircraftType: a.aircraftType || a.type || "",
      ...buildSpecialInfo(a)
    };
  }
  try {
    const operationalCallsign = clean(a.callsign).toUpperCase();
    const operationalData = await loadAdsbdbByCallsign(operationalCallsign, httpJson, logDebug, logWarn);
    const hexAirline = await resolveAirlineViaHexDb(a.hex, httpText, logDebug, logWarn);
    let parsed = parseAdsbdbResponse(config, operationalData, a, operationalCallsign, operationalCallsign);
    if (hexAirline == null ? void 0 : hexAirline.name) {
      parsed.airlineName = hexAirline.name;
      parsed.airlineIata = hexAirline.iata || parsed.airlineIata || "";
      parsed.airlineIcao = hexAirline.icao || parsed.airlineIcao || guessAirlineIcao(operationalCallsign);
      parsed.logoUrl = buildExternalAirlineLogoUrl(
        config,
        parsed.airlineIcao || guessAirlineIcao(operationalCallsign),
        parsed.airlineIata || ""
      );
      logDebug(`HexDB Airline bevorzugt: ${parsed.airlineName}`);
    }
    const regForRoute = parsed.registration || a.registration;
    let routeFound = false;
    const hexRoute = await resolveRouteViaHexDb(adapter, operationalCallsign, httpJson, logDebug, logWarn, config);
    const flighteraRoute = await resolveRouteViaFlighteraPlane(
      regForRoute,
      operationalCallsign,
      a.mode || "",
      httpText,
      logDebug,
      logWarn,
      config
    );
    const mergedRoute = mergeHexAndFlighteraRoute(hexRoute, flighteraRoute);
    if ((mergedRoute == null ? void 0 : mergedRoute.originIata) && (mergedRoute == null ? void 0 : mergedRoute.destIata)) {
      parsed.routeCallsign = (flighteraRoute == null ? void 0 : flighteraRoute.routeCallsign) || (hexRoute == null ? void 0 : hexRoute.routeCallsign) || parsed.routeCallsign || operationalCallsign;
      parsed.originIata = mergedRoute.originIata;
      parsed.destIata = mergedRoute.destIata;
      parsed.routeReliable = true;
      if ((hexRoute == null ? void 0 : hexRoute.originIata) && (hexRoute == null ? void 0 : hexRoute.destIata) && (flighteraRoute == null ? void 0 : flighteraRoute.originIata) && (flighteraRoute == null ? void 0 : flighteraRoute.destIata) && (hexRoute.originIata !== flighteraRoute.originIata || hexRoute.destIata !== flighteraRoute.destIata)) {
        parsed.routeWarning = (flighteraRoute == null ? void 0 : flighteraRoute.isLive) ? "Flightera Live bevorzugt, HexDB abweichend" : "HexDB bevorzugt, Flightera abweichend";
        parsed.routeSource = (flighteraRoute == null ? void 0 : flighteraRoute.isLive) ? "flightera-live-route-conflict-hexdb+airportjson" : "hexdb-route-verified-conflict+airportjson";
      } else if ((hexRoute == null ? void 0 : hexRoute.originIata) && (hexRoute == null ? void 0 : hexRoute.destIata)) {
        parsed.routeWarning = flighteraRoute ? "HexDB + Flightera gepr\xFCft" : "HexDB Route";
        parsed.routeSource = flighteraRoute ? "hexdb-route+flightera-check+airportjson" : "hexdb-route+airportjson";
      } else {
        parsed.routeWarning = (flighteraRoute == null ? void 0 : flighteraRoute.isLive) ? "Live-Flug erkannt" : "";
        parsed.routeSource = (flighteraRoute == null ? void 0 : flighteraRoute.isLive) ? "flightera-plane-live-route+airportjson" : "flightera-plane-callsign-route+airportjson";
      }
      parsed.routeText = `${parsed.originIata} \u2192 ${parsed.destIata}`;
      routeFound = true;
    }
    if (!routeFound) {
      const fr24Live = await resolveRouteViaFr24Live(
        operationalCallsign,
        a.mode || "",
        httpText,
        logDebug,
        logWarn,
        config
      );
      if ((fr24Live == null ? void 0 : fr24Live.originIata) && (fr24Live == null ? void 0 : fr24Live.destIata)) {
        parsed.routeCallsign = fr24Live.routeCallsign || parsed.routeCallsign || operationalCallsign;
        parsed.originIata = fr24Live.originIata;
        parsed.destIata = fr24Live.destIata;
        parsed.routeReliable = true;
        parsed.routeWarning = "FR24 Live-Fallback";
        parsed.routeSource = "fr24-live-route+airportjson";
        parsed.routeText = `${parsed.originIata} \u2192 ${parsed.destIata}`;
        routeFound = true;
      }
      if (fr24Live == null ? void 0 : fr24Live.imageUrl) {
        parsed.fr24ImageUrl = fr24Live.imageUrl;
      }
    }
    if (!routeFound) {
      const adsbdbRoute = parseAdsbdbRouteFallback(operationalData, a.mode || "", config);
      if ((adsbdbRoute == null ? void 0 : adsbdbRoute.originIata) && (adsbdbRoute == null ? void 0 : adsbdbRoute.destIata)) {
        parsed.routeCallsign = adsbdbRoute.routeCallsign || parsed.routeCallsign || operationalCallsign;
        parsed.originIata = adsbdbRoute.originIata;
        parsed.destIata = adsbdbRoute.destIata;
        parsed.routeReliable = true;
        parsed.routeWarning = "ADSBDB Fallback";
        parsed.routeSource = "adsbdb-route-fallback+airportjson";
        parsed.routeText = `${parsed.originIata} \u2192 ${parsed.destIata}`;
        routeFound = true;
      }
    }
    if (!routeFound) {
      parsed = makeUnknownAirportRoute(a.mode || "", parsed, config);
    }
    if (!parsed.fr24ImageUrl) {
      parsed.fr24ImageUrl = "";
    }
    parsed = await applyAirportNamesFromJson(adapter, config, parsed, logWarn);
    const jet = parsed.fr24ImageUrl ? { best: parsed.fr24ImageUrl } : { best: "" };
    const baseInfo = {
      ...parsed,
      operationalCallsign,
      jetphotosUrl: parsed.registration ? `https://www.flightradar24.com/data/aircraft/${encodeURIComponent(
        String(parsed.registration).toLowerCase()
      )}` : "",
      jetphotosImageUrl: jet.best || "",
      aircraftType: parsed.aircraftType || a.aircraftType || a.type || "",
      aircraftModel: parsed.aircraftModel || parsed.aircraftType || a.aircraftModel || a.aircraftType || a.type || ""
    };
    const specialInfo = buildSpecialInfo({
      ...a,
      ...baseInfo
    });
    return {
      ...a,
      ...baseInfo,
      ...specialInfo
    };
  } catch (e) {
    logWarn(`FlightInfo Fehler: ${errorText(e)}`);
    return {
      ...a,
      aircraftType: a.aircraftType || a.type || "",
      ...buildSpecialInfo(a)
    };
  }
}
async function resolveAirlineViaHexDb(hex, httpText, logDebug, logWarn) {
  const cleanHex = clean(hex).toLowerCase().replace(/[^a-f0-9]/g, "");
  if (!cleanHex) {
    return null;
  }
  const now = Date.now();
  const cached = hexdbAirlineCache[cleanHex];
  if (cached && now - cached.ts < CACHE.hexdbAirlineMs) {
    logDebug(`HexDB Airline Cache hit: ${cleanHex}`);
    return cached.data || null;
  }
  try {
    logDebug(`HexDB Airline Anfrage: ${cleanHex}`);
    const data = await httpText(`https://hexdb.io/hex-airline?hex=${encodeURIComponent(cleanHex)}`);
    const name = clean(data);
    if (!name || name.toLowerCase().includes("not found")) {
      hexdbAirlineCache[cleanHex] = {
        ts: now,
        data: null
      };
      return null;
    }
    const result = normalizeHexDbAirlineName(name);
    hexdbAirlineCache[cleanHex] = {
      ts: now,
      data: result
    };
    return result;
  } catch (e) {
    hexdbAirlineCache[cleanHex] = {
      ts: now,
      data: null
    };
    logDebug(`HexDB Airline nicht nutzbar: ${errorText(e)}`);
    return null;
  }
}
function normalizeHexDbAirlineName(name) {
  return {
    name: clean(name),
    iata: "",
    icao: ""
  };
}
async function loadAdsbdbByCallsign(callsign, httpJson, logDebug, logWarn) {
  const cs = clean(callsign).toUpperCase();
  if (!cs || cs.length < 3) {
    logDebug("ADSBDB \xFCbersprungen: ung\xFCltiger Callsign");
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
      data: data || null
    };
    return data || null;
  } catch (e) {
    adsbdbCallsignCache[cs] = {
      ts: now,
      data: null
    };
    logWarn(`ADSBDB Fehler gecached f\xFCr ${cs}: ${errorText(e)}`);
    return null;
  }
}
function parseAdsbdbResponse(config, data, a, operationalCallsign, routeCallsign) {
  const response = (data == null ? void 0 : data.response) || {};
  const route = response.flightroute || null;
  const aircraft = response.aircraft || null;
  const airlineName = (route == null ? void 0 : route.airline) ? clean(route.airline.name) : guessAirlineName(operationalCallsign);
  const airlineIata = (route == null ? void 0 : route.airline) ? clean(route.airline.iata) : guessAirlineIata(operationalCallsign);
  const airlineIcao = (route == null ? void 0 : route.airline) ? clean(route.airline.icao) : guessAirlineIcao(operationalCallsign);
  const aircraftType = aircraft ? clean(aircraft.type) : a.type || "";
  const aircraftModel = (aircraft ? clean(aircraft.model) : "") || aircraftType || a.aircraftModel || "";
  const registration = aircraft ? clean(aircraft.registration) : a.registration || "";
  const logoKey = airlineIcao || guessAirlineIcao(operationalCallsign);
  const logoUrl = buildExternalAirlineLogoUrl(config, logoKey, airlineIata);
  const logoFallbackUrl = "";
  return {
    operationalCallsign,
    routeCallsign,
    airlineName,
    airlineIata,
    airlineIcao,
    originIata: "",
    destIata: "",
    originName: "",
    destName: "",
    routeText: "",
    routeTextLong: "",
    routeReliable: false,
    routeWarning: "",
    routeSource: "adsbdb-no-route",
    aircraftModel,
    aircraftType,
    registration,
    logoUrl,
    logoFallbackUrl,
    fr24ImageUrl: ""
  };
}
function buildExternalAirlineLogoUrl(config, airlineIcao, airlineIata) {
  if (!config.externalAirlineLogos) {
    return "";
  }
  const base = String(config.airlineLogoBaseUrl || "").trim();
  if (!base || !airlineIcao) {
    return "";
  }
  const icao = clean(airlineIcao).toUpperCase();
  const iata = clean(airlineIata).toUpperCase();
  if (base.includes("{icao}") || base.includes("{iata}") || base.includes("{code}")) {
    return base.replace(/\{icao\}/g, encodeURIComponent(icao)).replace(/\{iata\}/g, encodeURIComponent(iata || icao)).replace(/\{code\}/g, encodeURIComponent(icao));
  }
  return `${base.replace(/\/+$/, "")}/${encodeURIComponent(icao)}.png`;
}
function parseAdsbdbRouteFallback(data, mode, config) {
  const response = (data == null ? void 0 : data.response) || {};
  const route = response.flightroute || null;
  if (!route) {
    return null;
  }
  const originIata = route.origin ? clean(route.origin.iata_code).toUpperCase() : "";
  const destIata = route.destination ? clean(route.destination.iata_code).toUpperCase() : "";
  const callsign = clean(route.callsign || route.flight_number || "").toUpperCase();
  if (!isIataCode(originIata) || !isIataCode(destIata)) {
    return null;
  }
  if (originIata === destIata) {
    return null;
  }
  if (mode === "TAKEOFF" && originIata !== config.airport.iata) {
    return null;
  }
  if (mode === "LANDING" && destIata !== config.airport.iata) {
    return null;
  }
  return {
    routeCallsign: callsign,
    originIata,
    destIata
  };
}
async function resolveRouteViaHexDb(adapter, operationalCallsign, httpJson, logDebug, logWarn, config) {
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
    logDebug(`HexDB Route Anfrage: ${op} \u2192 ${url}`);
    const data = await httpJson(url);
    if ((data == null ? void 0 : data.status) === "404" || (data == null ? void 0 : data.error)) {
      hexdbRouteCache[op] = {
        ts: now,
        data: null
      };
      logDebug(`HexDB Route nicht gefunden: ${op}`);
      return null;
    }
    const routeRaw = clean(data == null ? void 0 : data.route).toUpperCase();
    if (!routeRaw || !routeRaw.includes("-")) {
      hexdbRouteCache[op] = {
        ts: now,
        data: null
      };
      return null;
    }
    const parts = routeRaw.split("-").map((x) => clean(x).toUpperCase());
    const originIcao = parts[0] || "";
    const destIcao = parts[1] || "";
    if (!isIcaoCode(originIcao) || !isIcaoCode(destIcao)) {
      hexdbRouteCache[op] = {
        ts: now,
        data: null
      };
      return null;
    }
    const originIata = await iataFromIcao(adapter, config, originIcao);
    const destIata = await iataFromIcao(adapter, config, destIcao);
    if (!originIata || !destIata) {
      hexdbRouteCache[op] = {
        ts: now,
        data: null
      };
      logDebug(`HexDB Route ohne IATA-Mapping: ${originIcao}-${destIcao}`);
      return null;
    }
    const result = {
      routeCallsign: clean(data == null ? void 0 : data.flight).toUpperCase() || op,
      originIata,
      destIata,
      isLive: true
    };
    hexdbRouteCache[op] = {
      ts: now,
      data: result
    };
    logDebug(`HexDB Route parsed: ${op} | ${originIata} \u2192 ${destIata}`);
    return result;
  } catch (e) {
    hexdbRouteCache[op] = {
      ts: now,
      data: null
    };
    logDebug(`HexDB Route Fehler f\xFCr ${op}: ${errorText(e)}`);
    return null;
  }
}
async function iataFromIcao(adapter, config, icao) {
  icao = clean(icao).toUpperCase();
  if (!icao) {
    return "";
  }
  if (icao === clean(config.airport.icao).toUpperCase()) {
    return clean(config.airport.iata).toUpperCase();
  }
  try {
    const st = await adapter.getForeignStateAsync(config.airportJsonDp);
    const raw = (st == null ? void 0 : st.val) ? String(st.val) : "";
    if (!raw || raw === "[]") {
      return "";
    }
    const airports = JSON.parse(raw);
    if (!Array.isArray(airports)) {
      return "";
    }
    const found = airports.find((a) => clean(a.icao || a.ICAO).toUpperCase() === icao);
    if (!found) {
      return "";
    }
    return clean(found.iata || found.IATA || "").toUpperCase();
  } catch {
    return "";
  }
}
function mergeHexAndFlighteraRoute(hexRoute, flighteraRoute) {
  const flighteraComplete = !!(flighteraRoute == null ? void 0 : flighteraRoute.originIata) && !!(flighteraRoute == null ? void 0 : flighteraRoute.destIata);
  const hexComplete = !!(hexRoute == null ? void 0 : hexRoute.originIata) && !!(hexRoute == null ? void 0 : hexRoute.destIata);
  if (flighteraComplete && (flighteraRoute == null ? void 0 : flighteraRoute.isLive)) {
    return flighteraRoute;
  }
  if (flighteraComplete && !hexComplete) {
    return flighteraRoute;
  }
  if (hexComplete) {
    return hexRoute;
  }
  if (flighteraComplete) {
    return flighteraRoute;
  }
  return hexRoute || flighteraRoute || null;
}
function isIcaoCode(code) {
  code = clean(code).toUpperCase();
  return /^[A-Z]{4}$/.test(code);
}
async function resolveRouteViaFlighteraPlane(registration, operationalCallsign, mode, httpText, logDebug, logWarn, config) {
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
    `https://www.flightera.net/en/planes/${encodeURIComponent(reg)}`
  ];
  for (const url of urls) {
    try {
      logDebug(`Flightera Plane Anfrage EINMALIG: ${cacheKey} \u2192 ${url}`);
      const htmlRaw = await httpText(url);
      const html = normalizeHtml(htmlRaw);
      const text = htmlToText(html);
      const parsed = parseFlighteraPlaneRoute(html, text, op, mode, config, logDebug);
      if ((parsed == null ? void 0 : parsed.originIata) && (parsed == null ? void 0 : parsed.destIata)) {
        flighteraPlaneRouteCache[cacheKey] = {
          ts: now,
          data: parsed
        };
        logDebug(
          `Flightera Plane Route parsed: ${op} | ${parsed.originIata} \u2192 ${parsed.destIata} | routeCallsign=${parsed.routeCallsign || "?"} | live=${parsed.isLive ? "ja" : "nein"}`
        );
        return parsed;
      }
    } catch (e) {
      logWarn(`Flightera Plane Fehler f\xFCr ${cacheKey}: ${errorText(e)}`);
    }
  }
  flighteraPlaneRouteCache[cacheKey] = {
    ts: now,
    data: null
  };
  logDebug(`Flightera Plane keine Route gefunden f\xFCr ${cacheKey}`);
  return null;
}
function parseFlighteraPlaneRoute(html, text, operationalCallsign, mode, config, logDebug) {
  const op = clean(operationalCallsign).toUpperCase();
  const rows = extractFlighteraRowsStrict(html, text, op, mode, config, logDebug);
  const picked = pickBestFlighteraRow(rows, op, mode, config, logDebug);
  if (picked) {
    return {
      routeCallsign: /[A-Z]/.test(picked.routeCallsign || "") ? picked.routeCallsign : op,
      originIata: picked.originIata,
      destIata: picked.destIata,
      isLive: !!picked.isLive
    };
  }
  logDebug("[Flightera] Keine passende Live/Callsign-Zeile \u2192 Route verworfen.");
  return null;
}
function extractFlighteraRowsStrict(html, text, operationalCallsign, mode, config, logDebug) {
  const blocks = [];
  const rows = [];
  function addBlock(raw, source, index) {
    const plain = htmlToText(raw);
    if (!plain || plain.length < 25) {
      return;
    }
    blocks.push({
      text: plain.replace(/\s+/g, " ").trim(),
      source,
      index: index || 0
    });
  }
  let m;
  const trRegex = /<tr[\s\S]*?<\/tr>/gi;
  while ((m = trRegex.exec(String(html || ""))) !== null) {
    addBlock(m[0], "tr", m.index);
  }
  const fullText = String(text || "").replace(/\s+/g, " ").trim();
  const upperText = fullText.toUpperCase();
  const op = clean(operationalCallsign).toUpperCase();
  const opIndex = upperText.indexOf(op);
  if (opIndex >= 0) {
    const start = Math.max(0, opIndex - 500);
    const end = Math.min(fullText.length, opIndex + 1800);
    addBlock(fullText.substring(start, end), "op-live-scope", opIndex);
  } else {
    logDebug(`Flightera op-live-scope: Operational Callsign nicht gefunden: ${op}`);
  }
  const iataLike = operationalToLikelyIataCallsign(op);
  if (iataLike && iataLike !== op) {
    const marketingIndex = upperText.indexOf(iataLike.toUpperCase());
    if (marketingIndex >= 0) {
      const start = Math.max(0, marketingIndex - 500);
      const end = Math.min(fullText.length, marketingIndex + 1800);
      addBlock(fullText.substring(start, end), "marketing-scope", marketingIndex);
    }
  }
  const liveRegex = /\bLIVE\b/gi;
  let liveCount = 0;
  while ((m = liveRegex.exec(fullText)) !== null && liveCount < 5) {
    const liveIndex = m.index;
    const start = Math.max(0, liveIndex - 900);
    const end = Math.min(fullText.length, liveIndex + 2400);
    addBlock(fullText.substring(start, end), "live-fallback", liveIndex);
    liveCount++;
  }
  for (const b of blocks) {
    const row = parseFlighteraSingleRow(b.text, operationalCallsign, mode, b.source, b.index, config);
    if (row) {
      rows.push(row);
    }
  }
  const unique = [];
  const seen = /* @__PURE__ */ new Set();
  for (const r of rows) {
    const key = [
      r.routeCallsign || "",
      r.operationalCallsign || "",
      r.originIata || "",
      r.destIata || "",
      r.isLive ? "live" : "no",
      r.source || ""
    ].join("|");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
    }
  }
  return unique;
}
function parseFlighteraSingleRow(rowText, operationalCallsign, mode, source, index, config) {
  const text = String(rowText || "").replace(/\s+/g, " ").trim();
  const upper = text.toUpperCase();
  const op = clean(operationalCallsign).toUpperCase();
  const iataLike = operationalToLikelyIataCallsign(op);
  const isLive = /\bLIVE\b/i.test(text);
  const containsOp = !!op && upper.indexOf(op) !== -1;
  const containsIataLike = !!iataLike && upper.indexOf(iataLike.toUpperCase()) !== -1;
  const calls = [];
  let cm;
  const callRegex = /\b([A-Z]{2,3}\d{1,4}[A-Z]?)\b/g;
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
  let routeCallsign = "";
  const pairMatches = [...text.matchAll(livePairRegex)];
  for (const pm of pairMatches) {
    const marketing = clean(pm[1]).toUpperCase();
    const operational = clean(pm[2]).toUpperCase();
    if (operational === op) {
      routeCallsign = marketing;
      break;
    }
  }
  if (!routeCallsign) {
    if (calls.includes(iataLike)) {
      routeCallsign = iataLike;
    } else if (calls.length) {
      routeCallsign = calls.find((cs) => /[A-Z]/.test(cs)) || "";
    } else if (containsOp) {
      routeCallsign = op;
    }
  }
  if (!/[A-Z]/.test(routeCallsign)) {
    routeCallsign = containsOp ? op : "";
  }
  const airportPairs = [];
  let m;
  const pairRegex = /([A-Za-zÄÖÜäöüß .'-]+?)\s*\(([A-Z]{3})\s*\/\s*[A-Z]{4}\)/g;
  while ((m = pairRegex.exec(text)) !== null) {
    const code = clean(m[2]).toUpperCase();
    if (isIataCode(code)) {
      airportPairs.push(code);
    }
  }
  let originIata = "";
  let destIata = "";
  if (airportPairs.length >= 2) {
    originIata = airportPairs[0];
    destIata = airportPairs[1];
  } else {
    const codes = [];
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
  if (mode === "TAKEOFF" && originIata !== config.airport.iata) {
    return null;
  }
  if (mode === "LANDING" && destIata !== config.airport.iata) {
    return null;
  }
  return {
    routeCallsign,
    operationalCallsign: containsOp ? op : "",
    originIata,
    destIata,
    isLive,
    containsOp,
    containsIataLike,
    source,
    index
  };
}
function pickBestFlighteraRow(rows, operationalCallsign, mode, config, logDebug) {
  if (!rows.length) {
    return null;
  }
  const op = clean(operationalCallsign).toUpperCase();
  const iataLike = operationalToLikelyIataCallsign(op);
  const scoreAndSort = (list, bonus) => {
    for (const r of list) {
      r.score = scoreFlighteraRow(r, op, iataLike, mode, config) + bonus;
    }
    list.sort((a, b) => (b.score || 0) - (a.score || 0));
    return list[0];
  };
  const liveExact = rows.filter((r) => r.isLive && r.containsOp);
  if (liveExact.length) {
    return scoreAndSort(liveExact, 5e4);
  }
  const liveMarketing = rows.filter((r) => r.isLive && r.containsIataLike);
  if (liveMarketing.length) {
    return scoreAndSort(liveMarketing, 4e4);
  }
  const liveRows = rows.filter((r) => r.isLive);
  if (liveRows.length) {
    return scoreAndSort(liveRows, 3e4);
  }
  const exact = rows.filter((r) => r.containsOp || r.containsIataLike);
  if (exact.length) {
    return scoreAndSort(exact, 1e4);
  }
  logDebug(`Flightera: keine passende Live/Callsign-Zeile f\xFCr ${op}`);
  return null;
}
function scoreFlighteraRow(r, op, iataLike, mode, config) {
  let score = 0;
  if (r.isLive) {
    score += 1e4;
  }
  if (r.containsOp) {
    score += 5e3;
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
  if (mode === "TAKEOFF" && r.originIata === config.airport.iata) {
    score += 1e3;
  }
  if (mode === "LANDING" && r.destIata === config.airport.iata) {
    score += 1e3;
  }
  score -= Math.min(r.index || 0, 2e5) / 1e3;
  return score;
}
async function resolveRouteViaFr24Live(operationalCallsign, mode, httpText, logDebug, logWarn, config) {
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
    logDebug(`FR24 Live Anfrage EINMALIG: ${op} \u2192 ${url}`);
    const htmlRaw = await httpText(url);
    const html = normalizeHtml(htmlRaw);
    const text = htmlToText(html);
    const imageUrl = pickBestFr24Image(collectFr24Images(html));
    const parsed = parseFr24LiveRoute(html, text, op, mode, config);
    const result = parsed || {
      routeCallsign: "",
      originIata: "",
      destIata: ""
    };
    if (imageUrl) {
      result.imageUrl = imageUrl;
    }
    fr24LiveRouteCache[op] = {
      ts: now,
      data: result
    };
    return result;
  } catch (e) {
    fr24LiveRouteCache[op] = {
      ts: now,
      data: null
    };
    logWarn(`FR24 Live Fehler gecached f\xFCr ${op}: ${errorText(e)}`);
    return null;
  }
}
function parseFr24LiveRoute(html, text, operationalCallsign, mode, config) {
  const op = clean(operationalCallsign).toUpperCase();
  const iataLike = operationalToLikelyIataCallsign(op);
  const fullText = String(text || "").replace(/\s+/g, " ").trim();
  const upper = fullText.toUpperCase();
  let scope = fullText;
  let idx = upper.indexOf(op);
  if (idx < 0 && iataLike) {
    idx = upper.indexOf(iataLike.toUpperCase());
  }
  if (idx >= 0) {
    const start = Math.max(0, idx - 700);
    const end = Math.min(fullText.length, idx + 2e3);
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
function parseRouteFromAirportPairs(scope, operationalCallsign, mode, config) {
  const text = String(scope || "").replace(/\s+/g, " ").trim();
  const pairs = [];
  let m;
  const pairRegex = /([A-Za-zÄÖÜäöüß .'-]+?)\s*\(([A-Z]{3})\s*\/\s*[A-Z]{4}\)/g;
  while ((m = pairRegex.exec(text)) !== null) {
    const code = clean(m[2]).toUpperCase();
    if (isIataCode(code)) {
      pairs.push(code);
    }
  }
  if (pairs.length < 2) {
    return null;
  }
  let originIata = "";
  let destIata = "";
  if (mode === "TAKEOFF") {
    const aptIndex = pairs.indexOf(config.airport.iata);
    if (aptIndex >= 0 && pairs[aptIndex + 1]) {
      originIata = config.airport.iata;
      destIata = pairs[aptIndex + 1];
    }
  } else if (mode === "LANDING") {
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
  if (mode === "TAKEOFF" && originIata !== config.airport.iata) {
    return null;
  }
  if (mode === "LANDING" && destIata !== config.airport.iata) {
    return null;
  }
  return {
    routeCallsign: findBestMarketingCallsign(text, operationalCallsign),
    originIata,
    destIata
  };
}
function parseJsonLikeRouteFromHtml(html, operationalCallsign, mode, config) {
  html = normalizeHtml(html);
  const iataHits = [];
  let m;
  const iataRegexes = [
    /"iata"\s*:\s*"([A-Z]{3})"/g,
    /"iataCode"\s*:\s*"([A-Z]{3})"/g,
    /"iata_code"\s*:\s*"([A-Z]{3})"/g
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
  let originIata = "";
  let destIata = "";
  if (mode === "TAKEOFF") {
    const aptIndex = iataHits.indexOf(config.airport.iata);
    if (aptIndex >= 0 && iataHits[aptIndex + 1]) {
      originIata = config.airport.iata;
      destIata = iataHits[aptIndex + 1];
    }
  } else if (mode === "LANDING") {
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
    destIata
  };
}
async function resolveImageViaFr24Aircraft(registration, operationalCallsign, httpText, logDebug, logWarn) {
  const reg = clean(registration).toLowerCase();
  const op = clean(operationalCallsign).toUpperCase();
  if (!reg) {
    return "";
  }
  const now = Date.now();
  const cached = fr24AircraftCache[reg];
  if (cached && now - cached.ts < CACHE.fr24Ms) {
    logDebug(`FR24 Bild Cache hit: ${reg}`);
    return cached.imageUrl || "";
  }
  const url = `https://www.flightradar24.com/data/aircraft/${encodeURIComponent(reg)}`;
  try {
    logDebug(`FR24 Aircraft Bild Anfrage EINMALIG: ${reg} / ${op} \u2192 ${url}`);
    const htmlRaw = await httpText(url);
    const html = normalizeHtml(htmlRaw);
    const imageUrl = pickBestFr24Image(collectFr24Images(html));
    fr24AircraftCache[reg] = {
      ts: now,
      imageUrl: imageUrl || ""
    };
    return imageUrl || "";
  } catch (e) {
    fr24AircraftCache[reg] = {
      ts: now,
      imageUrl: ""
    };
    logWarn(`FR24 Bild Fehler gecached f\xFCr ${reg}: ${errorText(e)}`);
    return "";
  }
}
async function applyAirportNamesFromJson(adapter, config, parsed, logWarn) {
  const originName = parsed.originIata ? await cityNameFromIata(adapter, config, parsed.originIata, logWarn) : "";
  const destName = parsed.destIata ? await cityNameFromIata(adapter, config, parsed.destIata, logWarn) : "";
  parsed.originName = originName;
  parsed.destName = destName;
  if (parsed.originIata && parsed.destIata) {
    parsed.routeText = `${parsed.originIata} \u2192 ${parsed.destIata}`;
  }
  if (originName && destName) {
    parsed.routeTextLong = `${originName} \u2192 ${destName}`;
  } else if (originName && !destName && parsed.destIata) {
    parsed.routeTextLong = `${originName} \u2192 ${parsed.destIata}`;
  } else if (!originName && destName && parsed.originIata) {
    parsed.routeTextLong = `${parsed.originIata} \u2192 ${destName}`;
  } else {
    parsed.routeTextLong = "";
  }
  return parsed;
}
async function cityNameFromIata(adapter, config, iata, logWarn) {
  const lang = await getSystemLanguage(adapter);
  const useGermanNames = lang.toLowerCase().startsWith("de");
  const code = clean(iata).toUpperCase();
  if (!code) {
    return "";
  }
  try {
    const st = await adapter.getForeignStateAsync(config.airportJsonDp);
    const raw = (st == null ? void 0 : st.val) ? String(st.val) : "";
    if (!raw || raw === "[]") {
      return code;
    }
    const airports = JSON.parse(raw);
    if (!Array.isArray(airports)) {
      return code;
    }
    const found = airports.find((a) => clean(a.iata || a.IATA).toUpperCase() === code);
    if (!found) {
      return code;
    }
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
      return airport.replace(/international airport/gi, "").replace(/international/gi, "").replace(/airport/gi, "").replace(/\s+/g, " ").trim();
    }
    return code;
  } catch (e) {
    logWarn(`airportjson Lookup Fehler f\xFCr ${code}: ${errorText(e)}`);
    return code;
  }
}
async function getSystemLanguage(adapter) {
  var _a, _b;
  try {
    const obj = await adapter.getForeignObjectAsync("system.config");
    return String(((_a = obj == null ? void 0 : obj.common) == null ? void 0 : _a.language) || ((_b = obj == null ? void 0 : obj.native) == null ? void 0 : _b.language) || "").trim();
  } catch {
    return "";
  }
}
function makeUnknownAirportRoute(mode, parsed, config) {
  const A = config.airport.iata;
  if (mode === "TAKEOFF") {
    return {
      ...parsed,
      originIata: A,
      destIata: "",
      originName: "",
      destName: "",
      routeText: `${A} \u2192 ?`,
      routeTextLong: "",
      routeReliable: false,
      routeWarning: "Ziel unbekannt",
      routeSource: "no-route"
    };
  }
  if (mode === "LANDING") {
    return {
      ...parsed,
      originIata: "",
      destIata: A,
      originName: "",
      destName: "",
      routeText: `? \u2192 ${A}`,
      routeTextLong: "",
      routeReliable: false,
      routeWarning: "Start unbekannt",
      routeSource: "no-route"
    };
  }
  return {
    ...parsed,
    originIata: "",
    destIata: "",
    routeText: "",
    routeTextLong: "",
    routeReliable: false,
    routeWarning: "Route unbekannt",
    routeSource: "no-route"
  };
}
function collectFr24Images(html) {
  html = normalizeHtml(html);
  const found = [];
  function add(url) {
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
  let m;
  const regexes = [
    /<img[^>]+src=["']([^"']+)["'][^>]*alt=["'][^"']*(?:aircraft|plane|photo|picture)[^"']*["']/gi,
    /<img[^>]+alt=["'][^"']*(?:aircraft|plane|photo|picture)[^"']*["'][^>]+src=["']([^"']+)["']/gi,
    /https?:\/\/[^"'<> ]+\.(?:jpg|jpeg|webp|png)(?:\?[^"'<> ]*)?/gi,
    /src=["']([^"']+\.(?:jpg|jpeg|webp|png)(?:\?[^"']*)?)["']/gi,
    /content=["']([^"']+\.(?:jpg|jpeg|webp|png)(?:\?[^"']*)?)["']/gi
  ];
  for (const re of regexes) {
    while ((m = re.exec(html)) !== null) {
      add(m[1] || m[0]);
    }
  }
  return found;
}
function pickBestFr24Image(images) {
  if (!images.length) {
    return "";
  }
  return images.sort((a, b) => scoreFr24Image(b) - scoreFr24Image(a))[0];
}
function scoreFr24Image(url) {
  url = String(url || "").toLowerCase();
  let score = 0;
  if (url.includes("fr24")) {
    score += 60;
  }
  if (url.includes("cdn")) {
    score += 50;
  }
  if (url.includes("aircraft")) {
    score += 50;
  }
  if (url.includes("large")) {
    score += 40;
  }
  if (url.includes("full")) {
    score += 40;
  }
  if (url.includes("photo")) {
    score += 20;
  }
  if (url.includes("thumb")) {
    score -= 80;
  }
  if (url.includes("small")) {
    score -= 50;
  }
  if (url.includes("logo") || url.includes("icon")) {
    score -= 100;
  }
  return score;
}
function buildSpecialInfo(a) {
  const model = String(a.aircraftModel || a.aircraftType || a.type || "").toUpperCase();
  const callsign = String(a.callsign || "").toUpperCase();
  const tags = [];
  let score = 0;
  if (/A38/i.test(model)) {
    tags.push("Airbus A380");
    score += 10;
  }
  if (/B74/i.test(model)) {
    tags.push("Boeing 747");
    score += 8;
  }
  if (containsAny(model, ["BELUGA"])) {
    tags.push("Airbus Beluga");
    score += 10;
  }
  if (containsAny(model, ["AN-124", "ANTONOV", "AN225", "AN-225"])) {
    tags.push("Antonov");
    score += 10;
  }
  if (containsAny(callsign, ["GAF", "GOV", "BAF", "NAF", "RCH", "IAM"])) {
    tags.push("Regierungs-/Milit\xE4rflug");
    score += 8;
  }
  return {
    isSpecial: score >= 8,
    specialText: tags.length ? tags.join(", ") : ""
  };
}
function guessAirlineIata(callsign) {
  callsign = clean(callsign).toUpperCase();
  const map = {
    DLH: "LH",
    CFG: "DE",
    CPA: "CX",
    KAL: "KE",
    GEC: "LH",
    BOX: "3S",
    EWG: "EW",
    RYR: "FR",
    EZY: "U2",
    BAW: "BA",
    KLM: "KL",
    AFR: "AF",
    SWR: "LX",
    AUA: "OS",
    SIA: "SQ",
    THY: "TK",
    UAE: "EK",
    QTR: "QR",
    CCA: "CA",
    ROT: "RO",
    SAS: "SK",
    SEH: "GQ"
  };
  return map[callsign.substring(0)] || "";
}
function guessAirlineIcao(callsign) {
  callsign = clean(callsign).toUpperCase();
  return callsign.length >= 3 ? callsign.substring(0, 3) : "";
}
function guessAirlineName(callsign) {
  callsign = clean(callsign).toUpperCase();
  if (callsign.startsWith("DLH")) {
    return "Lufthansa";
  }
  if (callsign.startsWith("CFG")) {
    return "Condor";
  }
  if (callsign.startsWith("CPA")) {
    return "Cathay Pacific";
  }
  if (callsign.startsWith("KAL")) {
    return "Korean Air Cargo";
  }
  if (callsign.startsWith("GEC")) {
    return "Lufthansa Cargo";
  }
  if (callsign.startsWith("BOX")) {
    return "AeroLogic";
  }
  if (callsign.startsWith("EWG")) {
    return "Eurowings";
  }
  if (callsign.startsWith("RYR")) {
    return "Ryanair";
  }
  if (callsign.startsWith("EZY")) {
    return "easyJet";
  }
  if (callsign.startsWith("BAW")) {
    return "British Airways";
  }
  if (callsign.startsWith("KLM")) {
    return "KLM";
  }
  if (callsign.startsWith("AFR")) {
    return "Air France";
  }
  if (callsign.startsWith("SWR")) {
    return "SWISS";
  }
  if (callsign.startsWith("AUA")) {
    return "Austrian";
  }
  if (callsign.startsWith("SIA")) {
    return "Singapore Airlines";
  }
  if (callsign.startsWith("THY")) {
    return "Turkish Airlines";
  }
  if (callsign.startsWith("UAE")) {
    return "Emirates";
  }
  if (callsign.startsWith("QTR")) {
    return "Qatar Airways";
  }
  if (callsign.startsWith("CCA")) {
    return "Air China";
  }
  if (callsign.startsWith("ROT")) {
    return "TAROM";
  }
  if (callsign.startsWith("SAS")) {
    return "SAS";
  }
  if (callsign.startsWith("SEH")) {
    return "Sky Express";
  }
  return "";
}
function operationalToLikelyIataCallsign(callsign) {
  callsign = clean(callsign).toUpperCase();
  const map = {
    DLH: "LH",
    CFG: "DE",
    CPA: "CX",
    KAL: "KE",
    GEC: "LH",
    BOX: "3S",
    EWG: "EW",
    RYR: "FR",
    EZY: "U2",
    BAW: "BA",
    KLM: "KL",
    AFR: "AF",
    SWR: "LX",
    AUA: "OS",
    SIA: "SQ",
    THY: "TK",
    UAE: "EK",
    QTR: "QR",
    ETD: "EY",
    IBE: "IB",
    TAP: "TP",
    SAS: "SK",
    FIN: "AY",
    LOT: "LO",
    CCA: "CA",
    ROT: "RO",
    SEH: "GQ"
  };
  const prefix = callsign.substring(0, 3);
  const rest = callsign.substring(3);
  if (map[prefix] && rest) {
    return map[prefix] + rest;
  }
  return callsign;
}
function findBestMarketingCallsign(text, operationalCallsign) {
  const op = clean(operationalCallsign).toUpperCase();
  const iataLike = operationalToLikelyIataCallsign(op);
  const upper = String(text || "").toUpperCase();
  if (iataLike && upper.includes(iataLike)) {
    return iataLike;
  }
  const calls = [];
  let m;
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
  return calls.length ? calls[0] : "";
}
function looksLikeMarketingCallsign(cs) {
  cs = clean(cs).toUpperCase();
  if (!/^[A-Z0-9]{2}\d{1,4}[A-Z]?$/.test(cs)) {
    return false;
  }
  if (/^[A-Z]{3}\d/.test(cs)) {
    return false;
  }
  return true;
}
function isIataCode(code) {
  code = clean(code).toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    return false;
  }
  const bad = [
    "THE",
    "AND",
    "FOR",
    "YOU",
    "ARE",
    "NOT",
    "YES",
    "NEW",
    "OLD",
    "AIR",
    "API",
    "APP",
    "MAP",
    "UTC",
    "ETA",
    "STD",
    "STA",
    "ATD",
    "ATA",
    "IMG",
    "PNG",
    "JPG",
    "WEB",
    "CSS",
    "DIV",
    "SVG",
    "WWW",
    "TOP",
    "VAR",
    "REL",
    "ORG",
    "USE",
    "DAY",
    "PER",
    "MMM",
    "MAY",
    "BTN",
    "HEX",
    "NET",
    "SRC",
    "PAN",
    "COL",
    "VON",
    "NACH",
    "ABF",
    "ANK",
    "LIVE"
  ];
  return !bad.includes(code);
}
function normalizeHtml(html) {
  return String(html || "").replace(/\\\//g, "/").replace(/&amp;/g, "&").replace(/&#x2F;/g, "/").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\\u002F/g, "/").replace(/\\/g, "");
}
function htmlToText(html) {
  return decodeHtml(html).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<br\s*\/?>/gi, " ").replace(/<\/(?:tr|td|th|div|section|article|li|p)>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function decodeHtml(s) {
  return String(s || "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&rarr;/g, "\u2192").replace(/&#8594;/g, "\u2192").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
function normalizeImageUrl(url) {
  return String(url || "").replace(/\\\//g, "/").replace(/&amp;/g, "&").replace(/&#x2F;/g, "/").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}
function containsAny(text, arr) {
  text = String(text || "").toUpperCase();
  return arr.some((x) => text.includes(String(x).toUpperCase()));
}
function clean(v) {
  return String(v || "").trim();
}
function errorText(e) {
  if (!e) {
    return "unbekannter Fehler";
  }
  if (typeof e === "string") {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  enrichFlightInfo,
  resolveImageViaFr24Aircraft
});
//# sourceMappingURL=flightInfo.js.map
