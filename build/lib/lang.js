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
var lang_exports = {};
__export(lang_exports, {
  COMPASS_DIRECTIONS: () => COMPASS_DIRECTIONS,
  CONTENT_TEXT: () => CONTENT_TEXT,
  t: () => t
});
module.exports = __toCommonJS(lang_exports);
const COMPASS_DIRECTIONS = {
  en: ["\u2191 North", "\u2197 Northeast", "\u2192 East", "\u2198 Southeast", "\u2193 South", "\u2199 Southwest", "\u2190 West", "\u2196 Northwest"],
  de: ["\u2191 Norden", "\u2197 Nordost", "\u2192 Osten", "\u2198 S\xFCdost", "\u2193 S\xFCden", "\u2199 S\xFCdwest", "\u2190 Westen", "\u2196 Nordwest"]
};
const CONTENT_TEXT = {
  en: {
    takeoff: "Takeoff",
    landing: "Landing",
    overflight: "Overflight",
    flight: "Flight",
    traffic: "Traffic",
    to: "to",
    from: "from",
    landingsPlural: "Landings",
    takeoffsPlural: "Departures",
    msgFlight: "Flight",
    msgRouteVia: "Route via",
    msgAirline: "Airline",
    msgRoute: "Route",
    msgDirection: "Direction",
    msgSource: "Source",
    msgAircraft: "Aircraft",
    msgType: "Type",
    msgReg: "Reg.",
    msgAltitude: "Altitude",
    msgSpeed: "Speed",
    msgClimbRate: "Climb rate",
    msgHeading: "Heading",
    msgSpecial: "Special",
    msgInfo: "Info",
    atWindow: "at the window",
    directlyInFrontOfWindow: "directly in front of the window",
    leftOfWindow: "left of window",
    rightOfWindow: "right of window",
    positionUnknown: "Position unknown",
    manufacturerFallback: "Aircraft",
    rwyActive: "active",
    activeHeading: "Active heading",
    noFlightNear: "No takeoff/landing/overflight near",
    probableRwy: "probable RWY",
    rushHour: "Rush hour",
    flightsSince: "flights since",
    currentHour: "Current hour",
    flights: "flights",
    bestTime: "best time",
    unknownAirline: "Unknown Airline",
    unknown: "Unknown",
    routeVerified: "HexDB + Flightera verified",
    routeHexdbOnly: "HexDB route",
    routeLiveDetected: "Live flight detected",
    routeDestUnknown: "Destination unknown",
    routeOriginUnknown: "Origin unknown",
    routeUnknown: "Route unknown",
    routeFlighteraPreferred: "Flightera live preferred, HexDB divergent",
    routeHexdbPreferred: "HexDB preferred, Flightera divergent",
    routeFr24LiveFallback: "FR24 live fallback",
    routeAdsbdbFallback: "ADSBDB fallback"
  },
  de: {
    takeoff: "Start",
    landing: "Landung",
    overflight: "\xDCberflug",
    flight: "Flug",
    traffic: "Traffic",
    to: "nach",
    from: "von",
    landingsPlural: "Landungen",
    takeoffsPlural: "Starts",
    msgFlight: "Flug",
    msgRouteVia: "Route \xFCber",
    msgAirline: "Airline",
    msgRoute: "Route",
    msgDirection: "Richtung",
    msgSource: "Quelle",
    msgAircraft: "Flugzeug",
    msgType: "Typ",
    msgReg: "Kennz.",
    msgAltitude: "H\xF6he",
    msgSpeed: "Speed",
    msgClimbRate: "Steigrate",
    msgHeading: "Kurs",
    msgSpecial: "Besonderheit",
    msgInfo: "Info",
    atWindow: "am Fenster",
    directlyInFrontOfWindow: "direkt vor dem Fenster",
    leftOfWindow: "links vom Fenster",
    rightOfWindow: "rechts vom Fenster",
    positionUnknown: "Position unbekannt",
    manufacturerFallback: "Flugzeug",
    rwyActive: "aktiv",
    activeHeading: "Aktive Richtung",
    noFlightNear: "Kein Start/Landung/\xDCberflug bei",
    probableRwy: "vermutlich RWY",
    rushHour: "Rushhour",
    flightsSince: "Fl\xFCge seit",
    currentHour: "Aktuelle Stunde",
    flights: "Fl\xFCge",
    bestTime: "beste Zeit",
    unknownAirline: "Unbekannte Airline",
    unknown: "Unbekannt",
    routeVerified: "HexDB + Flightera gepr\xFCft",
    routeHexdbOnly: "HexDB Route",
    routeLiveDetected: "Live-Flug erkannt",
    routeDestUnknown: "Ziel unbekannt",
    routeOriginUnknown: "Start unbekannt",
    routeUnknown: "Route unbekannt",
    routeFlighteraPreferred: "Flightera Live bevorzugt, HexDB abweichend",
    routeHexdbPreferred: "HexDB bevorzugt, Flightera abweichend",
    routeFr24LiveFallback: "FR24 Live-Fallback",
    routeAdsbdbFallback: "ADSBDB Fallback"
  }
};
function t(lang, key) {
  var _a, _b, _c;
  return (_c = (_b = (_a = CONTENT_TEXT[lang]) == null ? void 0 : _a[key]) != null ? _b : CONTENT_TEXT.en[key]) != null ? _c : key;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  COMPASS_DIRECTIONS,
  CONTENT_TEXT,
  t
});
//# sourceMappingURL=lang.js.map
