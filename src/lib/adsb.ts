import type { Aircraft, JetFrameConfig } from './types';

/** HTTP helper type: fetches a URL and returns the parsed JSON body. */
export type HttpJsonRaw = (url: string) => Promise<unknown>;

const ADSB_ERROR_STATE: Record<string, { count: number; lastWarn: number }> = {};
const ADSB_ERROR_STATE_MAX_KEYS = 20;

function clean(v: unknown): string {
	if (v === null || v === undefined) {
		return '';
	}
	if (typeof v === 'string') {
		return v.trim();
	}
	if (typeof v === 'number' || typeof v === 'boolean') {
		return String(v).trim();
	}
	return '';
}

function toNumber(v: unknown): number | null {
	if (v === null || v === undefined || v === '') {
		return null;
	}
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

function parseAltitude(v: unknown): number {
	if (v === null || v === undefined) {
		return 0;
	}

	if (typeof v === 'string') {
		if (v.toLowerCase() === 'ground') {
			return 0;
		}
		const n = Number(v);
		return Number.isFinite(n) ? n : 0;
	}

	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
}

/**
 * Fetches current ADS-B traffic for the configured airport/area.
 * Tries adsb.lol first, falling back to adsb.fi on error.
 *
 * @param config adapter configuration
 * @param httpJsonRaw HTTP helper that fetches and parses JSON
 * @param delayFn delay implementation used between retries. In production this
 *   is always `this.delay.bind(this)` from the adapter base class, so the
 *   retry pause is properly tracked and cancelled by ioBroker on unload.
 * @param logDebug optional debug logger
 */
export async function fetchAdsb(
	config: JetFrameConfig,
	httpJsonRaw: HttpJsonRaw,
	delayFn: (ms: number) => Promise<void>,
	logDebug?: (msg: string) => void,
): Promise<any> {
	const urls = buildAdsbUrls(config);

	const aircraftByKey: Record<string, any> = {};

	for (const primaryUrl of urls) {
		const sources: Array<{ name: string; url: string }> = [{ name: 'adsb.lol', url: primaryUrl }];

		const fallbackUrl = buildAdsbFiFallbackUrl(primaryUrl);

		if (fallbackUrl) {
			sources.push({ name: 'adsb.fi', url: fallbackUrl });
		}

		let body: any = null;
		let usedSource = '';

		for (const source of sources) {
			const maxAttempts = source.name === 'adsb.lol' ? 1 : 2;

			if (source.name !== 'adsb.lol') {
				logDebug?.(`ADSB adsb.lol failed – trying ${source.name} fallback`);
			}

			for (let attempt = 1; attempt <= maxAttempts; attempt++) {
				try {
					body = await httpJsonRaw(source.url);
					usedSource = source.name;

					if (source.name !== 'adsb.lol') {
						logDebug?.(`ADSB fallback active: ${source.name}`);
					}

					logDebug?.(`ADSB source: ${source.name}`);

					break;
				} catch (e) {
					const errText = errorText(e);
					const isSoftAdsbError =
						errText.includes('HTTP 502') ||
						errText.includes('HTTP 503') ||
						errText.toLowerCase().includes('timeout') ||
						errText.includes('Received HTML instead of JSON');

					const key = `${source.name}:${source.url}`;
					const now = Date.now();
					const st = ADSB_ERROR_STATE[key] || { count: 0, lastWarn: 0 };

					st.count++;

					if (!isSoftAdsbError || now - st.lastWarn > 300000) {
						if (isSoftAdsbError) {
							logDebug?.(`ADSB ${source.name} temporarily unreachable (${errText})`);
						} else {
							logDebug?.(`ADSB ${source.name} error attempt ${attempt}: ${errText}`);
						}

						st.lastWarn = now;
					}

					ADSB_ERROR_STATE[key] = st;

					// Defensive bound: this map is normally tiny (one entry per
					// configured ADS-B source), but reset it if it ever grows
					// unexpectedly large instead of retaining entries forever.
					if (Object.keys(ADSB_ERROR_STATE).length > ADSB_ERROR_STATE_MAX_KEYS) {
						for (const k of Object.keys(ADSB_ERROR_STATE)) {
							delete ADSB_ERROR_STATE[k];
						}
					}

					if (attempt < maxAttempts) {
						await delayFn(1500);
					}
				}
			}

			if (body) {
				break;
			}
		}

		if (!body) {
			continue;
		}

		if (usedSource) {
			logDebug?.(`ADSB data received via ${usedSource}`);
		}

		const arr = Array.isArray(body?.aircraft) ? body.aircraft : Array.isArray(body?.ac) ? body.ac : [];

		for (const item of arr) {
			const key = clean(
				item.hex ||
					item.icao ||
					item.flight ||
					item.call ||
					item.callsign ||
					`${item.lat}_${item.lon}_${item.alt_baro || item.alt_geom || ''}`,
			).toLowerCase();

			if (!key) {
				continue;
			}

			aircraftByKey[key] = item;
		}
	}

	return {
		aircraft: Object.values(aircraftByKey),
	};
}

function buildAdsbUrls(config: JetFrameConfig): string[] {
	const anyConfig = config as any;

	const customUrl = clean(anyConfig.adsbCustomUrl || anyConfig.customAdsbUrl || '');

	if (customUrl) {
		return [replaceAdsbUrlTokens(customUrl, config)];
	}

	const airportLat = Number(anyConfig.airport?.lat ?? anyConfig.airportLat ?? config.homeLat);

	const airportLon = Number(anyConfig.airport?.lon ?? anyConfig.airportLon ?? config.homeLon);

	const airportRadiusNm = Math.max(Number(anyConfig.radiusNm || 0), 1);

	const urls = [`https://api.adsb.lol/v2/lat/${airportLat}/lon/${airportLon}/dist/${airportRadiusNm}`];

	if (anyConfig.overflightEnabled || anyConfig.overflightOnly) {
		const homeRadiusNm = Math.max(Number(anyConfig.overflightMaxDistanceNm || 0), 1);

		const homeUrl =
			`https://api.adsb.lol/v2/lat/${config.homeLat}` + `/lon/${config.homeLon}` + `/dist/${homeRadiusNm}`;

		if (!urls.includes(homeUrl)) {
			urls.push(homeUrl);
		}
	}

	return urls;
}

function buildAdsbFiFallbackUrl(url: string): string {
	const m = String(url || '').match(/\/lat\/([^/]+)\/lon\/([^/]+)\/dist\/([^/?#]+)/);

	if (!m) {
		return '';
	}

	const lat = m[1];
	const lon = m[2];
	const dist = m[3];

	if (!lat || !lon || !dist) {
		return '';
	}

	return `https://opendata.adsb.fi/api/v3/lat/${lat}/lon/${lon}/dist/${dist}`;
}

function replaceAdsbUrlTokens(url: string, config: JetFrameConfig): string {
	const anyConfig = config as any;

	const airportLat = String(anyConfig.airport?.lat ?? anyConfig.airportLat ?? config.homeLat);

	const airportLon = String(anyConfig.airport?.lon ?? anyConfig.airportLon ?? config.homeLon);

	const airportRadiusNm = String(anyConfig.radiusNm || 15);

	const overflightRadiusNm = String(anyConfig.overflightMaxDistanceNm || airportRadiusNm);

	return String(url || '')
		.replace(/\{homeLat\}/g, String(config.homeLat))
		.replace(/\{homeLon\}/g, String(config.homeLon))
		.replace(/\{airportLat\}/g, airportLat)
		.replace(/\{airportLon\}/g, airportLon)
		.replace(/\{radiusNm\}/g, airportRadiusNm)
		.replace(/\{airportRadiusNm\}/g, airportRadiusNm)
		.replace(/\{overflightRadiusNm\}/g, overflightRadiusNm);
}

/**
 *
 * @param body
 */
export function parseAircraft(body: any): Aircraft[] {
	if (!body) {
		return [];
	}

	const arr = Array.isArray(body.aircraft) ? body.aircraft : Array.isArray(body.ac) ? body.ac : [];

	return arr
		.map(
			(a: any): Aircraft => ({
				hex: clean(a.hex || ''),
				callsign: clean(a.flight || a.call || a.callsign || ''),
				type: clean(a.t || a.type || ''),
				registration: clean(a.r || a.reg || ''),

				squawk: clean(a.squawk || a.squawk_code || a.squawkCode || ''),
				emergency: clean(a.emergency || ''),

				lat: toNumber(a.lat) ?? 0,
				lon: toNumber(a.lon) ?? 0,

				altFt: parseAltitude(a.alt_baro || a.alt_geom || a.altitude),
				speedKt: toNumber(a.gs || a.spd || a.speed) ?? 0,
				trackDeg: toNumber(a.track || a.trak || a.heading) ?? 0,
				verticalRate: toNumber(a.baro_rate || a.geom_rate || a.vsi) ?? 0,

				seenSec: toNumber(a.seen || a.seen_pos || 0) ?? 999,
			}),
		)
		.filter(
			(a: Aircraft) =>
				Number.isFinite(a.lat) &&
				Number.isFinite(a.lon) &&
				a.lat !== 0 &&
				a.lon !== 0 &&
				Number.isFinite(a.seenSec) &&
				a.seenSec <= 90,
		);
}

function errorText(e: unknown): string {
	if (!e) {
		return 'unknown error';
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
		// Last-resort fallback for values JSON.stringify can't handle
		// (e.g. circular references). Object.prototype.toString.call()
		// is always type-safe, unlike a bare String(e) coercion.
		return Object.prototype.toString.call(e);
	}
}
