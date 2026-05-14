import * as utils from '@iobroker/adapter-core';
import * as https from 'https';
import * as http from 'http';

import type { Aircraft } from './lib/types';
import { copyStaticFiles } from './lib/staticFiles';
import { updateAirportJson } from './lib/airports';
import { updateSpecialLiveries } from './lib/specialLiveries';
import { readConfig } from './lib/config';
import { fetchAdsb, parseAircraft } from './lib/adsb';
import { getMatches } from './lib/classify';
import { ensureStates, writeFlight, clearFlight } from './lib/states';

import { ensureImageDirs, saveImages } from './lib/images';

import { enrichFlightInfo } from './lib/flightInfo';

class Jetframe extends utils.Adapter {
	private timer: NodeJS.Timeout | null = null;
	private liveTarget: Partial<Aircraft> | null = null;
	private liveInfo: Partial<Aircraft> | null = null;
	private liveStarted = 0;
	private lastStartKey = '';
	private lastStartTs = 0;

	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: 'jetframe',
		});

		this.on('ready', this.onReady.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	private async onReady(): Promise<void> {
		this.log.info('JetFrame Adapter gestartet');
		await copyStaticFiles(this);

		try {
			const config = readConfig(this);

			await ensureStates(this, config);
			this.log.debug('[JetFrame] States OK');

			await ensureImageDirs(this, this.logDebug.bind(this), this.logWarn.bind(this));
			this.log.debug('[JetFrame] Images OK');

			updateAirportJson(this, this.logDebug.bind(this), this.logWarn.bind(this)).catch(e => {
				this.logWarn(`Airport DB Update Fehler: ${this.errorText(e)}`);
			});
			updateSpecialLiveries(this, this.logDebug.bind(this), this.logWarn.bind(this)).catch(e => {
				this.logWarn(`Special-Liveries DB Update Fehler: ${this.errorText(e)}`);
			});

			this.log.debug('[JetFrame] Starte Loop');

			this.loop().catch(e => {
				this.logError(`Loop Start Fehler: ${this.errorText(e)}`);
			});
		} catch (e) {
			this.logError(`onReady Fehler: ${this.errorText(e)}`);
		}
	}

	private async loop(): Promise<void> {
		try {
			this.clearTimer();

			const config = readConfig(this);

			if (!config.enabled) {
				await this.setForeignStateAsync(`${config.dpRoot}.status`, 'disabled', true);

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

			const config = readConfig(this);
			this.scheduleNext(config.searchPollSeconds);
		}
	}

	private async searchLoop(): Promise<void> {
		const config = readConfig(this);

		this.log.debug('Search Loop gestartet');

		await this.setForeignStateAsync(`${config.dpRoot}.status`, 'searching', true);

		const data = await fetchAdsb(config, this.httpJsonRaw.bind(this), this.logWarn.bind(this));

		this.log.debug('[JetFrame] ADSB Fetch OK');

		const aircraft = parseAircraft(data);
		this.log.debug(`[JetFrame] ADSB parsed: ${aircraft.length}`);
		this.log.debug(`Aircraft parsed: ${aircraft.length}`);

		const matches = getMatches(config, aircraft);

		this.log.debug(`Matches gefunden: ${matches.length}`);

		await this.setForeignStateAsync(`${config.dpRoot}.lastUpdate`, new Date().toISOString(), true);

		await this.setForeignStateAsync(`${config.dpRoot}.allCount`, aircraft.length, true);

		await this.setForeignStateAsync(`${config.dpRoot}.matchCount`, matches.length, true);

		if (!matches.length) {
			await this.setForeignStateAsync(
				`${config.dpRoot}.current.text`,
				`Kein Start/Landung/Überflug bei ${config.airport.iata}`,
				true,
			);

			this.scheduleNext(config.searchPollSeconds);
			return;
		}

		this.log.debug(
			`Best Match: ${matches[0].callsign || matches[0].hex || '?'} | alt=${matches[0].altFt}ft | mode=${matches[0].mode}`,
		);

		await this.startNewFlight(matches[0]);
	}

	private async liveLoop(): Promise<void> {
		const config = readConfig(this);

		const elapsed = (Date.now() - this.liveStarted) / 1000;

		const data = await fetchAdsb(config, this.httpJsonRaw.bind(this), this.logWarn.bind(this));

		const aircraft = parseAircraft(data);

		const matches = getMatches(config, aircraft);

		await this.setForeignStateAsync(`${config.dpRoot}.lastUpdate`, new Date().toISOString(), true);

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

			await clearFlight(this, `${config.dpRoot}.current`);

			await this.setForeignStateAsync(`${config.dpRoot}.status`, 'cleared', true);

			this.scheduleNext(config.searchPollSeconds);
			return;
		}

		if (!live) {
			this.liveTarget = null;
			this.liveStarted = 0;

			this.log.info('Live Flug verloren');

			await clearFlight(this, `${config.dpRoot}.current`);

			await this.setForeignStateAsync(`${config.dpRoot}.status`, 'lost', true);

			this.scheduleNext(config.searchPollSeconds);
			return;
		}

		const bases = [`${config.dpRoot}.current`];

		if (this.liveTarget?.mode === 'OVERFLIGHT') {
			bases.push(`${config.dpRoot}.overflight`);
		} else {
			bases.push(`${config.dpRoot}.airport`);
		}

		const enrichedLive: Aircraft = {
			...(this.liveInfo || {}),
			...live,

			// Diese Werte kommen nur aus saveImages()/enrichFlightInfo
			// und dürfen vom Live-ADS-B-Update nicht wieder leer überschrieben werden.
			localLogoUrl: this.liveInfo?.localLogoUrl || live.localLogoUrl || '',
			localImageUrl: this.liveInfo?.localImageUrl || live.localImageUrl || '',
			finalImageUrl: this.liveInfo?.finalImageUrl || live.finalImageUrl || '',
			logoUrl: this.liveInfo?.logoUrl || live.logoUrl || '',
			routeCallsign: this.liveInfo?.routeCallsign || live.routeCallsign || live.callsign || '',
			aircraftModel: this.liveInfo?.aircraftModel || live.aircraftModel || live.aircraftType || live.type || '',
		};

		this.liveInfo = {
			...enrichedLive,
		};

		this.liveInfo = {
			...enrichedLive,
		};

		for (const base of bases) {
			await writeFlight(this, base, enrichedLive);
		}

		await this.setForeignStateAsync(`${config.dpRoot}.status`, 'live', true);

		this.scheduleNext(config.livePollSeconds);
	}

	private async startNewFlight(rawMatch: Aircraft): Promise<void> {
		const config = readConfig(this);

		const startKey = this.flightKey(rawMatch);
		const now = Date.now();

		if (startKey && startKey === this.lastStartKey && now - this.lastStartTs < 15000) {
			this.log.debug(`Gleicher Flug wurde gerade erst gestartet → ignoriere: ${startKey}`);

			this.scheduleNext(config.livePollSeconds);
			return;
		}

		this.lastStartKey = startKey;
		this.lastStartTs = now;

		this.log.debug(`Starte neuen Flug: ${rawMatch.callsign || rawMatch.hex}`);

		const best = await enrichFlightInfo(
			this,
			config,
			rawMatch,
			this.httpJson.bind(this),
			this.httpText.bind(this),
			this.logDebug.bind(this),
			this.logWarn.bind(this),
		);

		this.log.info(
			`Neuer Flug: callsign=${best.callsign || ''} route=${best.originIata || '?'} → ${best.destIata || '?'} | ${best.originName || '?'} → ${best.destName || '?'}`,
		);

		this.liveTarget = {
			hex: best.hex,
			callsign: best.callsign,
			mode: best.mode,
		};

		this.liveInfo = {
			...best,
		};

		this.liveStarted = Date.now();

		await writeFlight(this, `${config.dpRoot}.current`, best);

		if (best.mode === 'OVERFLIGHT') {
			await writeFlight(this, `${config.dpRoot}.overflight`, best);
		} else {
			await writeFlight(this, `${config.dpRoot}.airport`, best);
		}

		await saveImages(this, config, best, this.logDebug.bind(this), this.logWarn.bind(this));

		await this.setForeignStateAsync(`${config.dpRoot}.status`, 'live', true);

		this.scheduleNext(config.livePollSeconds);
	}

	private findCurrentLive(matches: Aircraft[], target: Partial<Aircraft> | null): Aircraft | null {
		if (!matches.length || !target) {
			return null;
		}

		return (
			matches.find(a => {
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
			}) || null
		);
	}

	private isDifferentAircraft(a: Aircraft | null | undefined, target: Partial<Aircraft> | null): boolean {
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

	private flightKey(a: Aircraft): string {
		const hex = this.clean(a.hex).toLowerCase();
		const cs = this.clean(a.callsign).toUpperCase();

		if (cs) {
			return `CS:${cs}`;
		}
		if (hex) {
			return `HEX:${hex}`;
		}

		return '';
	}

	private scheduleNext(seconds: number): void {
		this.timer = setTimeout(() => this.loop(), seconds * 1000);
	}

	private clearTimer(): void {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}

	private async httpJson(url: string): Promise<any> {
		const res = await this.httpRequest(url, {
			timeout: 12000,
			headers: {
				'User-Agent': 'Mozilla/5.0',
				Accept: 'application/json,text/plain,*/*',
			},
		});

		if (typeof res === 'string') {
			return JSON.parse(res);
		}

		return res;
	}

	private async httpJsonRaw(url: string): Promise<any> {
		const res = await this.httpRequest(url, {
			timeout: 20000,
			headers: {
				'User-Agent': 'Mozilla/5.0',
				Accept: 'application/json,text/plain,*/*',
			},
		});

		if (typeof res === 'string') {
			const text = res.trim();

			if (text.startsWith('<')) {
				throw new Error('HTML statt JSON erhalten');
			}

			return JSON.parse(text);
		}

		return res;
	}

	private async httpText(url: string): Promise<string> {
		const res = await this.httpRequest(url, {
			timeout: 15000,
			headers: {
				'User-Agent': 'Mozilla/5.0 AppleWebKit/605.1.15 Safari/604.1',

				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',

				'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',

				Referer: 'https://www.google.com/',
			},
		});

		return String(res || '');
	}

	private httpRequest(
		url: string,
		options: {
			timeout?: number;
			headers?: Record<string, string>;
		} = {},
	): Promise<string> {
		return new Promise((resolve, reject) => {
			const client = url.startsWith('https') ? https : http;

			const req = client.get(
				url,
				{
					headers: options.headers || {},
					timeout: options.timeout || 15000,
				},
				res => {
					let body = '';

					res.on('data', chunk => {
						body += chunk;
					});

					res.on('end', () => {
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
				},
			);

			req.on('error', reject);

			req.setTimeout(options.timeout || 15000, () => {
				req.destroy(new Error(`timeout of ${options.timeout || 15000}ms exceeded`));
			});
		});
	}

	private async ensureMetaObject(): Promise<void> {
		const id = `${this.namespace}.meta`;

		try {
			const obj = await this.getObjectAsync(id);

			if (!obj) {
				await this.setObjectAsync(id, {
					type: 'meta',
					common: {
						name: 'JetFrame Files',
						type: 'meta.user',
					},
					native: {},
				});

				this.log.info('Meta-Objekt für Dateien erstellt');
			}
		} catch (e) {
			this.log.error(`Meta-Objekt Fehler: ${this.errorText(e)}`);
		}
	}

	private logDebug(msg: string): void {
		const config = readConfig(this);
		this.log.debug(`[JetFrame] ${msg}`);
	}

	private logWarn(msg: string): void {
		this.log.warn(`[JetFrame] ⚠️ ${msg}`);
	}

	private logError(msg: string): void {
		this.log.error(`[JetFrame] ❌ ${msg}`);
	}

	private clean(v: unknown): string {
		return String(v || '').trim();
	}

	private errorText(e: unknown): string {
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

	private onUnload(callback: () => void): void {
		try {
			this.clearTimer();
			callback();
		} catch {
			callback();
		}
	}
}

if (require.main !== module) {
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Jetframe(options);
} else {
	(() => new Jetframe())();
}
