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
var https = __toESM(require("https"));
var http = __toESM(require("http"));
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
  liveTarget = null;
  liveInfo = null;
  liveStarted = 0;
  lastStartKey = "";
  lastStartTs = 0;
  constructor(options = {}) {
    super({
      ...options,
      name: "jetframe"
    });
    this.on("ready", this.onReady.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  async onReady() {
    this.log.info("JetFrame Adapter gestartet");
    await (0, import_staticFiles.copyStaticFiles)(this);
    try {
      const config = (0, import_config.readConfig)(this);
      await (0, import_states.ensureStates)(this, config);
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
    const data = await (0, import_adsb.fetchAdsb)(config, this.httpJsonRaw.bind(this), this.logWarn.bind(this));
    this.log.debug("[JetFrame] ADSB Fetch OK");
    const aircraft = (0, import_adsb.parseAircraft)(data);
    this.log.debug(`[JetFrame] ADSB parsed: ${aircraft.length}`);
    this.log.debug(`Aircraft parsed: ${aircraft.length}`);
    const matches = (0, import_classify.getMatches)(config, aircraft);
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
    var _a, _b, _c, _d, _e, _f, _g;
    const config = (0, import_config.readConfig)(this);
    const elapsed = (Date.now() - this.liveStarted) / 1e3;
    const data = await (0, import_adsb.fetchAdsb)(config, this.httpJsonRaw.bind(this), this.logWarn.bind(this));
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
      aircraftModel: ((_g = this.liveInfo) == null ? void 0 : _g.aircraftModel) || live.aircraftModel || live.aircraftType || live.type || ""
    };
    this.liveInfo = {
      ...enrichedLive
    };
    this.liveInfo = {
      ...enrichedLive
    };
    for (const base of bases) {
      await (0, import_states.writeFlight)(this, base, enrichedLive);
    }
    await this.setForeignStateAsync(`${config.dpRoot}.status`, "live", true);
    this.scheduleNext(config.livePollSeconds);
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
    this.log.info(
      `Neuer Flug: callsign=${best.callsign || ""} route=${best.originIata || "?"} \u2192 ${best.destIata || "?"} | ${best.originName || "?"} \u2192 ${best.destName || "?"}`
    );
    this.liveTarget = {
      hex: best.hex,
      callsign: best.callsign,
      mode: best.mode
    };
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
    await (0, import_images.saveImages)(this, config, best, this.logDebug.bind(this), this.logWarn.bind(this));
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
  scheduleNext(seconds) {
    this.timer = setTimeout(() => this.loop(), seconds * 1e3);
  }
  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
  async httpJson(url) {
    const res = await this.httpRequest(url, {
      timeout: 12e3,
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json,text/plain,*/*"
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
    const config = (0, import_config.readConfig)(this);
    this.log.debug(`[JetFrame] ${msg}`);
  }
  logWarn(msg) {
    this.log.warn(`[JetFrame] \u26A0\uFE0F ${msg}`);
  }
  logError(msg) {
    this.log.error(`[JetFrame] \u274C ${msg}`);
  }
  clean(v) {
    return String(v || "").trim();
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
      return String(e);
    }
  }
  onUnload(callback) {
    try {
      this.clearTimer();
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
