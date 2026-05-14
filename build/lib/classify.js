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
var classify_exports = {};
__export(classify_exports, {
  classifyAircraft: () => classifyAircraft,
  enrichAircraft: () => enrichAircraft,
  findCurrentLive: () => findCurrentLive,
  flightKey: () => flightKey,
  getMatches: () => getMatches,
  isDifferentAircraft: () => isDifferentAircraft
});
module.exports = __toCommonJS(classify_exports);
var import_geo = require("./geo");
function enrichAircraft(config, a) {
  const bearingHomeDeg = (0, import_geo.bearingDeg)(
    config.homeLat,
    config.homeLon,
    a.lat,
    a.lon
  );
  const distHomeNm = (0, import_geo.distanceNm)(
    config.homeLat,
    config.homeLon,
    a.lat,
    a.lon
  );
  const distAirportNm = (0, import_geo.distanceNm)(
    config.airport.lat,
    config.airport.lon,
    a.lat,
    a.lon
  );
  const bearingAircraftToAirportDeg = (0, import_geo.bearingDeg)(
    a.lat,
    a.lon,
    config.airport.lat,
    config.airport.lon
  );
  const bearingAirportToAircraftDeg = (0, import_geo.bearingDeg)(
    config.airport.lat,
    config.airport.lon,
    a.lat,
    a.lon
  );
  const landingTrackDiffDeg = (0, import_geo.smallestAngleDiff)(
    a.trackDeg,
    bearingAircraftToAirportDeg
  );
  const takeoffTrackDiffDeg = (0, import_geo.smallestAngleDiff)(
    a.trackDeg,
    bearingAirportToAircraftDeg
  );
  const airportTrackDiffDeg = Math.min(
    landingTrackDiffDeg,
    takeoffTrackDiffDeg
  );
  const windowDiffDeg = (0, import_geo.signedAngleDiff)(
    bearingHomeDeg,
    config.windowBearingDeg
  );
  const windowDiffAbsDeg = Math.abs(windowDiffDeg);
  return {
    ...a,
    bearingHomeDeg,
    distHomeNm,
    distAirportNm,
    bearingAircraftToAirportDeg,
    bearingAirportToAircraftDeg,
    landingTrackDiffDeg,
    takeoffTrackDiffDeg,
    airportTrackDiffDeg,
    windowDiffDeg,
    windowDiffAbsDeg,
    inWindow: windowDiffAbsDeg <= config.windowFovDeg / 2
  };
}
function classifyAircraft(config, a) {
  const isLanding = (a.verticalRate || 0) <= config.minSinkRate && (a.landingTrackDiffDeg || 999) <= config.autoRunwayTrackToleranceDeg;
  const isTakeoff = (a.verticalRate || 0) >= config.minClimbRate && (a.takeoffTrackDiffDeg || 999) <= config.autoRunwayTrackToleranceDeg;
  if (isLanding) {
    return {
      ...a,
      mode: "LANDING",
      icon: "\u{1F6EC}",
      directionText: `nach ${config.airport.iata}`,
      relevant: true,
      priority: 1
    };
  }
  if (isTakeoff) {
    return {
      ...a,
      mode: "TAKEOFF",
      icon: "\u{1F6EB}",
      directionText: `von ${config.airport.iata}`,
      relevant: true,
      priority: 2
    };
  }
  const isOverflight = (config.overflightOnly || config.overflightEnabled) && (a.distHomeNm || 999) <= config.overflightMaxDistanceNm && a.altFt >= config.overflightMinAltitudeFt && a.altFt <= config.overflightMaxAltitudeFt && (!config.overflightRequiresWindow || !!a.inWindow);
  if (isOverflight) {
    return {
      ...a,
      mode: "OVERFLIGHT",
      icon: "\u{1F6E9}\uFE0F",
      directionText: "\xDCberflug",
      relevant: true,
      priority: 3
    };
  }
  return {
    ...a,
    relevant: false
  };
}
function getMatches(config, aircraft) {
  const enriched = aircraft.map((a) => enrichAircraft(config, a));
  if (config.overflightOnly) {
    return enriched.filter(
      (a) => (a.distHomeNm || 999) <= config.overflightMaxDistanceNm && a.altFt >= config.overflightMinAltitudeFt && a.altFt <= config.overflightMaxAltitudeFt && (!config.overflightRequiresWindow || !!a.inWindow)
    ).map((a) => ({
      ...a,
      mode: "OVERFLIGHT",
      icon: "\u{1F6E9}\uFE0F",
      directionText: "\xDCberflug",
      relevant: true,
      priority: 1
    })).sort(sortOverflightAircraft);
  }
  return enriched.filter((a) => {
    if (a.inWindow) return true;
    if (config.overflightEnabled && !config.overflightRequiresWindow && (a.distHomeNm || 999) <= config.overflightMaxDistanceNm && a.altFt >= config.overflightMinAltitudeFt && a.altFt <= config.overflightMaxAltitudeFt) {
      return true;
    }
    return false;
  }).filter((a) => {
    if (config.overflightEnabled && !config.overflightRequiresWindow && (a.distHomeNm || 999) <= config.overflightMaxDistanceNm && a.altFt >= config.overflightMinAltitudeFt && a.altFt <= config.overflightMaxAltitudeFt) {
      return true;
    }
    return (a.distHomeNm || 999) <= config.maxHomeDistanceNm;
  }).filter((a) => {
    if (config.overflightEnabled && !config.overflightRequiresWindow && (a.distHomeNm || 999) <= config.overflightMaxDistanceNm && a.altFt >= config.overflightMinAltitudeFt && a.altFt <= config.overflightMaxAltitudeFt) {
      return true;
    }
    return a.altFt >= config.minAltitudeFt && a.altFt <= config.maxAltitudeFt;
  }).map((a) => classifyAircraft(config, a)).filter((a) => a.relevant).sort(sortAircraft);
}
function sortOverflightAircraft(a, b) {
  const sa = (a.distHomeNm || 999) * 1e3 + Math.abs(a.windowDiffDeg || 0) * 20 + (a.seenSec || 0) * 5 + a.altFt / 50;
  const sb = (b.distHomeNm || 999) * 1e3 + Math.abs(b.windowDiffDeg || 0) * 20 + (b.seenSec || 0) * 5 + b.altFt / 50;
  return sa - sb;
}
function sortAircraft(a, b) {
  if ((a.priority || 99) !== (b.priority || 99)) {
    return (a.priority || 99) - (b.priority || 99);
  }
  const sa = (a.distHomeNm || 0) * 250 + a.altFt + Math.abs(a.windowDiffDeg || 0) * 25 + (a.airportTrackDiffDeg || 0) * 8;
  const sb = (b.distHomeNm || 0) * 250 + b.altFt + Math.abs(b.windowDiffDeg || 0) * 25 + (b.airportTrackDiffDeg || 0) * 8;
  return sa - sb;
}
function findCurrentLive(matches, target) {
  if (!matches.length || !target) return null;
  const targetHex = clean(target.hex).toLowerCase();
  const targetCall = clean(target.callsign).toUpperCase();
  return matches.find((a) => {
    const aHex = clean(a.hex).toLowerCase();
    const aCall = clean(a.callsign).toUpperCase();
    if (aHex && targetHex && aHex === targetHex) return true;
    if (aCall && targetCall && aCall === targetCall) return true;
    return false;
  }) || null;
}
function isDifferentAircraft(a, target) {
  if (!a || !target) return false;
  const aHex = clean(a.hex).toLowerCase();
  const tHex = clean(target.hex).toLowerCase();
  const aCall = clean(a.callsign).toUpperCase();
  const tCall = clean(target.callsign).toUpperCase();
  if (aCall && tCall && aCall === tCall) return false;
  if (aHex && tHex && aHex === tHex) return false;
  if (aCall && tCall) return aCall !== tCall;
  if (aHex && tHex) return aHex !== tHex;
  return false;
}
function flightKey(a) {
  if (!a) return "";
  const hex = clean(a.hex).toLowerCase();
  const cs = clean(a.callsign).toUpperCase();
  if (cs) return `CS:${cs}`;
  if (hex) return `HEX:${hex}`;
  return "";
}
function clean(v) {
  return String(v || "").trim();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  classifyAircraft,
  enrichAircraft,
  findCurrentLive,
  flightKey,
  getMatches,
  isDifferentAircraft
});
//# sourceMappingURL=classify.js.map
