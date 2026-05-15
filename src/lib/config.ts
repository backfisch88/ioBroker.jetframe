import type { JetFrameConfig } from './types';

type NativeConfig = Record<string, any>;

function cfgStr(native: NativeConfig, key: string, def: string): string {
	const v = native[key];

	return v !== undefined && v !== null && String(v).trim() !== '' ? String(v).trim() : def;
}

function cfgNum(native: NativeConfig, key: string, def: number): number {
	const n = Number(native[key]);
	return Number.isFinite(n) ? n : def;
}

function cfgBool(native: NativeConfig, key: string, def: boolean): boolean {
	const v = native[key];

	if (v === true || v === 'true') {
		return true;
	}
	if (v === false || v === 'false') {
		return false;
	}

	return def;
}

/**
 *
 */
export function readConfig(adapter: any): JetFrameConfig {
	const native = adapter.config as NativeConfig;

	return {
		enabled: cfgBool(native, 'enabled', true),

		homeLat: cfgNum(native, 'homeLat', 50.08637),
		homeLon: cfgNum(native, 'homeLon', 8.69163),

		airport: {
			iata: cfgStr(native, 'airportIata', 'FRA').toUpperCase(),
			icao: cfgStr(native, 'airportIcao', 'EDDF').toUpperCase(),
			name: cfgStr(native, 'airportName', 'Frankfurt'),
			lat: cfgNum(native, 'airportLat', 50.035686),
			lon: cfgNum(native, 'airportLon', 8.562813),
		},

		radiusNm: cfgNum(native, 'radiusNm', 15),
		adsbCustomUrl: cfgStr(native, 'adsbCustomUrl', ''),
		maxHomeDistanceNm: cfgNum(native, 'maxHomeDistanceNm', 3.5),

		searchPollSeconds: cfgNum(native, 'searchPollSeconds', 20),
		livePollSeconds: cfgNum(native, 'livePollSeconds', 5),
		liveMaxSeconds: cfgNum(native, 'liveMaxSeconds', 120),

		windowBearingDeg: cfgNum(native, 'windowBearingDeg', 184),
		windowFovDeg: cfgNum(native, 'windowFovDeg', 120),

		minAltitudeFt: cfgNum(native, 'minAltitudeFt', 1000),
		maxAltitudeFt: cfgNum(native, 'maxAltitudeFt', 5000),

		autoRunwayTrackToleranceDeg: cfgNum(native, 'autoRunwayTrackToleranceDeg', 65),
		minClimbRate: cfgNum(native, 'minClimbRate', 60),
		minSinkRate: cfgNum(native, 'minSinkRate', -60),

		overflightEnabled: cfgBool(native, 'overflightEnabled', false),
		overflightOnly: cfgBool(native, 'overflightOnly', false),
		priorityEnabled: cfgBool(native, 'priorityEnabled', true),
		prioritySpecialLivery: cfgBool(native, 'prioritySpecialLivery', true),
		priorityAircraftSize: cfgBool(native, 'priorityAircraftSize', true),
		priorityMilitaryGov: cfgBool(native, 'priorityMilitaryGov', true),
		emergencyPriorityEnabled: cfgBool(native, 'emergencyPriorityEnabled', true),
		emergencySpeechEnabled: cfgBool(native, 'emergencySpeechEnabled', true),
		emergencySquawk7500: cfgBool(native, 'emergencySquawk7500', true),
		emergencySquawk7600: cfgBool(native, 'emergencySquawk7600', true),
		emergencySquawk7700: cfgBool(native, 'emergencySquawk7700', true),
		overflightMaxDistanceNm: cfgNum(native, 'overflightMaxDistanceNm', 1.2),
		overflightMinAltitudeFt: cfgNum(native, 'overflightMinAltitudeFt', 4000),
		overflightMaxAltitudeFt: cfgNum(native, 'overflightMaxAltitudeFt', 45000),
		overflightRequiresWindow: cfgBool(native, 'overflightRequiresWindow', false),

		speechEnabled: cfgBool(native, 'speechEnabled', true),

		speechMode: cfgStr(native, 'speechMode', 'browser') as 'browser' | 'external' | 'both' | 'off',
		speechTemplate: cfgStr(
			native,
			'speechTemplate',
			'{modeSpeechText}: {airlineName} {bestCallsign} {routeDirectionText} {routeOtherAirport} in {altitudeFt} Fuss. {windowPositionSpeechText}.',
		),

		dpRoot: adapter.namespace,
		airportJsonDp: `${adapter.namespace}.airportjson`,
	};
}
