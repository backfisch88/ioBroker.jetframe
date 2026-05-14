export function deg2rad(d: number): number {
	return d * Math.PI / 180;
}

export function rad2deg(r: number): number {
	return r * 180 / Math.PI;
}

export function normalizeDeg(d: number): number {
	if (!Number.isFinite(d)) return 0;
	return ((d % 360) + 360) % 360;
}

export function smallestAngleDiff(a: number, b: number): number {
	let diff = Math.abs(normalizeDeg(a) - normalizeDeg(b));
	if (diff > 180) diff = 360 - diff;
	return diff;
}
export function signedAngleDiff(
	targetDeg: number,
	referenceDeg: number,
): number {
	return ((normalizeDeg(targetDeg) - normalizeDeg(referenceDeg) + 540) % 360) - 180;
}
export function distanceNm(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number,
): number {
	const R = 3440.065;

	const dLat = deg2rad(lat2 - lat1);
	const dLon = deg2rad(lon2 - lon1);

	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(deg2rad(lat1)) *
		Math.cos(deg2rad(lat2)) *
		Math.sin(dLon / 2) ** 2;

	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function bearingDeg(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number,
): number {
	const phi1 = deg2rad(lat1);
	const phi2 = deg2rad(lat2);
	const lambda1 = deg2rad(lon1);
	const lambda2 = deg2rad(lon2);

	const y = Math.sin(lambda2 - lambda1) * Math.cos(phi2);

	const x =
		Math.cos(phi1) * Math.sin(phi2) -
		Math.sin(phi1) * Math.cos(phi2) * Math.cos(lambda2 - lambda1);

	return normalizeDeg(rad2deg(Math.atan2(y, x)));
}

export function round(v: number, digits: number): number {
	const f = Math.pow(10, digits);
	return Math.round(Number(v || 0) * f) / f;
}