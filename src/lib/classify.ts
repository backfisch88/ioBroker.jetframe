import type { Aircraft, JetFrameConfig } from './types';
import { bearingDeg, distanceNm, smallestAngleDiff, signedAngleDiff } from './geo';

/**
 *
 */
export function enrichAircraft(config: JetFrameConfig, a: Aircraft): Aircraft {
	const bearingHomeDeg = bearingDeg(config.homeLat, config.homeLon, a.lat, a.lon);

	const distHomeNm = distanceNm(config.homeLat, config.homeLon, a.lat, a.lon);

	const distAirportNm = distanceNm(config.airport.lat, config.airport.lon, a.lat, a.lon);

	const bearingAircraftToAirportDeg = bearingDeg(a.lat, a.lon, config.airport.lat, config.airport.lon);

	const bearingAirportToAircraftDeg = bearingDeg(config.airport.lat, config.airport.lon, a.lat, a.lon);

	const landingTrackDiffDeg = smallestAngleDiff(a.trackDeg, bearingAircraftToAirportDeg);

	const takeoffTrackDiffDeg = smallestAngleDiff(a.trackDeg, bearingAirportToAircraftDeg);

	const airportTrackDiffDeg = Math.min(landingTrackDiffDeg, takeoffTrackDiffDeg);

	/**
	 * SIGNED DIFFERENCE
	 *
	 * < 0 = links vom Fenster
	 * > 0 = rechts vom Fenster
	 */
	const windowDiffDeg = signedAngleDiff(bearingHomeDeg, config.windowBearingDeg);

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

		inWindow: windowDiffAbsDeg <= config.windowFovDeg / 2,
	};
}

/**
 *
 */
export function classifyAircraft(config: JetFrameConfig, a: Aircraft): Aircraft {
	const isLanding =
		(a.verticalRate || 0) <= config.minSinkRate &&
		(a.landingTrackDiffDeg || 999) <= config.autoRunwayTrackToleranceDeg;

	const isTakeoff =
		(a.verticalRate || 0) >= config.minClimbRate &&
		(a.takeoffTrackDiffDeg || 999) <= config.autoRunwayTrackToleranceDeg;

	if (isLanding) {
		return {
			...a,
			mode: 'LANDING',
			icon: '🛬',
			directionText: `nach ${config.airport.iata}`,
			relevant: true,
			priority: 1,
		};
	}

	if (isTakeoff) {
		return {
			...a,
			mode: 'TAKEOFF',
			icon: '🛫',
			directionText: `von ${config.airport.iata}`,
			relevant: true,
			priority: 2,
		};
	}

	const isOverflight =
		(config.overflightOnly || config.overflightEnabled) &&
		(a.distHomeNm || 999) <= config.overflightMaxDistanceNm &&
		a.altFt >= config.overflightMinAltitudeFt &&
		a.altFt <= config.overflightMaxAltitudeFt &&
		(!config.overflightRequiresWindow || !!a.inWindow);

	if (isOverflight) {
		return {
			...a,
			mode: 'OVERFLIGHT',
			icon: '🛩️',
			directionText: 'Überflug',
			relevant: true,
			priority: 3,
		};
	}

	return {
		...a,
		relevant: false,
	};
}

/**
 *
 */
