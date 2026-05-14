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
var adsb_exports = {};
__export(adsb_exports, {
  fetchAdsb: () => fetchAdsb,
  parseAircraft: () => parseAircraft
});
module.exports = __toCommonJS(adsb_exports);
function clean(v) {
  return String(v || "").trim();
}
function toNumber(v) {
  if (v === null || v === void 0 || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function parseAltitude(v) {
  if (v === null || v === void 0) return 0;
  if (typeof v === "string") {
    if (v.toLowerCase() === "ground") return 0;
    const n2 = Number(v);
    return Number.isFinite(n2) ? n2 : 0;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
async function fetchAdsb(config, httpJsonRaw, logWarn) {
  const urls = buildAdsbUrls(config);
  const aircraftByKey = {};
  for (const url of urls) {
    let body = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        body = await httpJsonRaw(url);
        break;
      } catch (e) {
        logWarn(`ADSB Fehler Versuch ${attempt}: ${errorText(e)} | ${url}`);
        if (attempt < 2) {
          await sleep(1500);
        }
      }
    }
    const arr = Array.isArray(body == null ? void 0 : body.aircraft) ? body.aircraft : Array.isArray(body == null ? void 0 : body.ac) ? body.ac : [];
    for (const item of arr) {
      const key = clean(
        item.hex || item.icao || item.flight || item.call || item.callsign || `${item.lat}_${item.lon}_${item.alt_baro || item.alt_geom || ""}`
      ).toLowerCase();
      if (!key) continue;
      aircraftByKey[key] = item;
    }
  }
  return {
    aircraft: Object.values(aircraftByKey)
  };
}
function buildAdsbUrls(config) {
  var _a, _b, _c, _d, _e, _f;
  const anyConfig = config;
  const customUrl = clean(
    anyConfig.adsbCustomUrl || anyConfig.customAdsbUrl || ""
  );
  if (customUrl) {
    return [
      replaceAdsbUrlTokens(customUrl, config)
    ];
  }
  const airportLat = Number(
    (_c = (_b = (_a = anyConfig.airport) == null ? void 0 : _a.lat) != null ? _b : anyConfig.airportLat) != null ? _c : config.homeLat
  );
  const airportLon = Number(
    (_f = (_e = (_d = anyConfig.airport) == null ? void 0 : _d.lon) != null ? _e : anyConfig.airportLon) != null ? _f : config.homeLon
  );
  const airportRadiusNm = Math.max(
    Number(anyConfig.radiusNm || 0),
    1
  );
  const urls = [
    `https://api.adsb.lol/v2/lat/${airportLat}/lon/${airportLon}/dist/${airportRadiusNm}`
  ];
  if (anyConfig.overflightEnabled || anyConfig.overflightOnly) {
    const homeRadiusNm = Math.max(
      Number(anyConfig.overflightMaxDistanceNm || 0),
      1
    );
    const homeUrl = `https://api.adsb.lol/v2/lat/${config.homeLat}/lon/${config.homeLon}/dist/${homeRadiusNm}`;
    if (!urls.includes(homeUrl)) {
      urls.push(homeUrl);
    }
  }
  return urls;
}
function replaceAdsbUrlTokens(url, config) {
  var _a, _b, _c, _d, _e, _f;
  const anyConfig = config;
  const airportLat = String(
    (_c = (_b = (_a = anyConfig.airport) == null ? void 0 : _a.lat) != null ? _b : anyConfig.airportLat) != null ? _c : config.homeLat
  );
  const airportLon = String(
    (_f = (_e = (_d = anyConfig.airport) == null ? void 0 : _d.lon) != null ? _e : anyConfig.airportLon) != null ? _f : config.homeLon
  );
  const airportRadiusNm = String(
    anyConfig.radiusNm || 15
  );
  const overflightRadiusNm = String(
    anyConfig.overflightMaxDistanceNm || airportRadiusNm
  );
  return String(url || "").replace(/\{homeLat\}/g, String(config.homeLat)).replace(/\{homeLon\}/g, String(config.homeLon)).replace(/\{airportLat\}/g, airportLat).replace(/\{airportLon\}/g, airportLon).replace(/\{radiusNm\}/g, airportRadiusNm).replace(/\{airportRadiusNm\}/g, airportRadiusNm).replace(/\{overflightRadiusNm\}/g, overflightRadiusNm);
}
function parseAircraft(body) {
  if (!body) return [];
  const arr = Array.isArray(body.aircraft) ? body.aircraft : Array.isArray(body.ac) ? body.ac : [];
  return arr.map((a) => {
    var _a, _b, _c, _d, _e, _f;
    return {
      hex: clean(a.hex || ""),
      callsign: clean(a.flight || a.call || a.callsign || ""),
      type: clean(a.t || a.type || ""),
      registration: clean(a.r || a.reg || ""),
      lat: (_a = toNumber(a.lat)) != null ? _a : 0,
      lon: (_b = toNumber(a.lon)) != null ? _b : 0,
      altFt: parseAltitude(a.alt_baro || a.alt_geom || a.altitude),
      speedKt: (_c = toNumber(a.gs || a.spd || a.speed)) != null ? _c : 0,
      trackDeg: (_d = toNumber(a.track || a.trak || a.heading)) != null ? _d : 0,
      verticalRate: (_e = toNumber(a.baro_rate || a.geom_rate || a.vsi)) != null ? _e : 0,
      seenSec: (_f = toNumber(a.seen || a.seen_pos || 0)) != null ? _f : 999
    };
  }).filter(
    (a) => Number.isFinite(a.lat) && Number.isFinite(a.lon) && a.lat !== 0 && a.lon !== 0 && Number.isFinite(a.seenSec) && a.seenSec <= 90
  );
}
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
function errorText(e) {
  if (!e) return "unbekannter Fehler";
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  fetchAdsb,
  parseAircraft
});
//# sourceMappingURL=adsb.js.map
