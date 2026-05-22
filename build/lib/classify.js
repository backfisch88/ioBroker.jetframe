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
  const bearingHomeDeg = (0, import_geo.bearingDeg)(config.homeLat, config.homeLon, a.lat, a.lon);
  const distHomeNm = (0, import_geo.distanceNm)(config.homeLat, config.homeLon, a.lat, a.lon);
  const distAirportNm = (0, import_geo.distanceNm)(config.airport.lat, config.airport.lon, a.lat, a.lon);
  const bearingAircraftToAirportDeg = (0, import_geo.bearingDeg)(a.lat, a.lon, config.airport.lat, config.airport.lon);
  const bearingAirportToAircraftDeg = (0, import_geo.bearingDeg)(config.airport.lat, config.airport.lon, a.lat, a.lon);
  const landingTrackDiffDeg = (0, import_geo.smallestAngleDiff)(a.trackDeg, bearingAircraftToAirportDeg);
  const takeoffTrackDiffDeg = (0, import_geo.smallestAngleDiff)(a.trackDeg, bearingAirportToAircraftDeg);
  const airportTrackDiffDeg = Math.min(landingTrackDiffDeg, takeoffTrackDiffDeg);
  const windowDiffDeg = (0, import_geo.signedAngleDiff)(bearingHomeDeg, config.windowBearingDeg);
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
  const enriched = aircraft.map((a) => enrichEmergency(config, enrichAircraft(config, a)));
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
    })).sort((a, b) => sortOverflightAircraft(config, a, b));
  }
  return enriched.filter((a) => {
    const isAllowedOverflight = config.overflightEnabled && !config.overflightRequiresWindow && (a.distHomeNm || 999) <= config.overflightMaxDistanceNm && a.altFt >= config.overflightMinAltitudeFt && a.altFt <= config.overflightMaxAltitudeFt;
    if (isAllowedOverflight) {
      return true;
    }
    if (!a.inWindow) {
      return false;
    }
    if ((a.distHomeNm || 999) > config.maxHomeDistanceNm) {
      return false;
    }
    if (a.altFt < config.minAltitudeFt || a.altFt > config.maxAltitudeFt) {
      return false;
    }
    return true;
  }).map((a) => classifyAircraft(config, a)).filter((a) => {
    if (!a.relevant) {
      return false;
    }
    if (a.mode === "OVERFLIGHT" && !config.overflightEnabled) {
      return false;
    }
    return true;
  }).sort((a, b) => sortAircraft(config, a, b));
}
function enrichEmergency(config, a) {
  const squawk = String(a.squawk || "").trim();
  const emergency = String(a.emergency || "").trim().toLowerCase();
  let emergencyType = "";
  let emergencyText = "";
  if (squawk === "7500" && config.emergencySquawk7500) {
    emergencyType = "HIJACK";
    emergencyText = "Besonderer Notfall-Code 7500";
  } else if (squawk === "7600" && config.emergencySquawk7600) {
    emergencyType = "RADIO";
    emergencyText = "Funkausfall Squawk 7600";
  } else if (squawk === "7700" && config.emergencySquawk7700) {
    emergencyType = "EMERGENCY";
    emergencyText = "Allgemeiner Notfall Squawk 7700";
  } else if (emergency && emergency !== "none") {
    emergencyType = emergency.toUpperCase();
    emergencyText = `Emergency: ${emergency}`;
  }
  return {
    ...a,
    isEmergency: !!emergencyType,
    emergencyType,
    emergencyText
  };
}
function emergencyBonus(config, a) {
  if (!config.emergencyPriorityEnabled || !a.isEmergency) {
    return 0;
  }
  const squawk = String(a.squawk || "").trim();
  if (squawk === "7500") {
    return 1e5;
  }
  if (squawk === "7700") {
    return 9e4;
  }
  if (squawk === "7600") {
    return 8e4;
  }
  return 7e4;
}
function sortOverflightAircraft(config, a, b) {
  return candidateScore(config, b) - candidateScore(config, a);
}
function sortAircraft(config, a, b) {
  return candidateScore(config, b) - candidateScore(config, a);
}
function candidateScore(config, a) {
  let score = 0;
  score += priorityBonus(config, a);
  if (a.mode === "LANDING") {
    score += 9e3;
  }
  if (a.mode === "TAKEOFF") {
    score += 7500;
  }
  if (a.mode === "OVERFLIGHT") {
    score += 5500;
  }
  score += centerWindowBonus(config, a);
  if (a.mode === "LANDING") {
    score += Math.max(0, 2500 - Math.abs(a.verticalRate || 0) / 2);
    score += Math.max(0, 2200 - (a.landingTrackDiffDeg || 999) * 35);
    score += Math.max(0, 1800 - (a.altFt || 0) / 4);
  }
  if (a.mode === "TAKEOFF") {
    score += Math.max(0, 2500 - Math.abs(a.verticalRate || 0) / 2);
    score += Math.max(0, 2200 - (a.takeoffTrackDiffDeg || 999) * 35);
  }
  score += Math.max(0, 2600 - (a.distHomeNm || 999) * 260);
  score -= (a.seenSec || 0) * 40;
  return score;
}
function centerWindowBonus(config, a) {
  if (!a.inWindow) {
    return -5e3;
  }
  const half = Math.max(1, config.windowFovDeg / 2);
  const diff = Math.abs(a.windowDiffDeg || 0);
  const normalized = Math.max(0, 1 - diff / half);
  return Math.round(normalized * 12e3);
}
function priorityBonus(config, a) {
  if (!config.priorityEnabled) {
    return 0;
  }
  let bonus = 0;
  bonus += emergencyBonus(config, a);
  if (config.prioritySpecialLivery && hasSpecialLivery(a)) {
    bonus += 6e4;
  }
  if (config.priorityMilitaryGov && isMilitaryOrGovernment(a)) {
    bonus += 45e3;
  }
  if (config.priorityAircraftSize) {
    bonus += aircraftSizeBonus(a);
  }
  return bonus;
}
function hasSpecialLivery(a) {
  return !!String(
    a.specialLiveryVisText || a.specialLiveryFull || a.specialLiveryTitle || a.specialLiveryDescription || a.specialText || ""
  ).trim();
}
function aircraftSizeBonus(a) {
  const text = String(a.aircraftSize || a.aircraftType || a.type || a.aircraftModel || "").toUpperCase();
  if (/SUPERJUMBO|A388|A380/.test(text)) {
    return 650;
  }
  if (/JUMBO|B748|B744|B742|B741|B747|B74/.test(text)) {
    return 600;
  }
  if (/WIDEBODY|A300|A310|A330|A332|A333|A339|A340|A343|A346|A350|A359|A35K|A380|A388|B767|B763|B764|B777|B772|B77W|B77L|B787|B788|B789|B78X|MD11|DC10/.test(
    text
  )) {
    return 450;
  }
  if (/NARROWBODY|A318|A319|A320|A321|A20N|A21N|B737|B738|B739|B38M|B39M|B3XM|A220|BCS|E190|E195|E290|E295/.test(text)) {
    return 200;
  }
  return 0;
}
function isMilitaryOrGovernment(a) {
  const text = [
    a.callsign,
    a.routeCallsign,
    a.operationalCallsign,
    a.airlineName,
    a.airlineIcao,
    a.airlineIata,
    a.registration,
    a.aircraftModel,
    a.aircraftType,
    a.type
  ].map((v) => String(v || "").toUpperCase()).join(" ");
  return /(GAF|GOV|MIL|NATO|NAF|USAF|RCH|CNV|IAM|BAF|FAF|RAF|RRR|DUKE|ASY|CFC|CTM|AME|FMY|BUNDESWEHR|LUFTWAFFE|AIR FORCE|ARMY|NAVY|GOVERNMENT|REGIERUNG|POLICE|POLIZEI)/.test(
    text
  );
}
function findCurrentLive(matches, target) {
  if (!matches.length || !target) {
    return null;
  }
  const targetHex = clean(target.hex).toLowerCase();
  const targetCall = clean(target.callsign).toUpperCase();
  return matches.find((a) => {
    const aHex = clean(a.hex).toLowerCase();
    const aCall = clean(a.callsign).toUpperCase();
    if (aHex && targetHex && aHex === targetHex) {
      return true;
    }
    if (aCall && targetCall && aCall === targetCall) {
      return true;
    }
    return false;
  }) || null;
}
function isDifferentAircraft(a, target) {
  if (!a || !target) {
    return false;
  }
  const aHex = clean(a.hex).toLowerCase();
  const tHex = clean(target.hex).toLowerCase();
  const aCall = clean(a.callsign).toUpperCase();
  const tCall = clean(target.callsign).toUpperCase();
  if (aCall && tCall && aCall === tCall) {
    return false;
  }
  if (aHex && tHex && aHex === tHex) {
    return false;
  }
  if (aCall && tCall) {
    return aCall !== tCall;
  }
  if (aHex && tHex) {
    return aHex !== tHex;
  }
  return false;
}
function flightKey(a) {
  if (!a) {
    return "";
  }
  const hex = clean(a.hex).toLowerCase();
  const cs = clean(a.callsign).toUpperCase();
  if (cs) {
    return `CS:${cs}`;
  }
  if (hex) {
    return `HEX:${hex}`;
  }
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
