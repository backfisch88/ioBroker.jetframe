import type { Aircraft, JetFrameConfig } from './types';

export type HttpJsonRaw = (url: string) => Promise<any>;

function clean(v: unknown): string {
	return String(v || '').trim();
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
 *
 * @param config
 * @param httpJsonRaw
 * @param logWarn
 */
export async function fetchAdsb(
	config: JetFrameConfig,
	httpJsonRaw: HttpJsonRaw,
	logWarn: (msg: string) => void,
): Promise<any> {
	const urls = buildAdsbUrls(config);

	const aircraftByKey: Record<string, any> = {};

	for (const url of urls) {
		let body: any = null;

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

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
}

function errorText(e: unknown): string {
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