export function getMatches(config: JetFrameConfig, aircraft: Aircraft[]): Aircraft[] {
	const enriched = aircraft.map(a => enrichAircraft(config, a));

	// Overflight-Only:
	// rein geografisch um Zuhause.
	// Keine Start-/Landungslogik.
	// Keine Flughafen-/Routenlogik.
	if (config.overflightOnly) {
		return enriched
			.filter(
				a =>
					(a.distHomeNm || 999) <= config.overflightMaxDistanceNm &&
					a.altFt >= config.overflightMinAltitudeFt &&
					a.altFt <= config.overflightMaxAltitudeFt &&
					(!config.overflightRequiresWindow || !!a.inWindow),
			)
			.map(a => ({
				...a,
				mode: 'OVERFLIGHT' as const,
				icon: '🛩️',
				directionText: 'Überflug',
				relevant: true,
				priority: 1,
			}))
			.sort(sortOverflightAircraft);
	}

	return enriched
		.filter(a => {
			if (a.inWindow) {
				return true;
			}

			if (
				config.overflightEnabled &&
				!config.overflightRequiresWindow &&
				(a.distHomeNm || 999) <= config.overflightMaxDistanceNm &&
				a.altFt >= config.overflightMinAltitudeFt &&
				a.altFt <= config.overflightMaxAltitudeFt
			) {
				return true;
			}

			return false;
		})
		.filter(a => {
			if (
				config.overflightEnabled &&
				!config.overflightRequiresWindow &&
				(a.distHomeNm || 999) <= config.overflightMaxDistanceNm &&
				a.altFt >= config.overflightMinAltitudeFt &&
				a.altFt <= config.overflightMaxAltitudeFt
			) {
				return true;
			}

			return (a.distHomeNm || 999) <= config.maxHomeDistanceNm;
		})
		.filter(a => {
			if (
				config.overflightEnabled &&
				!config.overflightRequiresWindow &&
				(a.distHomeNm || 999) <= config.overflightMaxDistanceNm &&
				a.altFt >= config.overflightMinAltitudeFt &&
				a.altFt <= config.overflightMaxAltitudeFt
			) {
				return true;
			}

			return a.altFt >= config.minAltitudeFt && a.altFt <= config.maxAltitudeFt;
		})
		.map(a => classifyAircraft(config, a))
		.filter(a => a.relevant)
		.sort(sortAircraft);
}

function sortOverflightAircraft(a: Aircraft, b: Aircraft): number {
	const sa = (a.distHomeNm || 999) * 1000 + Math.abs(a.windowDiffDeg || 0) * 20 + (a.seenSec || 0) * 5 + a.altFt / 50;

	const sb = (b.distHomeNm || 999) * 1000 + Math.abs(b.windowDiffDeg || 0) * 20 + (b.seenSec || 0) * 5 + b.altFt / 50;

	return sa - sb;
}

function sortAircraft(a: Aircraft, b: Aircraft): number {
	if ((a.priority || 99) !== (b.priority || 99)) {
		return (a.priority || 99) - (b.priority || 99);
	}

	const sa =
		(a.distHomeNm || 0) * 250 + a.altFt + Math.abs(a.windowDiffDeg || 0) * 25 + (a.airportTrackDiffDeg || 0) * 8;

	const sb =
		(b.distHomeNm || 0) * 250 + b.altFt + Math.abs(b.windowDiffDeg || 0) * 25 + (b.airportTrackDiffDeg || 0) * 8;

	return sa - sb;
}

/**
 *
 */
export function findCurrentLive(matches: Aircraft[], target: Aircraft | null): Aircraft | null {
	if (!matches.length || !target) {
		return null;
	}

	const targetHex = clean(target.hex).toLowerCase();
	const targetCall = clean(target.callsign).toUpperCase();

	return (
		matches.find(a => {
			const aHex = clean(a.hex).toLowerCase();
			const aCall = clean(a.callsign).toUpperCase();

			if (aHex && targetHex && aHex === targetHex) {
				return true;
			}
			if (aCall && targetCall && aCall === targetCall) {
				return true;
			}

			return false;
		}) || null
	);
}

/**
 *
 */
export function isDifferentAircraft(a: Aircraft | null, target: Aircraft | null): boolean {
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

/**
 *
 */
export function flightKey(a: Aircraft | null): string {
	if (!a) {
		return '';
	}

	const hex = clean(a.hex).toLowerCase();
	const cs = clean(a.callsign).toUpperCase();

	if (cs) {
		return `CS:${cs}`;
	}
	if (hex) {
		return `HEX:${hex}`;
	}

	return '';
}

function clean(v: unknown): string {
	return String(v || '').trim();
}
