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
var webI18n_exports = {};
__export(webI18n_exports, {
  WEB_TRANSLATIONS: () => WEB_TRANSLATIONS,
  applyWebTranslations: () => applyWebTranslations
});
module.exports = __toCommonJS(webI18n_exports);
const WEB_TRANSLATIONS = {
  en: {
    heroSub: "Your live flight radar for home",
    statusConnecting: "Connecting to JetFrame\u2026",
    jetframeActive: "JetFrame active",
    jetframePaused: "JetFrame paused",
    liveDetectionOn: "Live detection is enabled",
    liveDetectionOff: "Live detection is paused",
    navFrameTitle: "Live Frame",
    navFrameSub: "Show current aircraft",
    navHeatmapTitle: "Heatmap",
    navHeatmapSub: "Daily statistics & best spotting time",
    navStatsTitle: "Statistics",
    navStatsSub: "Yesterday, records & spotting times",
    statToday: "TODAY",
    statCurrent: "CURRENT",
    statLandings: "LANDINGS",
    footer: "JetFrame \xB7 Auto-refresh every 10 seconds",
    serverUnreachable: "JetFrame server unreachable",
    statusReady: "JetFrame ready",
    statusLabel: "Status",
    status_searching: "searching",
    status_live: "live",
    status_disabled: "disabled",
    status_cleared: "cleared",
    status_lost: "lost",
    waitingForFlight: "Waiting for flight",
    jetframeOff: "JetFrame off",
    flight: "Flight",
    nextFlight: "Next Flight",
    altitudeFt: "ALTITUDE FT",
    heading: "HEADING",
    registration: "Reg.",
    speechOutput: "Speech output",
    back: "Back",
    heatmapTitle: "Heatmap",
    flights: "Flights",
    landings: "Landings",
    departures: "Departures",
    overflights: "Overflights",
    flightMovements: "Flight movements",
    badgeNow: "NOW",
    badgePeak: "PEAK",
    badgeHour: "HR",
    loadingTraffic: "Loading traffic\u2026",
    bestTimeDash: "Best time: \u2013",
    topAirlines: "Top Airlines",
    topAirline: "Top airline",
    topRoutes: "Top Routes",
    topRoute: "Top route",
    statsTitle: "Statistics",
    today: "Today",
    flightsToday: "flights today",
    yesterday: "Yesterday",
    recap: "recap",
    recordDay: "Record day",
    allTime: "All-time",
    bestTime: "Best time",
    overall: "overall",
    noRecordYet: "no record yet",
    noPreviousDayYet: "no previous day yet",
    flightsTotal: "flights total",
    heavyToday: "Heavy today",
    a380b747Sep: "A380 / B747 separately",
    specialsToday: "Specials today",
    specialLiveries: "special liveries",
    dailyHistory: "Daily history",
    topAirlinesAllTime: "Top Airlines All-time",
    topRoutesAllTime: "Top Routes All-time"
  },
  de: {
    heroSub: "Dein Live-Flugradar f\xFCr Zuhause",
    statusConnecting: "Verbinde mit JetFrame\u2026",
    jetframeActive: "JetFrame aktiv",
    jetframePaused: "JetFrame pausiert",
    liveDetectionOn: "Live-Erkennung ist eingeschaltet",
    liveDetectionOff: "Live-Erkennung ist pausiert",
    navFrameTitle: "Live Frame",
    navFrameSub: "Aktuelles Flugzeug anzeigen",
    navHeatmapTitle: "Heatmap",
    navHeatmapSub: "Tagesstatistik & beste Spotterzeit",
    navStatsTitle: "Statistik",
    navStatsSub: "Gestern, Rekorde & Spotterzeiten",
    statToday: "HEUTE",
    statCurrent: "AKTUELL",
    statLandings: "LANDUNGEN",
    footer: "JetFrame \xB7 Auto-Refresh alle 10 Sekunden",
    serverUnreachable: "JetFrame-Server nicht erreichbar",
    statusReady: "JetFrame bereit",
    statusLabel: "Status",
    status_searching: "sucht",
    status_live: "live",
    status_disabled: "deaktiviert",
    status_cleared: "zur\xFCckgesetzt",
    status_lost: "verloren",
    waitingForFlight: "Warte auf Flug",
    jetframeOff: "JetFrame aus",
    flight: "Flug",
    nextFlight: "N\xE4chster Flug",
    altitudeFt: "H\xD6HE FT",
    heading: "KURS",
    registration: "Kennz.",
    speechOutput: "Sprachausgabe",
    back: "Zur\xFCck",
    heatmapTitle: "Heatmap",
    flights: "Fl\xFCge",
    landings: "Landungen",
    departures: "Starts",
    overflights: "\xDCberfl\xFCge",
    flightMovements: "Flugbewegungen",
    badgeNow: "JETZT",
    badgePeak: "PEAK",
    badgeHour: "STD",
    loadingTraffic: "Lade Traffic\u2026",
    bestTimeDash: "Beste Zeit: \u2013",
    topAirlines: "Top Airlines",
    topAirline: "Top Airline",
    topRoutes: "Top Routen",
    topRoute: "Top Route",
    statsTitle: "Statistik",
    today: "Heute",
    flightsToday: "Fl\xFCge heute",
    yesterday: "Gestern",
    recap: "R\xFCckblick",
    recordDay: "Rekordtag",
    allTime: "Alltime",
    bestTime: "Beste Zeit",
    overall: "allgemein",
    noRecordYet: "noch kein Rekord",
    noPreviousDayYet: "noch kein Vortag",
    flightsTotal: "Fl\xFCge insgesamt",
    heavyToday: "Heavy heute",
    a380b747Sep: "A380 / B747 separat",
    specialsToday: "Specials heute",
    specialLiveries: "Speziallackierungen",
    dailyHistory: "Tageshistorie",
    topAirlinesAllTime: "Top Airlines Alltime",
    topRoutesAllTime: "Top Routen Alltime"
  }
};
function applyWebTranslations(html, lang) {
  const dict = WEB_TRANSLATIONS[lang] || WEB_TRANSLATIONS.en;
  return html.replace("{{T_JSON}}", JSON.stringify(dict)).replace(/\{\{t\.([a-zA-Z0-9_]+)\}\}/g, (_match, key) => {
    var _a, _b;
    return (_b = (_a = dict[key]) != null ? _a : WEB_TRANSLATIONS.en[key]) != null ? _b : key;
  }).replace(/<html lang="[a-z-]*">/, `<html lang="${lang}">`);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WEB_TRANSLATIONS,
  applyWebTranslations
});
//# sourceMappingURL=webI18n.js.map
