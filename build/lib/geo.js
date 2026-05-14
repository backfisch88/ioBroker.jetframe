'use strict';
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
	for (var name in all) __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
	if ((from && typeof from === 'object') || typeof from === 'function') {
		for (let key of __getOwnPropNames(from))
			if (!__hasOwnProp.call(to, key) && key !== except)
				__defProp(to, key, {
					get: () => from[key],
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
				});
	}
	return to;
};
var __toCommonJS = mod => __copyProps(__defProp({}, '__esModule', { value: true }), mod);
var geo_exports = {};
__export(geo_exports, {
	bearingDeg: () => bearingDeg,
	deg2rad: () => deg2rad,
	distanceNm: () => distanceNm,
	normalizeDeg: () => normalizeDeg,
	rad2deg: () => rad2deg,
	round: () => round,
	signedAngleDiff: () => signedAngleDiff,
	smallestAngleDiff: () => smallestAngleDiff,
});
module.exports = __toCommonJS(geo_exports);
function deg2rad(d) {
	return (d * Math.PI) / 180;
}
function rad2deg(r) {
	return (r * 180) / Math.PI;
}
function normalizeDeg(d) {
	if (!Number.isFinite(d)) return 0;
	return ((d % 360) + 360) % 360;
}
function smallestAngleDiff(a, b) {
	let diff = Math.abs(normalizeDeg(a) - normalizeDeg(b));
	if (diff > 180) diff = 360 - diff;
	return diff;
}
function signedAngleDiff(targetDeg, referenceDeg) {
	return ((normalizeDeg(targetDeg) - normalizeDeg(referenceDeg) + 540) % 360) - 180;
}
function distanceNm(lat1, lon1, lat2, lon2) {
	const R = 3440.065;
	const dLat = deg2rad(lat2 - lat1);
	const dLon = deg2rad(lon2 - lon1);
	const a = Math.sin(dLat / 2) ** 2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function bearingDeg(lat1, lon1, lat2, lon2) {
	const phi1 = deg2rad(lat1);
	const phi2 = deg2rad(lat2);
	const lambda1 = deg2rad(lon1);
	const lambda2 = deg2rad(lon2);
	const y = Math.sin(lambda2 - lambda1) * Math.cos(phi2);
	const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(lambda2 - lambda1);
	return normalizeDeg(rad2deg(Math.atan2(y, x)));
}
function round(v, digits) {
	const f = Math.pow(10, digits);
	return Math.round(Number(v || 0) * f) / f;
}
// Annotate the CommonJS export names for ESM import in node:
0 &&
	(module.exports = {
		bearingDeg,
		deg2rad,
		distanceNm,
		normalizeDeg,
		rad2deg,
		round,
		signedAngleDiff,
		smallestAngleDiff,
	});
//# sourceMappingURL=geo.js.map
