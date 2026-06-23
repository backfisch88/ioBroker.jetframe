"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var utils = __toESM(require("@iobroker/adapter-core"));
var https = __toESM(require("node:https"));
var http = __toESM(require("node:http"));
var import_staticFiles = require("./lib/staticFiles");
var import_airports = require("./lib/airports");
var import_specialLiveries = require("./lib/specialLiveries");
var import_config = require("./lib/config");
var import_adsb = require("./lib/adsb");
var import_classify = require("./lib/classify");
var import_states = require("./lib/states");
var import_images = require("./lib/images");
var import_visConfig = require("./lib/visConfig");
var import_flightInfo = require("./lib/flightInfo");
class Jetframe extends utils.Adapter {
  timer = null;
  statisticsTimer = null;
  liveTarget = null;
  liveInfo = null;
  liveStarted = 0;
  lastStartKey = "";
  lastStartTs = 0;
  lastImageSaveKey = "";
  lastIdleRunwayText = "";
  constructor(options = {}) {
    super({
      ...options,
      name: "jetframe"
    });
    this.on("ready", this.onReady.bind(this));
    this.on("unload", this.onUnload.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
  }
  async onReady() {
    this.log.info("JetFrame Adapter gestartet");
    await (0, import_staticFiles.copyStaticFiles)(this);
    try {
      const config = (0, import_config.readConfig)(this);
      await (0, import_states.ensureStates)(this, config);
      await this.ensureStatisticsStates(config.dpRoot);
      await this.resetTodayStatisticsIfNeeded(`${config.dpRoot}.statistics`);
      this.scheduleStatisticsRotation(config.dpRoot);
      await this.ensureProbableRunwayStates(config.dpRoot);
      await this.ensureIdleRunwayState(config.dpRoot);
      this.subscribeStates("clearImageCache");
      this.log.debug("[JetFrame] States OK");
      await (0, import_images.ensureImageDirs)(this, this.logDebug.bind(this), this.logWarn.bind(this));
      await (0, import_visConfig.writeVisConfig)(this, this.config, this.logDebug.bind(this), this.logWarn.bind(this));
      this.log.debug("[JetFrame] Images OK");
      (0, import_airports.updateAirportJson)(this, this.logDebug.bind(this), this.logWarn.bind(this)).catch((e) => {
        this.logWarn(`Airport DB Update Fehler: ${this.errorText(e)}`);
      });
      (0, import_specialLiveries.updateSpecialLiveries)(this, this.logDebug.bind(this), this.logWarn.bind(this)).catch((e) => {
        this.logWarn(`Special-Liveries DB Update Fehler: ${this.errorText(e)}`);
      });
      this.log.debug("[JetFrame] Starte Loop");
      this.loop().catch((e) => {
        this.logError(`Loop Start Fehler: ${this.errorText(e)}`);
      });
    } catch (e) {
      this.logError(`onReady Fehler: ${this.errorText(e)}`);
    }
  }
  async onStateChange(id, state) {
    if (!state || state.ack || state.val !== true) {
      return;
    }
    const config = (0, import_config.readConfig)(this);
    if (id !== `${config.dpRoot}.clearImageCache`) {
      return;
    }
    try {
      await (0, import_images.clearImageCache)(this, this.logDebug.bind(this), this.logWarn.bind(this));
      await this.setForeignStateAsync(`${config.dpRoot}.clearImageCache`, false, true);
      this.log.info("JetFrame Bild-/Logo-Cache wurde geleert");
    } catch (e) {
      this.logWarn(`Cache leeren fehlgeschlagen: ${this.errorText(e)}`);
      await this.setForeignStateAsync(`${config.dpRoot}.clearImageCache`, false, true);
    }
  }
  async ensureIdleRunwayState(dpRoot) {
    try {
      await this.setForeignObjectNotExistsAsync(`${dpRoot}.idleRunwayText`, {
        type: "state",
        common: {
          name: "Idle active runway text",
          type: "string",
          role: "text",
          read: true,
          write: false
        },
        native: {}
      });
    } catch (e) {
      this.logWarn(`idleRunwayText State konnte nicht erstellt werden: ${this.errorText(e)}`);
    }
  }
  async updateIdleRunway(a, config) {
    var _a;
    const track = Number(a.trackDeg || a.track || 0);
    if (!Number.isFinite(track) || !track) {
      return;
    }
    let runways = [];
    try {
      const st = await this.getForeignStateAsync(`${config.dpRoot}.airportjson`);
      const airports = JSON.parse(String((st == null ? void 0 : st.val) || "[]"));
      const airportIata = String(((_a = config.airport) == null ? void 0 : _a.iata) || "").trim().toUpperCase();
      const airport = Array.isArray(airports) ? airports.find(
        (x) => String(x.iata || x.IATA || "").trim().toUpperCase() === airportIata
      ) : null;
      runways = Array.isArray(airport == null ? void 0 : airport.runways) ? airport.runways : [];
    } catch {
      runways = [];
    }
    let bestName = "";
    let bestGroup = "";
    let bestDiff = 999;
    for (const rw of runways) {
      const sides = [
        { name: rw.leIdent, heading: rw.leHeadingDeg },
        { name: rw.heIdent, heading: rw.heHeadingDeg }
      ];
      for (const side of sides) {
        const name = String(side.name || "").trim().toUpperCase();
        const heading = Number(side.heading);
        if (!name || !Number.isFinite(heading)) {
          continue;
        }
        let diff = Math.abs(track - heading);
        if (diff > 180) {
          diff = 360 - diff;
        }
        if (diff < bestDiff) {
          bestDiff = diff;
          bestName = name;
          bestGroup = name.replace(/[LCR]$/i, "");
        }
      }
    }
    let runway = "";
    if (bestName && bestDiff <= 35) {
      runway = `RWY ${bestGroup || bestName} aktiv`;
    } else {
      runway = `Aktive Richtung ${Math.round(track)}\xB0`;
    }
    const mode = a.mode === "LANDING" ? "Landungen" : a.mode === "TAKEOFF" ? "Starts" : "Traffic";
    const text = `${runway} \xB7 ${mode}`;
    if (text === this.lastIdleRunwayText) {
      return;
    }
    this.lastIdleRunwayText = text;
    await this.setForeignStateAsync(`${config.dpRoot}.idleRunwayText`, text, true);
  }
  async ensureProbableRunwayStates(dpRoot) {
    const bases = [`${dpRoot}.current`, `${dpRoot}.airport`, `${dpRoot}.overflight`];
    for (const base of bases) {
      await this.ensureSimpleState(`${base}.probableRunway`, "Probable runway", "string", "text");
      await this.ensureSimpleState(`${base}.probableRunwayText`, "Probable runway text", "string", "text");
      await this.ensureSimpleState(`${base}.probableRunwayHeading`, "Probable runway heading", "number", "value");
      await this.ensureSimpleState(
        `${base}.probableRunwayDiffDeg`,
        "Probable runway difference degrees",
        "number",
        "value"
      );
    }
  }
  async ensureSimpleState(id, name, type, role) {
    try {
      await this.setForeignObjectNotExistsAsync(id, {
        type: "state",
        common: {
          name,
          type,
          role,
          read: true,
          write: false
        },
        native: {}
      });
      const st = await this.getForeignStateAsync(id);
      if (!st) {
        await this.setForeignStateAsync(id, type === "number" ? 0 : type === "boolean" ? false : "", true);
      }
    } catch (e) {
      this.logWarn(`State konnte nicht erstellt/initialisiert werden: ${id} | ${this.errorText(e)}`);
    }
  }
  async applyProbableRunway(a, config) {
    var _a;
    const track = Number(a.trackDeg || a.track || 0);
    if (!Number.isFinite(track) || !track) {
      return;
    }
    let runways = [];
    try {
      const st = await this.getForeignStateAsync(`${config.dpRoot}.airportjson`);
      const airports = JSON.parse(String((st == null ? void 0 : st.val) || "[]"));
      const airportIata = String(((_a = config.airport) == null ? void 0 : _a.iata) || "").trim().toUpperCase();
      const airport = Array.isArray(airports) ? airports.find(
        (x) => String(x.iata || x.IATA || "").trim().toUpperCase() === airportIata
      ) : null;
      runways = Array.isArray(airport == null ? void 0 : airport.runways) ? airport.runways : [];
    } catch {
      runways = [];
    }
    let bestName = "";
    let bestGroup = "";
    let bestHeading = 0;
    let bestDiff = 999;
    for (const rw of runways) {
      const sides = [
        { name: rw.leIdent, heading: rw.leHeadingDeg },
        { name: rw.heIdent, heading: rw.heHeadingDeg }
      ];
      for (const side of sides) {
        const name = String(side.name || "").trim().toUpperCase();
        const heading = Number(side.heading);
        if (!name || !Number.isFinite(heading)) {
          continue;
        }
        let diff = Math.abs(track - heading);
        if (diff > 180) {
          diff = 360 - diff;
        }
        if (diff < bestDiff) {
          bestDiff = diff;
          bestName = name;
          bestGroup = name.replace(/[LCR]$/i, "");
          bestHeading = heading;
        }
      }
    }
    if (!bestName || bestDiff > 35) {
      a.probableRunway = "";
      a.probableRunwayText = "";
      a.probableRunwayHeading = 0;
      a.probableRunwayDiffDeg = 0;
      a.runwayConfidence = 0;
      return;
    }
    const modeIcon = a.mode === "LANDING" ? "\u{1F6EC}" : a.mode === "TAKEOFF" ? "\u{1F6EB}" : "\u{1F4E1}";
    const modeText = a.mode === "LANDING" ? "Landung" : a.mode === "TAKEOFF" ? "Start" : "Traffic";
    const confidence = Math.max(0, Math.min(100, Math.round(100 - bestDiff / 35 * 100)));
    a.probableRunway = bestGroup || bestName;
    a.probableRunwayHeading = Math.round(bestHeading);
    a.probableRunwayDiffDeg = Math.round(bestDiff);
    a.runwayConfidence = confidence;
    a.probableRunwayText = `${modeIcon} vermutlich RWY ${bestGroup || bestName} \xB7 ${modeText}`;
  }
  async ensureStatisticsStates(dpRoot) {
    const base = `${dpRoot}.statistics`;
    await this.ensureSimpleState(`${base}.totalFlightsSeen`, "Total flights seen", "number", "value");
    await this.ensureSimpleState(`${base}.landings`, "Landings", "number", "value");
    await this.ensureSimpleState(`${base}.departures`, "Departures", "number", "value");
    await this.ensureSimpleState(`${base}.overflights`, "Overflights", "number", "value");
    await this.ensureSimpleState(`${base}.lastFlight`, "Last flight", "string", "text");
    await this.ensureSimpleState(`${base}.lastAirline`, "Last airline", "string", "text");
    await this.ensureSimpleState(`${base}.lastRoute`, "Last route", "string", "text");
    await this.ensureSimpleState(`${base}.lastRegistration`, "Last registration", "string", "text");
    await this.ensureSimpleState(`${base}.lastSeen`, "Last seen", "string", "text");
    await this.ensureSimpleState(`${base}.airlineRanking`, "Airline ranking JSON", "string", "json");
    await this.ensureSimpleState(`${base}.airlineRankingText`, "Airline ranking text", "string", "text");
    await this.ensureSimpleState(`${base}.aircraftTypeRanking`, "Aircraft type ranking JSON", "string", "json");
    await this.ensureSimpleState(`${base}.aircraftTypeRankingText`, "Aircraft type ranking text", "string", "text");
    await this.ensureSimpleState(`${base}.registrationRanking`, "Registration ranking JSON", "string", "json");
    await this.ensureSimpleState(`${base}.registrationRankingText`, "Registration ranking text", "string", "text");
    await this.ensureSimpleState(`${base}.runwayUsageRanking`, "Runway usage ranking JSON", "string", "json");
    await this.ensureSimpleState(`${base}.runwayUsageRankingText`, "Runway usage ranking text", "string", "text");
    await this.ensureSimpleState(`${base}.airlineRunwayRanking`, "Airline runway ranking JSON", "string", "json");
    await this.ensureSimpleState(
      `${base}.airlineRunwayRankingText`,
      "Airline runway ranking text",
      "string",
      "text"
    );
    await this.ensureSimpleState(`${base}.flightLogHistory`, "Flight log history JSON", "string", "json");
    await this.ensureSimpleState(`${base}.flightLogHistoryText`, "Flight log history text", "string", "text");
    await this.ensureSimpleState(`${base}.today.date`, "Today date", "string", "text");
    await this.ensureSimpleState(`${base}.today.totalFlights`, "Today total flights", "number", "value");
    await this.ensureSimpleState(`${base}.today.landings`, "Today landings", "number", "value");
    await this.ensureSimpleState(`${base}.today.departures`, "Today departures", "number", "value");
    await this.ensureSimpleState(`${base}.today.overflights`, "Today overflights", "number", "value");
    await this.ensureSimpleState(`${base}.today.firstSeen`, "Today first seen", "string", "text");
    await this.ensureSimpleState(`${base}.today.lastSeen`, "Today last seen", "string", "text");
    await this.ensureSimpleState(`${base}.today.lastFlight`, "Today last flight", "string", "text");
    await this.ensureSimpleState(`${base}.today.lastAirline`, "Today last airline", "string", "text");
    await this.ensureSimpleState(`${base}.today.lastRoute`, "Today last route", "string", "text");
    await this.ensureSimpleState(`${base}.today.lastRegistration`, "Today last registration", "string", "text");
    await this.ensureSimpleState(`${base}.today.topAirline`, "Today top airline", "string", "text");
    await this.ensureSimpleState(`${base}.today.topRoute`, "Today top route", "string", "text");
    await this.ensureSimpleState(`${base}.today.airlineRanking`, "Today airline ranking JSON", "string", "json");
    await this.ensureSimpleState(
      `${base}.today.airlineRankingText`,
      "Today airline ranking text",
      "string",
      "text"
    );
    await this.ensureSimpleState(`${base}.today.routeRanking`, "Today route ranking JSON", "string", "json");
    await this.ensureSimpleState(`${base}.today.routeRankingText`, "Today route ranking text", "string", "text");
    await this.ensureSimpleState(`${base}.today.hourly`, "Today hourly flights JSON", "string", "json");
    await this.ensureSimpleState(`${base}.today.hourlyText`, "Today hourly flights text", "string", "text");
    await this.ensureSimpleState(`${base}.today.bestSpotterHour`, "Today best spotter hour", "string", "text");
    await this.ensureSimpleState(
      `${base}.today.currentHourFlights`,
      "Today current hour flights",
      "number",
      "value"
    );
    await this.ensureSimpleState(`${base}.today.rushHourNow`, "Rush hour now", "boolean", "indicator");
    await this.ensureSimpleState(`${base}.today.rushHourText`, "Rush hour text", "string", "text");
    await this.ensureSimpleState(`${base}.today.a380Count`, "Today A380 count", "number", "value");
    await this.ensureSimpleState(`${base}.today.b747Count`, "Today B747 count", "number", "value");
    await this.ensureSimpleState(
      `${base}.today.heavyAircraftCount`,
      "Today heavy aircraft count",
      "number",
      "value"
    );
    await this.ensureSimpleState(
      `${base}.today.specialLiveryCount`,
      "Today special livery count",
      "number",
      "value"
    );
    await this.ensureSimpleState(`${base}.yesterday.date`, "Yesterday date", "string", "text");
    await this.ensureSimpleState(`${base}.yesterday.totalFlights`, "Yesterday total flights", "number", "value");
    await this.ensureSimpleState(`${base}.yesterday.landings`, "Yesterday landings", "number", "value");
    await this.ensureSimpleState(`${base}.yesterday.departures`, "Yesterday departures", "number", "value");
    await this.ensureSimpleState(`${base}.yesterday.overflights`, "Yesterday overflights", "number", "value");
    await this.ensureSimpleState(
      `${base}.yesterday.bestSpotterHour`,
      "Yesterday best spotter hour",
      "string",
      "text"
    );
    await this.ensureSimpleState(
      `${base}.yesterday.bestHourFlights`,
      "Yesterday best hour flights",
      "number",
      "value"
    );
    await this.ensureSimpleState(`${base}.yesterday.topAirline`, "Yesterday top airline", "string", "text");
    await this.ensureSimpleState(`${base}.yesterday.topRoute`, "Yesterday top route", "string", "text");
    await this.ensureSimpleState(`${base}.yesterday.a380Count`, "Yesterday A380 count", "number", "value");
    await this.ensureSimpleState(`${base}.yesterday.b747Count`, "Yesterday B747 count", "number", "value");
    await this.ensureSimpleState(
      `${base}.yesterday.heavyAircraftCount`,
      "Yesterday heavy aircraft count",
      "number",
      "value"
    );
    await this.ensureSimpleState(
      `${base}.yesterday.specialLiveryCount`,
      "Yesterday special livery count",
      "number",
      "value"
    );
    await this.ensureSimpleState(`${base}.yesterday.hourly`, "Yesterday hourly JSON", "string", "json");
    await this.ensureSimpleState(
      `${base}.yesterday.airlineRankingText`,
      "Yesterday airline ranking text",
      "string",
      "text"
    );
    await this.ensureSimpleState(
      `${base}.yesterday.routeRankingText`,
      "Yesterday route ranking text",
      "string",
      "text"
    );
    await this.ensureSimpleState(`${base}.history.daily`, "Daily statistics history JSON", "string", "json");
    await this.ensureSimpleState(`${base}.history.dailyText`, "Daily statistics history text", "string", "text");
    await this.ensureSimpleState(`${base}.alltime.bestDayDate`, "Alltime best day date", "string", "text");
    await this.ensureSimpleState(`${base}.alltime.bestDayFlights`, "Alltime best day flights", "number", "value");
    await this.ensureSimpleState(`${base}.alltime.bestHour`, "Alltime best hour", "string", "text");
    await this.ensureSimpleState(`${base}.alltime.bestHourFlights`, "Alltime best hour flights", "number", "value");
    await this.ensureSimpleState(`${base}.alltime.bestAirline`, "Alltime best airline", "string", "text");
    await this.ensureSimpleState(`${base}.alltime.bestRoute`, "Alltime best route", "string", "text");
    await this.ensureSimpleState(
      `${base}.alltime.bestAircraftType`,
      "Alltime best aircraft type",
      "string",
      "text"
    );
    await this.ensureSimpleState(`${base}.alltime.a380Count`, "Alltime A380 count", "number", "value");
    await this.ensureSimpleState(`${base}.alltime.b747Count`, "Alltime B747 count", "number", "value");
    await this.ensureSimpleState(
      `${base}.alltime.heavyAircraftCount`,
      "Alltime heavy aircraft count",
      "number",
      "value"
    );
    await this.ensureSimpleState(
      `${base}.alltime.specialLiveryCount`,
      "Alltime special livery count",
      "number",
      "value"
    );
    await this.ensureSimpleState(
      `${base}.alltime.bestSpecialDayDate`,
      "Alltime best special day date",
      "string",
      "text"
    );
    await this.ensureSimpleState(
      `${base}.alltime.bestSpecialDayCount`,
      "Alltime best special day count",
      "number",
      "value"
    );
    await this.ensureSimpleState(`${base}.alltime.hourly`, "Alltime hourly JSON", "string", "json");
    await this.ensureSimpleState(
      `${base}.alltime.airlineRanking`,
      "Alltime airline ranking JSON",
      "string",
      "json"
    );
    await this.ensureSimpleState(
      `${base}.alltime.airlineRankingText`,
      "Alltime airline ranking text",
      "string",
      "text"
    );
    await this.ensureSimpleState(`${base}.alltime.routeRanking`, "Alltime route ranking JSON", "string", "json");
    await this.ensureSimpleState(
      `${base}.alltime.routeRankingText`,
      "Alltime route ranking text",
      "string",
      "text"
    );
  }
  async readNumberState(id) {
    try {
      const st = await this.getForeignStateAsync(id);
      const n = Number((st == null ? void 0 : st.val) || 0);
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }
  async readJsonState(id, fallback) {
    try {
      const st = await this.getForeignStateAsync(id);
      const raw = String((st == null ? void 0 : st.val) || "").trim();
      if (!raw) {
        return fallback;
      }
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
  topRankingText(entries, limit = 5) {
    return entries.slice(0, limit).map(([name, count], index) => `${index + 1}. ${name} \xB7 ${count}`).join("\n");
  }
  sortedRanking(data, limit = 30) {
    return Object.entries(data).filter(([name]) => !!this.clean(name)).sort((aEntry, bEntry) => bEntry[1] - aEntry[1] || aEntry[0].localeCompare(bEntry[0])).slice(0, limit);
  }
  async incrementRankingState(id, textId, key, limit = 30, textLimit = 5) {
    const cleanKey = this.clean(key);
    if (!cleanKey) {
      return [];
    }
    const ranking = await this.readJsonState(id, {});
    ranking[cleanKey] = (ranking[cleanKey] || 0) + 1;
    const sorted = this.sortedRanking(ranking, limit);
    await this.setForeignStateAsync(id, JSON.stringify(Object.fromEntries(sorted)), true);
    await this.setForeignStateAsync(textId, this.topRankingText(sorted, textLimit), true);
    return sorted;
  }
  async updateGlobalDetailedStatistics(base, a, info) {
    const type = this.clean(a.aircraftTypeText) || this.clean(a.aircraftModel) || this.clean(a.aircraftType) || this.clean(a.type) || "Unbekannt";
    await this.incrementRankingState(`${base}.aircraftTypeRanking`, `${base}.aircraftTypeRankingText`, type, 40, 8);
    if (info.registration) {
      await this.incrementRankingState(
        `${base}.registrationRanking`,
        `${base}.registrationRankingText`,
        info.registration,
        50,
        8
      );
    }
    const runway = this.clean(a.probableRunway || "");
    const runwayConfidence = Number(a.runwayConfidence || 0);
    if (runway && runwayConfidence >= 40) {
      await this.incrementRankingState(
        `${base}.runwayUsageRanking`,
        `${base}.runwayUsageRankingText`,
        runway,
        30,
        8
      );
      const airlineRunwayKey = `${info.airline} \u2192 RWY ${runway}`;
      await this.incrementRankingState(
        `${base}.airlineRunwayRanking`,
        `${base}.airlineRunwayRankingText`,
        airlineRunwayKey,
        50,
        8
      );
    }
    const historyId = `${base}.flightLogHistory`;
    const historyTextId = `${base}.flightLogHistoryText`;
    const history = await this.readJsonState(historyId, []);
    const entry = {
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      mode: info.mode,
      phase: this.clean(a.flightPhase || ""),
      callsign: info.callsign,
      airline: info.airline,
      route: info.route,
      originIata: this.clean(a.originIata || ""),
      destIata: this.clean(a.destIata || ""),
      registration: info.registration,
      aircraftType: type,
      runway,
      runwayConfidence: Number.isFinite(runwayConfidence) ? runwayConfidence : 0
    };
    history.unshift(entry);
    const limitedHistory = history.slice(0, 200);
    const historyText = limitedHistory.slice(0, 10).map((item) => {
      const d = new Date(item.ts);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const icon = item.mode === "LANDING" ? "\u{1F6EC}" : item.mode === "TAKEOFF" ? "\u{1F6EB}" : "\u{1F6E9}\uFE0F";
      const rw = item.runway ? ` \xB7 RWY ${item.runway}` : "";
      const routeText = item.route ? ` \xB7 ${item.route}` : "";
      return `${hh}:${mm} ${icon} ${item.callsign || "?"} \xB7 ${item.airline || "?"}${routeText}${rw}`;
    }).join("\n");
    await this.setForeignStateAsync(historyId, JSON.stringify(limitedHistory), true);
    await this.setForeignStateAsync(historyTextId, historyText, true);
  }
  isA380(a) {
    const all = [a.aircraftTypeText, a.aircraftModel, a.aircraftType, a.type].map((v) => this.clean(v).toUpperCase()).join(" ").replace(/[\s_-]/g, "");
    return /A380|A388|A38/.test(all);
  }
  isB747(a) {
    const all = [a.aircraftTypeText, a.aircraftModel, a.aircraftType, a.type].map((v) => this.clean(v).toUpperCase()).join(" ").replace(/[\s_-]/g, "");
    return /B747|B741|B742|B743|B744|B748|747/.test(all);
  }
  isHeavyAircraft(a) {
    const all = [
      a.aircraftTypeText,
      a.aircraftModel,
      a.aircraftType,
      a.type,
      a.aircraftSize
    ].map((v) => this.clean(v).toUpperCase()).join(" ").replace(/[\s_-]/g, "");
    return /WIDEBODY|HEAVY|SUPERJUMBO|JUMBO|HEAVYCARGO/.test(all) || /A300|A310|A330|A332|A333|A338|A339|A340|A342|A343|A345|A346/.test(all) || /A350|A359|A35K|A351|A380|A388/.test(all) || /B747|B741|B742|B743|B744|B748/.test(all) || /B757|B752|B753/.test(all) || /B767|B762|B763|B764/.test(all) || /B777|B772|B773|B77W|B778|B779|B77L|B77F/.test(all) || /B787|B788|B789|B78X/.test(all) || /MD11|DC10|L1011|IL86|IL96/.test(all) || /AN124|AN225|C5M|GALAXY|C17|C17A|GLOBEMASTER|A400|A400M/.test(all);
  }
  isSpecialFlight(a) {
    return !!(a.isSpecial || this.clean(a.specialText) || this.clean(a.specialLiveryTitle) || this.clean(a.specialLiveryDescription) || this.clean(a.specialLiveryFull) || this.clean(a.specialLiveryVisText));
  }
  mergeRanking(target, source) {
    for (const [key, value] of Object.entries(source || {})) {
      const cleanKey = this.clean(key);
      if (!cleanKey) {
        continue;
      }
      const count = Number(value || 0);
      if (!Number.isFinite(count) || count <= 0) {
        continue;
      }
      target[cleanKey] = (target[cleanKey] || 0) + count;
    }
    return target;
  }
  bestHourFromHourly(hourly) {
    const best = Object.entries(hourly || {}).filter(([, value]) => Number((value == null ? void 0 : value.total) || 0) > 0).sort((a, b) => Number(b[1].total || 0) - Number(a[1].total || 0) || Number(a[0]) - Number(b[0]))[0];
    return best ? { hour: `${best[0]}:00`, total: Number(best[1].total || 0) } : { hour: "", total: 0 };
  }
  async archiveTodayStatistics(base, storedDate) {
    const todayBase = `${base}.today`;
    const yesterdayBase = `${base}.yesterday`;
    const totalFlights = await this.readNumberState(`${todayBase}.totalFlights`);
    if (!storedDate || totalFlights <= 0) {
      return;
    }
    const landings = await this.readNumberState(`${todayBase}.landings`);
    const departures = await this.readNumberState(`${todayBase}.departures`);
    const overflights = await this.readNumberState(`${todayBase}.overflights`);
    const a380Count = await this.readNumberState(`${todayBase}.a380Count`);
    const b747Count = await this.readNumberState(`${todayBase}.b747Count`);
    const heavyAircraftCount = await this.readNumberState(`${todayBase}.heavyAircraftCount`);
    const specialLiveryCount = await this.readNumberState(`${todayBase}.specialLiveryCount`);
    const hourly = await this.readJsonState(`${todayBase}.hourly`, this.emptyHourlyStats());
    const airlineRanking = await this.readJsonState(`${todayBase}.airlineRanking`, {});
    const routeRanking = await this.readJsonState(`${todayBase}.routeRanking`, {});
    const airlineSorted = this.sortedRanking(airlineRanking, 20);
    const routeSorted = this.sortedRanking(routeRanking, 20);
    const bestHour = this.bestHourFromHourly(hourly);
    const topAirline = airlineSorted.length ? `${airlineSorted[0][0]} \xB7 ${airlineSorted[0][1]}` : "";
    const topRoute = routeSorted.length ? `${routeSorted[0][0]} \xB7 ${routeSorted[0][1]}` : "";
    await this.setForeignStateAsync(`${yesterdayBase}.date`, storedDate, true);
    await this.setForeignStateAsync(`${yesterdayBase}.totalFlights`, totalFlights, true);
    await this.setForeignStateAsync(`${yesterdayBase}.landings`, landings, true);
    await this.setForeignStateAsync(`${yesterdayBase}.departures`, departures, true);
    await this.setForeignStateAsync(`${yesterdayBase}.overflights`, overflights, true);
    await this.setForeignStateAsync(
      `${yesterdayBase}.bestSpotterHour`,
      bestHour.hour ? `${bestHour.hour} \xB7 ${bestHour.total} Fl\xFCge` : "",
      true
    );
    await this.setForeignStateAsync(`${yesterdayBase}.bestHourFlights`, bestHour.total, true);
    await this.setForeignStateAsync(`${yesterdayBase}.topAirline`, topAirline, true);
    await this.setForeignStateAsync(`${yesterdayBase}.topRoute`, topRoute, true);
    await this.setForeignStateAsync(`${yesterdayBase}.a380Count`, a380Count, true);
    await this.setForeignStateAsync(`${yesterdayBase}.b747Count`, b747Count, true);
    await this.setForeignStateAsync(`${yesterdayBase}.heavyAircraftCount`, heavyAircraftCount, true);
    await this.setForeignStateAsync(`${yesterdayBase}.specialLiveryCount`, specialLiveryCount, true);
    await this.setForeignStateAsync(`${yesterdayBase}.hourly`, JSON.stringify(hourly), true);
    await this.setForeignStateAsync(
      `${yesterdayBase}.airlineRankingText`,
      this.topRankingText(airlineSorted, 5),
      true
    );
    await this.setForeignStateAsync(`${yesterdayBase}.routeRankingText`, this.topRankingText(routeSorted, 5), true);
    const historyId = `${base}.history.daily`;
    const history = await this.readJsonState(historyId, []);
    const entry = {
      date: storedDate,
      totalFlights,
      landings,
      departures,
      overflights,
      bestHour: bestHour.hour,
      bestHourFlights: bestHour.total,
      topAirline,
      topRoute,
      a380Count,
      specialLiveryCount
    };
    const limitedHistory = [entry, ...history.filter((item) => this.clean(item == null ? void 0 : item.date) !== storedDate)].slice(0, 365);
    const historyText = limitedHistory.slice(0, 14).map((item) => {
      const best = item.bestHour ? ` \xB7 beste Zeit ${item.bestHour}` : "";
      const special = Number(item.specialLiveryCount || 0) > 0 ? ` \xB7 \u2B50 ${item.specialLiveryCount}` : "";
      const heavy = Number(item.heavyAircraftCount || 0) > 0 ? ` \xB7 Heavy ${item.heavyAircraftCount}` : "";
      const a380 = Number(item.a380Count || 0) > 0 ? ` \xB7 A380 ${item.a380Count}` : "";
      const b747 = Number(item.b747Count || 0) > 0 ? ` \xB7 B747 ${item.b747Count}` : "";
      return `${item.date}: ${item.totalFlights} Fl\xFCge${best}${heavy}${a380}${b747}${special}`;
    }).join("\n");
    await this.setForeignStateAsync(historyId, JSON.stringify(limitedHistory), true);
    await this.setForeignStateAsync(`${base}.history.dailyText`, historyText, true);
    const currentBestDayFlights = await this.readNumberState(`${base}.alltime.bestDayFlights`);
    if (totalFlights > currentBestDayFlights) {
      await this.setForeignStateAsync(`${base}.alltime.bestDayDate`, storedDate, true);
      await this.setForeignStateAsync(`${base}.alltime.bestDayFlights`, totalFlights, true);
    }
    const currentBestSpecial = await this.readNumberState(`${base}.alltime.bestSpecialDayCount`);
    if (specialLiveryCount > currentBestSpecial) {
      await this.setForeignStateAsync(`${base}.alltime.bestSpecialDayDate`, storedDate, true);
      await this.setForeignStateAsync(`${base}.alltime.bestSpecialDayCount`, specialLiveryCount, true);
    }
    await this.setForeignStateAsync(
      `${base}.alltime.a380Count`,
      await this.readNumberState(`${base}.alltime.a380Count`) + a380Count,
      true
    );
    await this.setForeignStateAsync(
      `${base}.alltime.specialLiveryCount`,
      await this.readNumberState(`${base}.alltime.specialLiveryCount`) + specialLiveryCount,
      true
    );
    const alltimeHourly = await this.readJsonState(`${base}.alltime.hourly`, {});
    for (const [hour, value] of Object.entries(hourly || {})) {
      alltimeHourly[hour] = (alltimeHourly[hour] || 0) + Number((value == null ? void 0 : value.total) || 0);
    }
    const bestAlltimeHour = Object.entries(alltimeHourly).filter(([, count]) => Number(count || 0) > 0).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0) || Number(a[0]) - Number(b[0]))[0];
    await this.setForeignStateAsync(`${base}.alltime.hourly`, JSON.stringify(alltimeHourly), true);
    await this.setForeignStateAsync(
      `${base}.alltime.bestHour`,
      bestAlltimeHour ? `${bestAlltimeHour[0]}:00` : "",
      true
    );
    await this.setForeignStateAsync(
      `${base}.alltime.bestHourFlights`,
      bestAlltimeHour ? Number(bestAlltimeHour[1] || 0) : 0,
      true
    );
    const alltimeAirlines = this.mergeRanking(
      await this.readJsonState(`${base}.alltime.airlineRanking`, {}),
      airlineRanking
    );
    const alltimeRoutes = this.mergeRanking(
      await this.readJsonState(`${base}.alltime.routeRanking`, {}),
      routeRanking
    );
    const alltimeAirlineSorted = this.sortedRanking(alltimeAirlines, 50);
    const alltimeRouteSorted = this.sortedRanking(alltimeRoutes, 50);
    await this.setForeignStateAsync(
      `${base}.alltime.airlineRanking`,
      JSON.stringify(Object.fromEntries(alltimeAirlineSorted)),
      true
    );
    await this.setForeignStateAsync(
      `${base}.alltime.airlineRankingText`,
      this.topRankingText(alltimeAirlineSorted, 8),
      true
    );
    await this.setForeignStateAsync(
      `${base}.alltime.routeRanking`,
      JSON.stringify(Object.fromEntries(alltimeRouteSorted)),
      true
    );
    await this.setForeignStateAsync(
      `${base}.alltime.routeRankingText`,
      this.topRankingText(alltimeRouteSorted, 8),
      true
    );
    await this.setForeignStateAsync(
      `${base}.alltime.bestAirline`,
      alltimeAirlineSorted.length ? `${alltimeAirlineSorted[0][0]} \xB7 ${alltimeAirlineSorted[0][1]}` : "",
      true
    );
    await this.setForeignStateAsync(
      `${base}.alltime.bestRoute`,
      alltimeRouteSorted.length ? `${alltimeRouteSorted[0][0]} \xB7 ${alltimeRouteSorted[0][1]}` : "",
      true
    );
    const aircraftTypeRanking = await this.readJsonState(`${base}.aircraftTypeRanking`, {});
    const aircraftTypeSorted = this.sortedRanking(aircraftTypeRanking, 50);
    await this.setForeignStateAsync(
      `${base}.alltime.bestAircraftType`,
      aircraftTypeSorted.length ? `${aircraftTypeSorted[0][0]} \xB7 ${aircraftTypeSorted[0][1]}` : "",
      true
    );
    this.log.info(`[JetFrame] Tagesstatistik archiviert: ${storedDate} \xB7 ${totalFlights} Fl\xFCge`);
  }
  todayDateKey() {
    const d = /* @__PURE__ */ new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  async resetTodayStatisticsIfNeeded(base) {
    const todayBase = `${base}.today`;
    const today = this.todayDateKey();
    let storedDate = "";
    try {
      const st = await this.getForeignStateAsync(`${todayBase}.date`);
      storedDate = this.clean(st == null ? void 0 : st.val);
    } catch {
      storedDate = "";
    }
    if (storedDate === today) {
      return;
    }
    await this.archiveTodayStatistics(base, storedDate);
    await this.setForeignStateAsync(`${todayBase}.date`, today, true);
    await this.setForeignStateAsync(`${todayBase}.totalFlights`, 0, true);
    await this.setForeignStateAsync(`${todayBase}.landings`, 0, true);
    await this.setForeignStateAsync(`${todayBase}.departures`, 0, true);
    await this.setForeignStateAsync(`${todayBase}.overflights`, 0, true);
    await this.setForeignStateAsync(`${todayBase}.firstSeen`, "", true);
    await this.setForeignStateAsync(`${todayBase}.lastSeen`, "", true);
    await this.setForeignStateAsync(`${todayBase}.lastFlight`, "", true);
    await this.setForeignStateAsync(`${todayBase}.lastAirline`, "", true);
    await this.setForeignStateAsync(`${todayBase}.lastRoute`, "", true);
    await this.setForeignStateAsync(`${todayBase}.lastRegistration`, "", true);
    await this.setForeignStateAsync(`${todayBase}.topAirline`, "", true);
    await this.setForeignStateAsync(`${todayBase}.topRoute`, "", true);
    await this.setForeignStateAsync(`${todayBase}.airlineRanking`, "{}", true);
    await this.setForeignStateAsync(`${todayBase}.airlineRankingText`, "", true);
    await this.setForeignStateAsync(`${todayBase}.routeRanking`, "{}", true);
    await this.setForeignStateAsync(`${todayBase}.routeRankingText`, "", true);
    await this.setForeignStateAsync(`${todayBase}.hourly`, JSON.stringify(this.emptyHourlyStats()), true);
    await this.setForeignStateAsync(`${todayBase}.hourlyText`, "", true);
    await this.setForeignStateAsync(`${todayBase}.bestSpotterHour`, "", true);
    await this.setForeignStateAsync(`${todayBase}.currentHourFlights`, 0, true);
    await this.setForeignStateAsync(`${todayBase}.rushHourNow`, false, true);
    await this.setForeignStateAsync(`${todayBase}.rushHourText`, "", true);
    await this.setForeignStateAsync(`${todayBase}.a380Count`, 0, true);
    await this.setForeignStateAsync(`${todayBase}.b747Count`, 0, true);
    await this.setForeignStateAsync(`${todayBase}.heavyAircraftCount`, 0, true);
    await this.setForeignStateAsync(`${todayBase}.specialLiveryCount`, 0, true);
  }
  emptyHourlyStats() {
    const result = {};
    for (let h = 0; h < 24; h++) {
      const key = String(h).padStart(2, "0");
      result[key] = {
        total: 0,
        landings: 0,
        departures: 0,
        overflights: 0
      };
    }
    return result;
  }
  async updateTodayHourlyStatistics(todayBase, mode) {
    var _a;
    const now = /* @__PURE__ */ new Date();
    const hour = String(now.getHours()).padStart(2, "0");
    const hourly = await this.readJsonState(`${todayBase}.hourly`, this.emptyHourlyStats());
    if (!hourly[hour]) {
      hourly[hour] = {
        total: 0,
        landings: 0,
        departures: 0,
        overflights: 0
      };
    }
    hourly[hour].total += 1;
    if (mode === "LANDING") {
      hourly[hour].landings += 1;
    } else if (mode === "TAKEOFF") {
      hourly[hour].departures += 1;
    } else if (mode === "OVERFLIGHT") {
      hourly[hour].overflights += 1;
    }
    const entries = Object.entries(hourly).sort((a, b) => Number(a[0]) - Number(b[0]));
    const activeEntries = entries.filter(([, v]) => v.total > 0);
    const hourlyText = activeEntries.map(([h, v]) => `${h}:00 \xB7 ${v.total} (${v.landings}\u{1F6EC} ${v.departures}\u{1F6EB} ${v.overflights}\u{1F6E9}\uFE0F)`).join("\n");
    const best = activeEntries.slice().sort((a, b) => b[1].total - a[1].total || Number(a[0]) - Number(b[0]))[0];
    const currentHourTotal = ((_a = hourly[hour]) == null ? void 0 : _a.total) || 0;
    const avgActive = activeEntries.length > 0 ? activeEntries.reduce((sum, [, v]) => sum + v.total, 0) / activeEntries.length : 0;
    const rushHourNow = currentHourTotal >= 5 && currentHourTotal >= Math.max(3, Math.ceil(avgActive * 1.35));
    const rushHourText = rushHourNow ? `\u{1F525} Rushhour: ${currentHourTotal} Fl\xFCge seit ${hour}:00` : currentHourTotal > 0 ? `Aktuelle Stunde: ${currentHourTotal} Fl\xFCge` : "";
    await this.setForeignStateAsync(`${todayBase}.hourly`, JSON.stringify(hourly), true);
    await this.setForeignStateAsync(`${todayBase}.hourlyText`, hourlyText, true);
    await this.setForeignStateAsync(
      `${todayBase}.bestSpotterHour`,
      best ? `${best[0]}:00 \xB7 ${best[1].total} Fl\xFCge` : "",
      true
    );
    await this.setForeignStateAsync(`${todayBase}.currentHourFlights`, currentHourTotal, true);
    await this.setForeignStateAsync(`${todayBase}.rushHourNow`, rushHourNow, true);
    await this.setForeignStateAsync(`${todayBase}.rushHourText`, rushHourText, true);
  }
  async updateTodayStatistics(base, a, info) {
    var _a;
    await this.resetTodayStatisticsIfNeeded(base);
    const todayBase = `${base}.today`;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const total = await this.readNumberState(`${todayBase}.totalFlights`) + 1;
    await this.setForeignStateAsync(`${todayBase}.totalFlights`, total, true);
    if (info.mode === "LANDING") {
      await this.setForeignStateAsync(
        `${todayBase}.landings`,
        await this.readNumberState(`${todayBase}.landings`) + 1,
        true
      );
    } else if (info.mode === "TAKEOFF") {
      await this.setForeignStateAsync(
        `${todayBase}.departures`,
        await this.readNumberState(`${todayBase}.departures`) + 1,
        true
      );
    } else if (info.mode === "OVERFLIGHT") {
      await this.setForeignStateAsync(
        `${todayBase}.overflights`,
        await this.readNumberState(`${todayBase}.overflights`) + 1,
        true
      );
    }
    try {
      const firstSeen = this.clean((_a = await this.getForeignStateAsync(`${todayBase}.firstSeen`)) == null ? void 0 : _a.val);
      if (!firstSeen) {
        await this.setForeignStateAsync(`${todayBase}.firstSeen`, nowIso, true);
      }
    } catch {
      await this.setForeignStateAsync(`${todayBase}.firstSeen`, nowIso, true);
    }
    await this.setForeignStateAsync(`${todayBase}.lastSeen`, nowIso, true);
    await this.setForeignStateAsync(`${todayBase}.lastFlight`, info.callsign, true);
    await this.setForeignStateAsync(`${todayBase}.lastAirline`, info.airline, true);
    await this.setForeignStateAsync(`${todayBase}.lastRoute`, info.route, true);
    await this.setForeignStateAsync(`${todayBase}.lastRegistration`, info.registration, true);
    const airlineRanking = await this.readJsonState(`${todayBase}.airlineRanking`, {});
    airlineRanking[info.airline] = (airlineRanking[info.airline] || 0) + 1;
    const airlineSorted = Object.entries(airlineRanking).sort((aEntry, bEntry) => bEntry[1] - aEntry[1] || aEntry[0].localeCompare(bEntry[0])).slice(0, 20);
    const airlineText = airlineSorted.slice(0, 5).map(([name, count], index) => `${index + 1}. ${name} \xB7 ${count}`).join("\n");
    await this.setForeignStateAsync(
      `${todayBase}.airlineRanking`,
      JSON.stringify(Object.fromEntries(airlineSorted)),
      true
    );
    await this.setForeignStateAsync(`${todayBase}.airlineRankingText`, airlineText, true);
    await this.setForeignStateAsync(
      `${todayBase}.topAirline`,
      airlineSorted.length ? `${airlineSorted[0][0]} \xB7 ${airlineSorted[0][1]}` : "",
      true
    );
    if (info.route) {
      const routeRanking = await this.readJsonState(`${todayBase}.routeRanking`, {});
      routeRanking[info.route] = (routeRanking[info.route] || 0) + 1;
      const routeSorted = Object.entries(routeRanking).filter(([routeName]) => {
        const r = this.clean(routeName);
        return r && !r.includes("?") && r.includes("\u2192");
      }).sort((aEntry, bEntry) => bEntry[1] - aEntry[1] || aEntry[0].localeCompare(bEntry[0])).slice(0, 20);
      const routeText = routeSorted.slice(0, 5).map(([name, count], index) => `${index + 1}. ${name} \xB7 ${count}`).join("\n");
      await this.setForeignStateAsync(
        `${todayBase}.routeRanking`,
        JSON.stringify(Object.fromEntries(routeSorted)),
        true
      );
      await this.setForeignStateAsync(`${todayBase}.routeRankingText`, routeText, true);
      await this.setForeignStateAsync(
        `${todayBase}.topRoute`,
        routeSorted.length ? `${routeSorted[0][0]} \xB7 ${routeSorted[0][1]}` : "",
        true
      );
    }
    if (this.isA380(a)) {
      await this.setForeignStateAsync(
        `${todayBase}.a380Count`,
        await this.readNumberState(`${todayBase}.a380Count`) + 1,
        true
      );
    }
    if (this.isB747(a)) {
      await this.setForeignStateAsync(
        `${todayBase}.b747Count`,
        await this.readNumberState(`${todayBase}.b747Count`) + 1,
        true
      );
    }
    if (this.isHeavyAircraft(a)) {
      await this.setForeignStateAsync(
        `${todayBase}.heavyAircraftCount`,
        await this.readNumberState(`${todayBase}.heavyAircraftCount`) + 1,
        true
      );
    }
    if (this.isSpecialFlight(a)) {
      await this.setForeignStateAsync(
        `${todayBase}.specialLiveryCount`,
        await this.readNumberState(`${todayBase}.specialLiveryCount`) + 1,
        true
      );
    }
    await this.updateTodayHourlyStatistics(todayBase, info.mode);
  }
  async updateStatistics(dpRoot, a) {
    const base = `${dpRoot}.statistics`;
    const mode = String(a.mode || "").toUpperCase();
    const callsign = this.clean(a.routeCallsign || a.callsign || a.hex || "");
    const airline = this.clean(a.airlineName || "Unbekannte Airline");
    const registration = this.clean(a.registration || "");
    const origin = this.clean(a.originIata || "");
    const dest = this.clean(a.destIata || "");
    const route = origin && dest ? `${origin} \u2192 ${dest}` : "";
    await this.setForeignStateAsync(
      `${base}.totalFlightsSeen`,
      await this.readNumberState(`${base}.totalFlightsSeen`) + 1,
      true
    );
    if (mode === "LANDING") {
      await this.setForeignStateAsync(
        `${base}.landings`,
        await this.readNumberState(`${base}.landings`) + 1,
        true
      );
    } else if (mode === "TAKEOFF") {
      await this.setForeignStateAsync(
        `${base}.departures`,
        await this.readNumberState(`${base}.departures`) + 1,
        true
      );
    } else if (mode === "OVERFLIGHT") {
      await this.setForeignStateAsync(
        `${base}.overflights`,
        await this.readNumberState(`${base}.overflights`) + 1,
        true
      );
    }
    await this.setForeignStateAsync(`${base}.lastFlight`, callsign, true);
    await this.setForeignStateAsync(`${base}.lastAirline`, airline, true);
    await this.setForeignStateAsync(`${base}.lastRoute`, route, true);
    await this.setForeignStateAsync(`${base}.lastRegistration`, registration, true);
    await this.setForeignStateAsync(`${base}.lastSeen`, (/* @__PURE__ */ new Date()).toISOString(), true);
    const ranking = await this.readJsonState(`${base}.airlineRanking`, {});
    ranking[airline] = (ranking[airline] || 0) + 1;
    const sorted = Object.entries(ranking).sort((aEntry, bEntry) => bEntry[1] - aEntry[1] || aEntry[0].localeCompare(bEntry[0])).slice(0, 20);
    const rankingJson = Object.fromEntries(sorted);
    const rankingText = sorted.slice(0, 5).map(([name, count], index) => `${index + 1}. ${name} \xB7 ${count}`).join("\n");
    await this.setForeignStateAsync(`${base}.airlineRanking`, JSON.stringify(rankingJson), true);
    await this.setForeignStateAsync(`${base}.airlineRankingText`, rankingText, true);
    await this.updateGlobalDetailedStatistics(base, a, {
      mode,
      callsign,
      airline,
      registration,
      route
    });
    await this.updateTodayStatistics(base, a, {
      mode,
      callsign,
      airline,
      registration,
      route
    });
  }
  async loop() {
    try {
      this.clearTimer();
      const config = (0, import_config.readConfig)(this);
      if (!config.enabled) {
        await this.setForeignStateAsync(`${config.dpRoot}.status`, "disabled", true);
        this.scheduleNext(config.searchPollSeconds);
        return;
      }
      if (this.liveTarget) {
        await this.liveLoop();
      } else {
        await this.searchLoop();
      }
    } catch (e) {
      this.logError(`JetFrame Fehler: ${this.errorText(e)}`);
      const config = (0, import_config.readConfig)(this);
      this.scheduleNext(config.searchPollSeconds);
    }
  }
  async searchLoop() {
    const config = (0, import_config.readConfig)(this);
    this.log.debug("Search Loop gestartet");
    await this.setForeignStateAsync(`${config.dpRoot}.status`, "searching", true);
    const data = await (0, import_adsb.fetchAdsb)(
      config,
      this.httpJsonRaw.bind(this),
      this.delay.bind(this),
      this.logDebug.bind(this)
    );
    this.log.debug("[JetFrame] ADSB Fetch OK");
    const aircraft = (0, import_adsb.parseAircraft)(data);
    this.log.debug(`[JetFrame] ADSB parsed: ${aircraft.length}`);
    this.log.debug(`Aircraft parsed: ${aircraft.length}`);
    const matches = (0, import_classify.getMatches)(config, aircraft);
    if (matches.length) {
      await this.updateIdleRunway(matches[0], config);
    }
    this.log.debug(`Matches gefunden: ${matches.length}`);
    await this.setForeignStateAsync(`${config.dpRoot}.lastUpdate`, (/* @__PURE__ */ new Date()).toISOString(), true);
    await this.setForeignStateAsync(`${config.dpRoot}.allCount`, aircraft.length, true);
    await this.setForeignStateAsync(`${config.dpRoot}.matchCount`, matches.length, true);
    if (!matches.length) {
      await this.setForeignStateAsync(
        `${config.dpRoot}.current.text`,
        `Kein Start/Landung/\xDCberflug bei ${config.airport.iata}`,
        true
      );
      this.scheduleNext(config.searchPollSeconds);
      return;
    }
    this.log.debug(
      `Best Match: ${matches[0].callsign || matches[0].hex || "?"} | alt=${matches[0].altFt}ft | mode=${matches[0].mode}`
    );
    await this.startNewFlight(matches[0]);
  }
  async liveLoop() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
    const config = (0, import_config.readConfig)(this);
    const elapsed = (Date.now() - this.liveStarted) / 1e3;
    const data = await (0, import_adsb.fetchAdsb)(
      config,
      this.httpJsonRaw.bind(this),
      this.delay.bind(this),
      this.logDebug.bind(this)
    );
    const aircraft = (0, import_adsb.parseAircraft)(data);
    const matches = (0, import_classify.getMatches)(config, aircraft);
    await this.setForeignStateAsync(`${config.dpRoot}.lastUpdate`, (/* @__PURE__ */ new Date()).toISOString(), true);
    await this.setForeignStateAsync(`${config.dpRoot}.allCount`, aircraft.length, true);
    await this.setForeignStateAsync(`${config.dpRoot}.matchCount`, matches.length, true);
    const live = this.findCurrentLive(matches, this.liveTarget);
    const bestNow = matches[0];
    if (bestNow && !live && this.isDifferentAircraft(bestNow, this.liveTarget)) {
      this.log.info(`Neues Flugzeug erkannt, schalte um: ${bestNow.callsign || bestNow.hex}`);
      await this.startNewFlight(bestNow);
      return;
    }
    if (elapsed >= config.liveMaxSeconds) {
      this.liveTarget = null;
      this.liveStarted = 0;
      this.liveInfo = null;
      await (0, import_states.clearFlight)(this, `${config.dpRoot}.current`);
      await this.setForeignStateAsync(`${config.dpRoot}.status`, "cleared", true);
      this.scheduleNext(config.searchPollSeconds);
      return;
    }
    if (!live) {
      this.liveTarget = null;
      this.liveStarted = 0;
      this.log.info("Live Flug verloren");
      await (0, import_states.clearFlight)(this, `${config.dpRoot}.current`);
      await this.setForeignStateAsync(`${config.dpRoot}.status`, "lost", true);
      this.scheduleNext(config.searchPollSeconds);
      return;
    }
    const bases = [`${config.dpRoot}.current`];
    if (((_a = this.liveTarget) == null ? void 0 : _a.mode) === "OVERFLIGHT") {
      bases.push(`${config.dpRoot}.overflight`);
    } else {
      bases.push(`${config.dpRoot}.airport`);
    }
    const enrichedLive = {
      ...this.liveInfo || {},
      ...live,
      // Diese Werte kommen nur aus saveImages()/enrichFlightInfo
      // und dürfen vom Live-ADS-B-Update nicht wieder leer überschrieben werden.
      localLogoUrl: ((_b = this.liveInfo) == null ? void 0 : _b.localLogoUrl) || live.localLogoUrl || "",
      localImageUrl: ((_c = this.liveInfo) == null ? void 0 : _c.localImageUrl) || live.localImageUrl || "",
      finalImageUrl: ((_d = this.liveInfo) == null ? void 0 : _d.finalImageUrl) || live.finalImageUrl || "",
      logoUrl: ((_e = this.liveInfo) == null ? void 0 : _e.logoUrl) || live.logoUrl || "",
      routeCallsign: ((_f = this.liveInfo) == null ? void 0 : _f.routeCallsign) || live.routeCallsign || live.callsign || "",
      aircraftModel: ((_g = this.liveInfo) == null ? void 0 : _g.aircraftModel) || live.aircraftModel || live.aircraftType || live.type || "",
      isSpecial: ((_h = this.liveInfo) == null ? void 0 : _h.isSpecial) || live.isSpecial || false,
      specialText: ((_i = this.liveInfo) == null ? void 0 : _i.specialText) || live.specialText || "",
      specialLiveryTitle: ((_j = this.liveInfo) == null ? void 0 : _j.specialLiveryTitle) || live.specialLiveryTitle || "",
      specialLiveryDescription: ((_k = this.liveInfo) == null ? void 0 : _k.specialLiveryDescription) || live.specialLiveryDescription || "",
      specialLiveryFull: ((_l = this.liveInfo) == null ? void 0 : _l.specialLiveryFull) || live.specialLiveryFull || "",
      specialLiveryVisText: ((_m = this.liveInfo) == null ? void 0 : _m.specialLiveryVisText) || live.specialLiveryVisText || ""
    };
    await this.applyProbableRunway(enrichedLive, config);
    this.liveInfo = {
      ...enrichedLive
    };
    for (const base of bases) {
      await (0, import_states.writeFlight)(this, base, enrichedLive);
    }
    await this.setForeignStateAsync(`${config.dpRoot}.status`, "live", true);
    this.scheduleNext(config.livePollSeconds);
  }
  async applySpecialLivery(a, dpRoot) {
    const reg = this.clean(a.registration).toUpperCase();
    if (!reg) {
      return;
    }
    try {
      const st = await this.getForeignStateAsync(`${dpRoot}.specialLiveries`);
      const raw = String((st == null ? void 0 : st.val) || "").trim();
      if (!raw || raw === "[]") {
        return;
      }
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) {
        return;
      }
      const hit = list.find((item) => {
        const itemReg = this.clean(item == null ? void 0 : item.registration).toUpperCase();
        return itemReg && itemReg === reg;
      });
      if (!hit) {
        return;
      }
      const emoji = this.clean(hit.emoji) || "\u{1F3A8}";
      const title = this.clean(hit.title) || this.clean(hit.type) || "Special Livery";
      const description = this.clean(hit.description);
      const airline = this.clean(hit.airline);
      a.isSpecial = true;
      a.specialLiveryTitle = title;
      a.specialLiveryDescription = description;
      a.specialLiveryFull = description || title;
      a.specialLiveryVisText = `${emoji} ${title}`;
      a.specialText = `${emoji} ${title}${airline ? ` \xB7 ${airline}` : ""}`;
      this.log.info(`Special Livery erkannt: ${reg} \xB7 ${title}`);
    } catch (e) {
      this.logWarn(`Special-Livery Match Fehler: ${this.errorText(e)}`);
    }
  }
  async startNewFlight(rawMatch) {
    const config = (0, import_config.readConfig)(this);
    const startKey = this.flightKey(rawMatch);
    const now = Date.now();
    if (startKey && startKey === this.lastStartKey && now - this.lastStartTs < 15e3) {
      this.log.debug(`Gleicher Flug wurde gerade erst gestartet \u2192 ignoriere: ${startKey}`);
      this.scheduleNext(config.livePollSeconds);
      return;
    }
    this.lastStartKey = startKey;
    this.lastStartTs = now;
    this.log.debug(`Starte neuen Flug: ${rawMatch.callsign || rawMatch.hex}`);
    const best = await (0, import_flightInfo.enrichFlightInfo)(
      this,
      config,
      rawMatch,
      this.httpJson.bind(this),
      this.httpText.bind(this),
      this.logDebug.bind(this),
      this.logWarn.bind(this)
    );
    await this.applySpecialLivery(best, config.dpRoot);
    await this.applyProbableRunway(best, config);
    this.log.info(
      `Neuer Flug: callsign=${best.callsign || ""} route=${best.originIata || "?"} \u2192 ${best.destIata || "?"} | ${best.originName || "?"} \u2192 ${best.destName || "?"}${best.probableRunwayText ? ` | ${best.probableRunwayText}` : ""}`
    );
    await this.updateStatistics(config.dpRoot, best);
    this.liveTarget = {
      hex: best.hex,
      callsign: best.callsign,
      mode: best.mode
    };
    const imageSaveKey = this.flightKey(best);
    if (imageSaveKey && imageSaveKey !== this.lastImageSaveKey) {
      await (0, import_images.saveImages)(this, config, best, this.logDebug.bind(this), this.logWarn.bind(this));
      this.lastImageSaveKey = imageSaveKey;
    }
    this.liveInfo = {
      ...best
    };
    this.liveStarted = Date.now();
    await (0, import_states.writeFlight)(this, `${config.dpRoot}.current`, best);
    if (best.mode === "OVERFLIGHT") {
      await (0, import_states.writeFlight)(this, `${config.dpRoot}.overflight`, best);
    } else {
      await (0, import_states.writeFlight)(this, `${config.dpRoot}.airport`, best);
    }
    await this.setForeignStateAsync(`${config.dpRoot}.status`, "live", true);
    this.scheduleNext(config.livePollSeconds);
  }
  findCurrentLive(matches, target) {
    if (!matches.length || !target) {
      return null;
    }
    return matches.find((a) => {
      const aHex = this.clean(a.hex).toLowerCase();
      const tHex = this.clean(target.hex).toLowerCase();
      const aCall = this.clean(a.callsign).toUpperCase();
      const tCall = this.clean(target.callsign).toUpperCase();
      if (aHex && tHex && aHex === tHex) {
        return true;
      }
      if (aCall && tCall && aCall === tCall) {
        return true;
      }
      return false;
    }) || null;
  }
  isDifferentAircraft(a, target) {
    if (!a || !target) {
      return false;
    }
    const aHex = this.clean(a.hex).toLowerCase();
    const tHex = this.clean(target.hex).toLowerCase();
    const aCall = this.clean(a.callsign).toUpperCase();
    const tCall = this.clean(target.callsign).toUpperCase();
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
  flightKey(a) {
    const hex = this.clean(a.hex).toLowerCase();
    const cs = this.clean(a.callsign).toUpperCase();
    if (cs) {
      return `CS:${cs}`;
    }
    if (hex) {
      return `HEX:${hex}`;
    }
    return "";
  }
  scheduleStatisticsRotation(dpRoot) {
    if (this.statisticsTimer) {
      this.clearInterval(this.statisticsTimer);
      this.statisticsTimer = null;
    }
    this.statisticsTimer = this.setInterval(() => {
      this.resetTodayStatisticsIfNeeded(`${dpRoot}.statistics`).catch((e) => {
        this.logWarn(`Tagesstatistik-Rotation fehlgeschlagen: ${this.errorText(e)}`);
      });
    }, 6e4);
  }
  clearStatisticsTimer() {
    if (this.statisticsTimer) {
      this.clearInterval(this.statisticsTimer);
      this.statisticsTimer = null;
    }
  }
  scheduleNext(seconds) {
    this.timer = this.setTimeout(() => this.loop(), seconds * 1e3);
  }
  clearTimer() {
    if (this.timer) {
      this.clearTimeout(this.timer);
      this.timer = null;
    }
  }
  async httpJson(url) {
    const res = await this.httpRequest(url, {
      timeout: 12e3,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "application/json,text/plain,*/*",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
        Pragma: "no-cache"
      }
    });
    if (typeof res === "string") {
      return JSON.parse(res);
    }
    return res;
  }
  async httpJsonRaw(url) {
    const res = await this.httpRequest(url, {
      timeout: 2e4,
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json,text/plain,*/*"
      }
    });
    if (typeof res === "string") {
      const text = res.trim();
      if (text.startsWith("<")) {
        throw new Error("HTML statt JSON erhalten");
      }
      return JSON.parse(text);
    }
    return res;
  }
  async httpText(url) {
    const res = await this.httpRequest(url, {
      timeout: 15e3,
      headers: {
        "User-Agent": "Mozilla/5.0 AppleWebKit/605.1.15 Safari/604.1",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
        Referer: "https://www.google.com/"
      }
    });
    return String(res || "");
  }
  httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith("https") ? https : http;
      const req = client.get(
        url,
        {
          headers: options.headers || {},
          timeout: options.timeout || 15e3
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => {
            body += chunk;
          });
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              this.httpRequest(res.headers.location, options).then(resolve).catch(reject);
              return;
            }
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode} bei ${url}`));
              return;
            }
            resolve(body);
          });
        }
      );
      req.on("error", reject);
      req.setTimeout(options.timeout || 15e3, () => {
        req.destroy(new Error(`timeout of ${options.timeout || 15e3}ms exceeded`));
      });
    });
  }
  async ensureMetaObject() {
    const id = `${this.namespace}.meta`;
    try {
      const obj = await this.getObjectAsync(id);
      if (!obj) {
        await this.setObjectAsync(id, {
          type: "meta",
          common: {
            name: "JetFrame Files",
            type: "meta.user"
          },
          native: {}
        });
        this.log.info("Meta-Objekt f\xFCr Dateien erstellt");
      }
    } catch (e) {
      this.log.error(`Meta-Objekt Fehler: ${this.errorText(e)}`);
    }
  }
  logDebug(msg) {
    this.log.debug(`[JetFrame] ${msg}`);
  }
  logWarn(msg) {
    this.log.warn(`[JetFrame] \u26A0\uFE0F ${msg}`);
  }
  logError(msg) {
    this.log.error(`[JetFrame] \u274C ${msg}`);
  }
  clean(v) {
    if (v === null || v === void 0) {
      return "";
    }
    if (typeof v === "string") {
      return v.trim();
    }
    if (typeof v === "number" || typeof v === "boolean") {
      return String(v).trim();
    }
    return "";
  }
  errorText(e) {
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
      return Object.prototype.toString.call(e);
    }
  }
  onUnload(callback) {
    try {
      this.clearTimer();
      this.clearStatisticsTimer();
      callback();
    } catch {
      callback();
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new Jetframe(options);
} else {
  (() => new Jetframe())();
}
//# sourceMappingURL=main.js.map
