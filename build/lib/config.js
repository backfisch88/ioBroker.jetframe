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
var config_exports = {};
__export(config_exports, {
  readConfig: () => readConfig
});
module.exports = __toCommonJS(config_exports);
function cfgStr(native, key, def) {
  const v = native[key];
  return v !== void 0 && v !== null && String(v).trim() !== "" ? String(v).trim() : def;
}
function cfgNum(native, key, def) {
  const n = Number(native[key]);
  return Number.isFinite(n) ? n : def;
}
function cfgBool(native, key, def) {
  const v = native[key];
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  return def;
}
function readConfig(adapter) {
  const native = adapter.config;
  return {
    enabled: cfgBool(native, "enabled", true),
    homeLat: cfgNum(native, "homeLat", 50.08637),
    homeLon: cfgNum(native, "homeLon", 8.69163),
    airport: {
      iata: cfgStr(native, "airportIata", "FRA").toUpperCase(),
      icao: cfgStr(native, "airportIcao", "EDDF").toUpperCase(),
      name: cfgStr(native, "airportName", "Frankfurt"),
      lat: cfgNum(native, "airportLat", 50.035686),
      lon: cfgNum(native, "airportLon", 8.562813)
    },
    radiusNm: cfgNum(native, "radiusNm", 15),
    adsbCustomUrl: cfgStr(native, "adsbCustomUrl", ""),
    maxHomeDistanceNm: cfgNum(native, "maxHomeDistanceNm", 3.5),
    searchPollSeconds: cfgNum(native, "searchPollSeconds", 20),
    livePollSeconds: cfgNum(native, "livePollSeconds", 5),
    liveMaxSeconds: cfgNum(native, "liveMaxSeconds", 120),
    windowBearingDeg: cfgNum(native, "windowBearingDeg", 184),
    windowFovDeg: cfgNum(native, "windowFovDeg", 120),
    minAltitudeFt: cfgNum(native, "minAltitudeFt", 1e3),
    maxAltitudeFt: cfgNum(native, "maxAltitudeFt", 5e3),
    autoRunwayTrackToleranceDeg: cfgNum(native, "autoRunwayTrackToleranceDeg", 65),
    minClimbRate: cfgNum(native, "minClimbRate", 60),
    minSinkRate: cfgNum(native, "minSinkRate", -60),
    overflightEnabled: cfgBool(native, "overflightEnabled", false),
    overflightOnly: cfgBool(native, "overflightOnly", false),
    overflightMaxDistanceNm: cfgNum(native, "overflightMaxDistanceNm", 1.2),
    overflightMinAltitudeFt: cfgNum(native, "overflightMinAltitudeFt", 4e3),
    overflightMaxAltitudeFt: cfgNum(native, "overflightMaxAltitudeFt", 45e3),
    overflightRequiresWindow: cfgBool(native, "overflightRequiresWindow", false),
    speechEnabled: cfgBool(native, "speechEnabled", true),
    speechMode: cfgStr(
      native,
      "speechMode",
      "browser"
    ),
    speechTemplate: cfgStr(
      native,
      "speechTemplate",
      "{modeSpeechText}: {airlineName} {bestCallsign} {routeDirectionText} {routeOtherAirport} in {altitudeFt} Fuss. {windowPositionSpeechText}."
    ),
    dpRoot: adapter.namespace,
    airportJsonDp: `${adapter.namespace}.airportjson`
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  readConfig
});
//# sourceMappingURL=config.js.map
