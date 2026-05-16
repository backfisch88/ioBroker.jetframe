import type { Aircraft, JetFrameConfig } from './types';
import { round } from './geo';

const LAST_SPEECH_TRIGGER: Record<string, string> = {};

/**
 *
 */
export async function ensureState(
	adapter: any,
	id: string,
	def: ioBroker.StateValue,
	type: ioBroker.CommonType,
	role: string,
): Promise<void> {
	const obj = await adapter.getForeignObjectAsync(id);

	if (!obj) {
		await adapter.setForeignObjectAsync(id, {
			type: 'state',
			common: {
				name: id.split('.').pop() || id,
				type,
				role,
				read: true,
				write: true,
			},
			native: {},
		});

		await adapter.setForeignStateAsync(id, def, true);
	}
}

/**
 *
 */
export async function ensureBaseStates(adapter: any, config: JetFrameConfig): Promise<void> {
	await ensureState(adapter, `${config.dpRoot}.enabled`, config.enabled !== false, 'boolean', 'switch');

	await adapter.setForeignStateAsync(`${config.dpRoot}.enabled`, config.enabled !== false, true);
	await ensureState(adapter, `${config.dpRoot}.status`, 'init', 'string', 'text');
	await ensureState(adapter, `${config.dpRoot}.lastUpdate`, '', 'string', 'text');
	await ensureState(adapter, `${config.dpRoot}.allCount`, 0, 'number', 'value');
	await ensureState(adapter, `${config.dpRoot}.matchCount`, 0, 'number', 'value');

	await ensureState(adapter, config.airportJsonDp, '[]', 'string', 'json');
	await ensureState(adapter, `${config.dpRoot}.airportjsonLastUpdate`, '', 'string', 'text');
	await ensureState(adapter, `${config.dpRoot}.specialLiveries`, '[]', 'string', 'json');
	await ensureState(adapter, `${config.dpRoot}.specialLiveriesLastUpdate`, '', 'string', 'text');

	await ensureState(adapter, `${config.dpRoot}.speechMode`, 'browser', 'string', 'text');
	await ensureState(
		adapter,
		`${config.dpRoot}.speechTemplate`,
		'{modeSpeechText}: {airlineName} {bestCallsign} {routeDirectionText} {routeOtherAirport} in {altitudeFt} Fuß. {windowPositionSpeechText}.',
		'string',
		'text',
	);

	await adapter.setForeignStateAsync(`${config.dpRoot}.speechMode`, config.speechMode || 'browser', true);

	// speechEnabled Master
	try {
		const speechEnabledObj = await adapter.getForeignObjectAsync(`${config.dpRoot}.speechEnabled`);
		if (!speechEnabledObj) {
			await adapter.setForeignObjectAsync(`${config.dpRoot}.speechEnabled`, {
				type: 'state',
				common: {
					name: 'Sprachausgabe aktiv',
					type: 'boolean',
					role: 'switch',
					read: true,
					write: true,
					def: true,
				},
				native: {},
			});
		}

		const speechEnabledState = await adapter.getForeignStateAsync(`${config.dpRoot}.speechEnabled`);
		if (speechEnabledState?.val === null || speechEnabledState?.val === undefined) {
			await adapter.setForeignStateAsync(`${config.dpRoot}.speechEnabled`, true, true);
		}
	} catch {
		// ignore
	}
	await adapter.setForeignStateAsync(
		`${config.dpRoot}.speechTemplate`,
		config.speechTemplate ||
			'{modeSpeechText}: {airlineName} {bestCallsign} {routeDirectionText} {routeOtherAirport} in {altitudeFt} Fuss. {windowPositionSpeechText}.',
		true,
	);

	await ensureFlightStates(adapter, `${config.dpRoot}.current`);
	await ensureFlightStates(adapter, `${config.dpRoot}.airport`);
	await ensureFlightStates(adapter, `${config.dpRoot}.overflight`);
}

/**
 *
 */
export async function ensureFlightStates(adapter: any, base: string): Promise<void> {
	const strings = [
		'.text',
		'.callsign',
		'.operationalCallsign',
		'.routeCallsign',
		'.hex',
		'.mode',
		'.directionText',

		'.modeVisText',

		'.windowPositionText',
		'.windowPositionClass',
		'.windowPositionSpeechText',

		'.airlineName',
		'.airlineIata',
		'.airlineIcao',

		'.originIata',
		'.destIata',
		'.originName',
		'.destName',

		'.originDisplayName',
		'.destDisplayName',

		'.routeText',
		'.routeTextLong',
		'.routeWarning',
		'.routeSource',

		'.routeDisplayText',
		'.routeCodesText',

		'.aircraftModel',
		'.aircraftType',
		'.registration',

		'.manufacturer',
		'.manufacturerLogoText',
		'.manufacturerLogoUrl',

		'.aircraftTypeText',
		'.aircraftSize',
		'.squawk',
		'.emergency',
		'.emergencyType',
		'.emergencyText',
		'.squawk',
		'.emergency',
		'.emergencyType',
		'.emergencyText',

		'.logoUrl',
		'.jetphotosUrl',
		'.jetphotosImageUrl',

		'.localLogoUrl',
		'.localImageUrl',
		'.finalImageUrl',

		'.specialText',
		'.specialLiveryTitle',
		'.specialLiveryDescription',
		'.specialLiveryFull',
		'.specialLiveryVisText',
		'.specialDisplayText',
		'.speechText',
	];

	for (const s of strings) {
		await ensureState(adapter, base + s, '', 'string', 'text');
	}

	const nums = [
		'.altitudeFt',
		'.speedKt',
		'.verticalRate',
		'.trackDeg',

		'.distHomeNm',
		'.distAirportNm',

		'.bearingHomeDeg',
		'.windowDiffDeg',

		'.bearingAircraftToAirportDeg',
		'.bearingAirportToAircraftDeg',

		'.landingTrackDiffDeg',
		'.takeoffTrackDiffDeg',
		'.airportTrackDiffDeg',
	];

	for (const n of nums) {
		await ensureState(adapter, base + n, 0, 'number', 'value');
	}

	await ensureState(adapter, `${base}.routeReliable`, false, 'boolean', 'indicator');
	await ensureState(adapter, `${base}.isSpecial`, false, 'boolean', 'indicator');
	await ensureState(adapter, `${base}.isEmergency`, false, 'boolean', 'indicator');
	await ensureState(adapter, `${base}.speechTrigger`, false, 'boolean', 'button');
}

function cleanRouteCallsign(a: Aircraft): string {
	const v = String(a.routeCallsign || '')
		.trim()
		.toUpperCase();

	const own = String(a.callsign || '')
		.trim()
		.toUpperCase();

	if (!v) {
		return '';
	}
	if (v === own) {
		return '';
	}
	if (/^\d+$/.test(v)) {
		return '';
	}
	if (!/[A-Z]/.test(v)) {
		return '';
	}
	if (v.length < 4 || v.length > 8) {
		return '';
	}

	return v;
}

/**
 *
 */
export async function writeFlight(adapter: any, base: string, a: Aircraft): Promise<void> {
	const routeCallsign = String(a.routeCallsign || a.callsign || '')
		.trim()
		.toUpperCase();
	const display = buildDisplayInfo(a);
	display.speechText = await buildSpeechTextForWrite(adapter, base, a, display);

	await adapter.setForeignStateAsync(`${base}.text`, buildMessage(a), true);

	await adapter.setForeignStateAsync(`${base}.callsign`, a.callsign || '', true);

	await adapter.setForeignStateAsync(`${base}.operationalCallsign`, a.operationalCallsign || a.callsign || '', true);

	await adapter.setForeignStateAsync(`${base}.routeCallsign`, routeCallsign, true);
	await adapter.setForeignStateAsync(`${base}.hex`, a.hex || '', true);
	await adapter.setForeignStateAsync(`${base}.mode`, a.mode || '', true);
	await adapter.setForeignStateAsync(`${base}.directionText`, a.directionText || '', true);

	await adapter.setForeignStateAsync(`${base}.modeVisText`, display.modeVisText, true);

	await adapter.setForeignStateAsync(`${base}.windowPositionText`, display.windowPositionText, true);
	await adapter.setForeignStateAsync(`${base}.windowPositionClass`, display.windowPositionClass, true);
	await adapter.setForeignStateAsync(`${base}.windowPositionSpeechText`, display.windowPositionSpeechText, true);

	await adapter.setForeignStateAsync(`${base}.airlineName`, a.airlineName || '', true);
	await adapter.setForeignStateAsync(`${base}.airlineIata`, a.airlineIata || '', true);
	await adapter.setForeignStateAsync(`${base}.airlineIcao`, a.airlineIcao || '', true);

	await adapter.setForeignStateAsync(`${base}.originIata`, a.originIata || '', true);
	await adapter.setForeignStateAsync(`${base}.destIata`, a.destIata || '', true);
	await adapter.setForeignStateAsync(`${base}.originName`, a.originName || '', true);
	await adapter.setForeignStateAsync(`${base}.destName`, a.destName || '', true);

	await adapter.setForeignStateAsync(`${base}.originDisplayName`, display.originDisplayName, true);
	await adapter.setForeignStateAsync(`${base}.destDisplayName`, display.destDisplayName, true);

	await adapter.setForeignStateAsync(`${base}.routeText`, a.routeText || '', true);
	await adapter.setForeignStateAsync(`${base}.routeTextLong`, a.routeTextLong || '', true);
	await adapter.setForeignStateAsync(`${base}.routeReliable`, !!a.routeReliable, true);
	await adapter.setForeignStateAsync(`${base}.routeWarning`, a.routeWarning || '', true);
	await adapter.setForeignStateAsync(`${base}.routeSource`, a.routeSource || '', true);

	await adapter.setForeignStateAsync(`${base}.routeDisplayText`, display.routeDisplayText, true);
	await adapter.setForeignStateAsync(`${base}.routeCodesText`, display.routeCodesText, true);

	await adapter.setForeignStateAsync(`${base}.aircraftModel`, a.aircraftModel || '', true);
	await adapter.setForeignStateAsync(`${base}.aircraftType`, a.aircraftType || a.type || '', true);
	await adapter.setForeignStateAsync(`${base}.registration`, a.registration || '', true);

	await adapter.setForeignStateAsync(`${base}.manufacturer`, display.manufacturer, true);
	await adapter.setForeignStateAsync(`${base}.manufacturerLogoText`, display.manufacturerLogoText, true);
	await adapter.setForeignStateAsync(`${base}.manufacturerLogoUrl`, display.manufacturerLogoUrl, true);

	await adapter.setForeignStateAsync(`${base}.aircraftTypeText`, display.aircraftTypeText, true);
	await adapter.setForeignStateAsync(`${base}.aircraftSize`, display.aircraftSize, true);

	await adapter.setForeignStateAsync(`${base}.squawk`, a.squawk || '', true);
	await adapter.setForeignStateAsync(`${base}.emergency`, a.emergency || '', true);
	await adapter.setForeignStateAsync(`${base}.emergencyType`, a.emergencyType || '', true);
	await adapter.setForeignStateAsync(`${base}.emergencyText`, a.emergencyText || '', true);

	await adapter.setForeignStateAsync(`${base}.logoUrl`, a.logoUrl || '', true);
	await adapter.setForeignStateAsync(`${base}.jetphotosUrl`, a.jetphotosUrl || '', true);
	await adapter.setForeignStateAsync(`${base}.jetphotosImageUrl`, a.jetphotosImageUrl || '', true);

	const localLogoUrl = await keepExistingStringState(adapter, `${base}.localLogoUrl`, a.localLogoUrl);

	const localImageUrl = await keepExistingStringState(adapter, `${base}.localImageUrl`, a.localImageUrl);

	const finalImageUrl = await keepExistingStringState(
		adapter,
		`${base}.finalImageUrl`,
		a.finalImageUrl || localImageUrl || localLogoUrl,
	);

	await adapter.setForeignStateAsync(`${base}.localLogoUrl`, localLogoUrl, true);
	await adapter.setForeignStateAsync(`${base}.localImageUrl`, localImageUrl, true);
	await adapter.setForeignStateAsync(`${base}.finalImageUrl`, finalImageUrl, true);

	await adapter.setForeignStateAsync(`${base}.altitudeFt`, Math.round(a.altFt || 0), true);
	await adapter.setForeignStateAsync(`${base}.speedKt`, Math.round(a.speedKt || 0), true);
	await adapter.setForeignStateAsync(`${base}.verticalRate`, Math.round(a.verticalRate || 0), true);
	await adapter.setForeignStateAsync(`${base}.trackDeg`, Math.round(a.trackDeg || 0), true);

	await adapter.setForeignStateAsync(`${base}.distHomeNm`, round(a.distHomeNm || 0, 1), true);
	await adapter.setForeignStateAsync(`${base}.distAirportNm`, round(a.distAirportNm || 0, 1), true);
	await adapter.setForeignStateAsync(`${base}.bearingHomeDeg`, round(a.bearingHomeDeg || 0, 1), true);
	await adapter.setForeignStateAsync(`${base}.windowDiffDeg`, round(a.windowDiffDeg || 0, 1), true);

	await adapter.setForeignStateAsync(
		`${base}.bearingAircraftToAirportDeg`,
		round(a.bearingAircraftToAirportDeg || 0, 1),
		true,
	);
	await adapter.setForeignStateAsync(
		`${base}.bearingAirportToAircraftDeg`,
		round(a.bearingAirportToAircraftDeg || 0, 1),
		true,
	);
	await adapter.setForeignStateAsync(`${base}.landingTrackDiffDeg`, round(a.landingTrackDiffDeg || 0, 1), true);
	await adapter.setForeignStateAsync(`${base}.takeoffTrackDiffDeg`, round(a.takeoffTrackDiffDeg || 0, 1), true);
	await adapter.setForeignStateAsync(`${base}.airportTrackDiffDeg`, round(a.airportTrackDiffDeg || 0, 1), true);

	await adapter.setForeignStateAsync(`${base}.specialText`, a.specialText || '', true);
	await adapter.setForeignStateAsync(`${base}.specialLiveryTitle`, a.specialLiveryTitle || '', true);
	await adapter.setForeignStateAsync(`${base}.specialLiveryDescription`, a.specialLiveryDescription || '', true);
	await adapter.setForeignStateAsync(`${base}.specialLiveryFull`, a.specialLiveryFull || '', true);
	await adapter.setForeignStateAsync(`${base}.specialLiveryVisText`, a.specialLiveryVisText || '', true);
	await adapter.setForeignStateAsync(`${base}.specialDisplayText`, display.specialDisplayText, true);
	await adapter.setForeignStateAsync(`${base}.speechText`, display.speechText, true);

	await adapter.setForeignStateAsync(`${base}.isSpecial`, !!a.isSpecial, true);
	await adapter.setForeignStateAsync(`${base}.isEmergency`, !!a.isEmergency, true);

	await maybeTriggerSpeech(adapter, base, a, display.speechText);
}

/**
 *
 */
export async function clearFlight(adapter: any, base: string): Promise<void> {
	const strings = [
		'.text',
		'.callsign',
		'.operationalCallsign',
		'.routeCallsign',
		'.hex',
		'.mode',
		'.directionText',

		'.modeVisText',

		'.windowPositionText',
		'.windowPositionClass',
		'.windowPositionSpeechText',

		'.airlineName',
		'.airlineIata',
		'.airlineIcao',

		'.originIata',
		'.destIata',
		'.originName',
		'.destName',

		'.originDisplayName',
		'.destDisplayName',

		'.routeText',
		'.routeTextLong',
		'.routeWarning',
		'.routeSource',

		'.routeDisplayText',
		'.routeCodesText',

		'.aircraftModel',
		'.aircraftType',
		'.registration',

		'.manufacturer',
		'.manufacturerLogoText',
		'.manufacturerLogoUrl',

		'.aircraftTypeText',
		'.aircraftSize',

		'.logoUrl',
		'.jetphotosUrl',
		'.jetphotosImageUrl',

		'.localLogoUrl',
		'.localImageUrl',
		'.finalImageUrl',

		'.specialText',
		'.specialLiveryTitle',
		'.specialLiveryDescription',
		'.specialLiveryFull',
		'.specialLiveryVisText',
		'.specialDisplayText',
		'.speechText',
	];

	for (const s of strings) {
		await adapter.setForeignStateAsync(base + s, '', true);
	}

	const nums = [
		'.altitudeFt',
		'.speedKt',
		'.verticalRate',
		'.trackDeg',

		'.distHomeNm',
		'.distAirportNm',

		'.bearingHomeDeg',
		'.windowDiffDeg',

		'.bearingAircraftToAirportDeg',
		'.bearingAirportToAircraftDeg',

		'.landingTrackDiffDeg',
		'.takeoffTrackDiffDeg',
		'.airportTrackDiffDeg',
	];

	for (const n of nums) {
		await adapter.setForeignStateAsync(base + n, 0, true);
	}

	await adapter.setForeignStateAsync(`${base}.routeReliable`, false, true);
	await adapter.setForeignStateAsync(`${base}.isSpecial`, false, true);
	await adapter.setForeignStateAsync(`${base}.isEmergency`, false, true);
	await adapter.setForeignStateAsync(`${base}.speechTrigger`, false, true);
}

function buildDisplayInfo(a: Aircraft): Record<string, string> {
	const originDisplayName = cityOnly(a.originName) || String(a.originIata || '').trim() || '—';

	const destDisplayName = cityOnly(a.destName) || String(a.destIata || '').trim() || '—';

	const routeDisplayText = `${originDisplayName} → ${destDisplayName}`;

	const routeCodesText = `${a.originIata || '—'} → ${a.destIata || '—'}`;

	const modeVisText = modeVisTextFromFlight(a, originDisplayName, destDisplayName);

	const window = windowPositionInfo(a);

	const aircraft = aircraftDisplayInfo(a);

	const specialDisplayText = String(a.specialLiveryVisText || a.specialLiveryFull || a.specialText || '').trim();

	const speechText = buildSpeechText(a, {
		originDisplayName,
		destDisplayName,
		routeDisplayText,
		routeCodesText,
		specialDisplayText,
		windowPositionSpeechText: window.speechText,
		aircraftTypeText: aircraft.aircraftTypeText,
		aircraftSize: aircraft.aircraftSize,
	});

	return {
		modeVisText,

		windowPositionText: window.text,
		windowPositionClass: window.className,
		windowPositionSpeechText: window.speechText,

		originDisplayName,
		destDisplayName,
		routeDisplayText,
		routeCodesText,

		specialDisplayText,

		manufacturer: aircraft.manufacturer,
		manufacturerLogoText: aircraft.manufacturerLogoText,
		manufacturerLogoUrl: aircraft.manufacturerLogoUrl,
		aircraftTypeText: aircraft.aircraftTypeText,
		aircraftSize: aircraft.aircraftSize,
	};
}

function modeVisTextFromFlight(a: Aircraft, originDisplayName: string, destDisplayName: string): string {
	const mode = String(a.mode || '').toUpperCase();

	if (mode === 'TAKEOFF') {
		return `🛫 Start ${originDisplayName !== '—' ? originDisplayName : ''}`.trim();
	}

	if (mode === 'LANDING') {
		return `🛬 Landung ${destDisplayName !== '—' ? destDisplayName : ''}`.trim();
	}

	if (mode === 'OVERFLIGHT') {
		return '🛩️ Überflug';
	}

	return '✈️ Flight';
}

function windowPositionInfo(a: Aircraft): {
	text: string;
	className: string;
	speechText: string;
} {
	const bearing = Number(a.bearingHomeDeg || 0);
	const diff = Number(a.windowDiffDeg || 0);

	if (!bearing && !diff) {
		return {
			text: '↗️ Position unbekannt',
			className: 'side',
			speechText: 'am Fenster',
		};
	}

	const abs = Math.abs(diff);

	if (abs <= 8) {
		return {
			text: '⬆️ direkt vor dem Fenster',
			className: 'center',
			speechText: 'direkt vor dem Fenster',
		};
	}

	if (diff < 0) {
		return {
			text: `⬅️ links vom Fenster · ${Math.round(abs)}°`,
			className: 'side',
			speechText: 'links vom Fenster',
		};
	}

	return {
		text: `➡️ rechts vom Fenster · ${Math.round(abs)}°`,
		className: 'side',
		speechText: 'rechts vom Fenster',
	};
}

function aircraftDisplayInfo(a: Aircraft): {
	manufacturer: string;
	manufacturerLogoText: string;
	manufacturerLogoUrl: string;
	aircraftTypeText: string;
	aircraftSize: string;
} {
	const raw = String(a.aircraftModel || a.aircraftType || a.type || '').trim();

	const type = String(a.aircraftType || a.type || '')
		.trim()
		.toUpperCase();

	const model = String(a.aircraftModel || '')
		.trim()
		.toUpperCase();

	const all = `${type} ${model} ${raw}`.toUpperCase();

	let manufacturer = 'Flugzeug';
	let manufacturerLogoText = '✈';
	let aircraftTypeText = raw || type || '—';

	if (all.includes('AIRBUS') || /^A\d/.test(type)) {
		manufacturer = 'Airbus';
		manufacturerLogoText = 'A';

		if (type && /^A\d/.test(type)) {
			aircraftTypeText = `Airbus ${type}`;
		}
	} else if (all.includes('BOEING') || /^B\d/.test(type)) {
		manufacturer = 'Boeing';
		manufacturerLogoText = 'B';

		if (type && /^B\d/.test(type)) {
			aircraftTypeText = `Boeing ${type}`;
		}
	} else if (all.includes('EMBRAER') || /^E\d/.test(type) || all.includes('E-JET')) {
		manufacturer = 'Embraer';
		manufacturerLogoText = 'E';

		if (type) {
			aircraftTypeText = `Embraer ${type}`;
		}
	} else if (all.includes('ATR') || /^AT\d/.test(type)) {
		manufacturer = 'ATR';
		manufacturerLogoText = 'ATR';

		if (type) {
			aircraftTypeText = `ATR ${type}`;
		}
	} else if (all.includes('DASSAULT') || all.includes('FALCON')) {
		manufacturer = 'Dassault';
		manufacturerLogoText = 'D';

		if (type) {
			aircraftTypeText = `Dassault ${type}`;
		}
	} else if (all.includes('LOCKHEED') || all.includes('HERCULES') || all.includes('C130')) {
		manufacturer = 'Lockheed';
		manufacturerLogoText = 'L';

		if (type) {
			aircraftTypeText = `Lockheed ${type}`;
		}
	} else if (all.includes('HONDA') || all.includes('HONDAJET')) {
		manufacturer = 'Honda';
		manufacturerLogoText = 'H';

		if (type) {
			aircraftTypeText = `HondaJet ${type}`;
		}
	} else if (all.includes('BOMBARDIER') || all.includes('CRJ') || all.includes('CSERIES') || all.includes('A220')) {
		manufacturer = all.includes('A220') ? 'Airbus' : 'Bombardier';
		manufacturerLogoText = manufacturer === 'Airbus' ? 'A' : 'B';

		if (type) {
			aircraftTypeText = `${manufacturer} ${type}`;
		}
	}

	const aircraftSize = aircraftSizeLabel(all);

	const manufacturerLogoBase = '/jetframe.admin/img/manufacturer/';

	let manufacturerLogoUrl = '';

	if (manufacturer === 'Airbus') {
		manufacturerLogoUrl = `${manufacturerLogoBase}airbus.png`;
	} else if (manufacturer === 'Boeing') {
		manufacturerLogoUrl = `${manufacturerLogoBase}boeing.png`;
	} else if (manufacturer === 'Embraer') {
		manufacturerLogoUrl = `${manufacturerLogoBase}embraer.png`;
	} else if (manufacturer === 'ATR') {
		manufacturerLogoUrl = `${manufacturerLogoBase}atr.png`;
	} else if (manufacturer === 'Dassault') {
		manufacturerLogoUrl = `${manufacturerLogoBase}dassault.png`;
	} else if (manufacturer === 'Lockheed') {
		manufacturerLogoUrl = `${manufacturerLogoBase}lockheed.png`;
	} else if (manufacturer === 'Honda') {
		manufacturerLogoUrl = `${manufacturerLogoBase}honda.png`;
	} else if (manufacturer === 'Bombardier') {
		manufacturerLogoUrl = `${manufacturerLogoBase}bombardier.png`;
	}

	return {
		manufacturer,
		manufacturerLogoText,
		manufacturerLogoUrl,
		aircraftTypeText,
		aircraftSize,
	};
}

function aircraftSizeLabel(allText: string): string {
	const all = String(allText || '')
		.toUpperCase()
		.replace(/[\s_-]/g, '');

	// Superjumbo / Jumbo
	if (/A38|A380|A388/.test(all)) {
		return 'Superjumbo';
	}
	if (/B74|B747|B741|B742|B743|B744|B748/.test(all)) {
		return 'Jumbo';
	}

	// Heavy Cargo / Military Transport
	if (/AN124|AN225|C5M|GALAXY|C17|C17A|GLOBEMASTER/.test(all)) {
		return 'Heavy Cargo';
	}
	if (/A400|A400M|C130|HERCULES|KC135|KC46|E3|E7/.test(all)) {
		return 'Military';
	}

	// Widebody
	if (
		/A300|A310|A330|A332|A333|A338|A339/.test(all) ||
		/A340|A342|A343|A345|A346/.test(all) ||
		/A350|A359|A35K|A351/.test(all) ||
		/B757|B752|B753/.test(all) ||
		/B767|B762|B763|B764/.test(all) ||
		/B777|B772|B773|B77W|B778|B779|B77L|B77F/.test(all) ||
		/B787|B788|B789|B78X/.test(all) ||
		/DC10|MD11|IL86|IL96|L1011/.test(all)
	) {
		return 'Widebody';
	}

	// Cargo
	if (/A300F|A330F|B763F|B752F|B733F|B734F|B738F|AN12|AN26/.test(all)) {
		return 'Cargo';
	}

	// Narrowbody
	if (
		/A220|A221|A223|BCS1|BCS3|CS100|CS300/.test(all) ||
		/A318|A319|A320|A321|A20N|A21N/.test(all) ||
		/B707|B717|B727|B737|B731|B732|B733|B734|B735|B736|B738|B739|B38M|B39M/.test(all) ||
		/DC8|DC9|MD80|MD81|MD82|MD83|MD87|MD88|MD90/.test(all) ||
		/TU134|TU154|TU204|TU214|C919|ARJ21|MC21/.test(all)
	) {
		return 'Narrowbody';
	}

	// Regional
	if (
		/CRJ|CRJ1|CRJ2|CRJ7|CRJ9|CRJX|CRJ100|CRJ200|CRJ700|CRJ900|CRJ1000/.test(all) ||
		/ERJ|E135|E140|E145|E170|E175|E190|E195|E290|E295/.test(all) ||
		/AT42|AT43|AT45|AT46|AT72|AT75|AT76|ATR/.test(all) ||
		/DH8|DHC8|Q200|Q300|Q400/.test(all) ||
		/SF34|SF340|SB20|F50|F70|F100|DO228|DO328|RJ70|RJ85|RJ100/.test(all)
	) {
		return 'Regional';
	}

	// Business Jet
	if (
		/GLEX|GLF|G280|G450|G500|G550|G650|G700/.test(all) ||
		/CL30|CL35|CL60|GLOBAL|CHALLENGER/.test(all) ||
		/FALCON|FA7X|FA8X|FA50|FA90|F2TH|F900|F2000/.test(all) ||
		/CITATION|C25A|C25B|C25C|C56X|C68A|C700|LJ35|LJ45|LJ60|LJ75/.test(all) ||
		/LEGACY|PRAETOR|PHENOM|E50P|E55P|HA420|PC24/.test(all)
	) {
		return 'Business Jet';
	}

	// General Aviation
	if (/C172|C182|C206|C208|PA28|PA34|BE20|BE9L|PC12|DA40|DA42/.test(all)) {
		return 'General Aviation';
	}

	// Helicopter
	if (/EC135|EC145|H135|H145|H160|AW109|AW139|AW169|AW189|S76|S92|UH60|CH47|MI8|KA32/.test(all)) {
		return 'Helicopter';
	}

	// Military Jet / Bomber
	if (
		/F14|F15|F16|F18|F22|F35|EUROFIGHTER|TYPHOON|RAFALE|GRIPEN|MIRAGE|SU27|SU30|SU35|MIG29|B1|B2|B52|TU95|TU160/.test(
			all,
		)
	) {
		return 'Military';
	}

	return 'Unknown';
}

function buildSpeechText(a: Aircraft, display: Record<string, string>): string {
	const mode = String(a.mode || '').toUpperCase();

	let modeSpeechText = 'Flug';
	let routeDirectionText = 'von';
	let routeOtherAirport = display.originDisplayName || display.destDisplayName || '';

	if (mode === 'LANDING') {
		modeSpeechText = 'Landung';
		routeDirectionText = 'aus';
		routeOtherAirport = display.originDisplayName || '';
	}

	if (mode === 'TAKEOFF') {
		modeSpeechText = 'Start';
		routeDirectionText = 'nach';
		routeOtherAirport = display.destDisplayName || '';
	}

	if (mode === 'OVERFLIGHT') {
		modeSpeechText = 'Überflug';
		routeDirectionText = 'von';
		routeOtherAirport = display.routeDisplayText || '';
	}

	const bestCallsign = String(a.routeCallsign || a.callsign || '').trim();

	const template =
		'{modeSpeechText}: {airlineName} {bestCallsign} {routeDirectionText} {routeOtherAirport} in {altitudeFt} Fuß. {windowPositionSpeechText}.';

	const values: Record<string, string> = {
		modeSpeechText,
		routeDirectionText,
		routeOtherAirport,
		bestCallsign,

		airlineName: String(a.airlineName || 'Unbekannte Airline'),
		callsign: String(a.callsign || ''),
		operationalCallsign: String(a.operationalCallsign || a.callsign || ''),
		routeCallsign: String(a.routeCallsign || a.callsign || ''),
		originDisplayName: display.originDisplayName || '',
		destDisplayName: display.destDisplayName || '',
		routeDisplayText: display.routeDisplayText || '',
		routeCodesText: display.routeCodesText || '',
		aircraftTypeText: display.aircraftTypeText || '',
		aircraftSize: display.aircraftSize || '',
		registration: String(a.registration || ''),
		altitudeFt: String(Math.round(a.altFt || 0)),
		speedKt: String(Math.round(a.speedKt || 0)),
		verticalRate: String(Math.round(a.verticalRate || 0)),
		trackDeg: String(Math.round(a.trackDeg || 0)),
		windowPositionSpeechText: display.windowPositionSpeechText || '',
		specialDisplayText: display.specialDisplayText || '',
	};

	return template
		.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key) => values[key] || '')
		.replace(/\s+/g, ' ')
		.replace(/\s+\./g, '.')
		.trim();
}

async function maybeTriggerSpeech(adapter: any, base: string, a: Aircraft, speechText: string): Promise<void> {
	if (!base.endsWith('.current')) {
		return;
	}

	const root = base.split('.').slice(0, -1).join('.');

	let speechMode = 'browser';

	try {
		const st = await adapter.getForeignStateAsync(`${root}.speechMode`);
		speechMode = String(st?.val || 'browser');
	} catch {
		speechMode = 'browser';
	}

	if (speechMode !== 'external' && speechMode !== 'both') {
		return;
	}

	const key = [
		String(a.callsign || ''),
		String(a.routeCallsign || ''),
		String(a.registration || ''),
		String(speechText || ''),
	].join('|');

	if (!key || LAST_SPEECH_TRIGGER[base] === key) {
		return;
	}

	LAST_SPEECH_TRIGGER[base] = key;

	await adapter.setForeignStateAsync(`${base}.speechTrigger`, true, true);

	setTimeout(() => {
		adapter.setForeignStateAsync(`${base}.speechTrigger`, false, true).catch(() => {});
	}, 500);
}

async function buildSpeechTextForWrite(
	adapter: any,
	base: string,
	a: Aircraft,
	display: Record<string, string>,
): Promise<string> {
	const root = base.split('.').slice(0, -1).join('.');

	let template =
		'{modeSpeechText}: {airlineName} {bestCallsign} {routeDirectionText} {routeOtherAirport} in {altitudeFt} Fuss. {windowPositionSpeechText}.';

	try {
		const st = await adapter.getForeignStateAsync(`${root}.speechTemplate`);
		if (st?.val) {
			template = String(st.val);
		}
	} catch {}

	return buildSpeechTextFromTemplate(a, display, template);
}

function buildSpeechTextFromTemplate(a: Aircraft, display: Record<string, string>, template: string): string {
	const mode = String(a.mode || '').toUpperCase();

	let modeSpeechText = 'Flug';
	let routeDirectionText = 'von';
	let routeOtherAirport = display.originDisplayName || display.destDisplayName || '';

	if (mode === 'LANDING') {
		modeSpeechText = 'Landung';
		routeDirectionText = 'aus';
		routeOtherAirport = display.originDisplayName || '';
	}

	if (mode === 'TAKEOFF') {
		modeSpeechText = 'Start';
		routeDirectionText = 'nach';
		routeOtherAirport = display.destDisplayName || '';
	}

	if (mode === 'OVERFLIGHT') {
		modeSpeechText = 'Überflug';
		routeDirectionText = 'von';
		routeOtherAirport = display.routeDisplayText || '';
	}

	const bestCallsign = String(a.routeCallsign || a.callsign || '').trim();

	const values: Record<string, string> = {
		modeSpeechText,
		routeDirectionText,
		routeOtherAirport,
		bestCallsign,

		airlineName: String(a.airlineName || 'Unbekannte Airline'),
		callsign: String(a.callsign || ''),
		operationalCallsign: String(a.operationalCallsign || a.callsign || ''),
		routeCallsign: String(a.routeCallsign || a.callsign || ''),
		originDisplayName: display.originDisplayName || '',
		destDisplayName: display.destDisplayName || '',
		routeDisplayText: display.routeDisplayText || '',
		routeCodesText: display.routeCodesText || '',
		aircraftTypeText: display.aircraftTypeText || '',
		aircraftSize: display.aircraftSize || '',
		registration: String(a.registration || ''),
		altitudeFt: String(Math.round(a.altFt || 0)),
		speedKt: String(Math.round(a.speedKt || 0)),
		verticalRate: String(Math.round(a.verticalRate || 0)),
		trackDeg: String(Math.round(a.trackDeg || 0)),
		windowPositionSpeechText: display.windowPositionSpeechText || '',
		specialDisplayText: display.specialDisplayText || '',
	};

	return String(template || '')
		.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key) => values[key] || '')
		.replace(/\s+/g, ' ')
		.replace(/\s+\./g, '.')
		.trim();
}

function cityOnly(name: unknown): string {
	const v = String(name || '')
		.replace(/\bAirport\b/gi, '')
		.replace(/\bInternational\b/gi, '')
		.replace(/\bIntl\b/gi, '')
		.replace(/\bFlughafen\b/gi, '')
		.replace(/\bFort Worth\b/gi, '')
		.replace(/\bMain\b/gi, '')
		.replace(/\s+/g, ' ')
		.trim();

	if (v === 'Frankfurt am') {
		return 'Frankfurt';
	}

	return v;
}

function buildMessage(a: Aircraft): string {
	const lines: string[] = [];
	const routeCallsign = String(a.routeCallsign || a.callsign || '')
		.trim()
		.toUpperCase();

	lines.push('✈️ JetFrame');
	lines.push('');

	lines.push(`${a.icon || '✈️'} ${modeText(a.mode || '')}`);
	lines.push(`Flug: ${a.callsign || a.hex || 'unbekannt'}`);

	if (routeCallsign) {
		lines.push(`Route über: ${routeCallsign}`);
	}

	if (a.airlineName) {
		lines.push(`Airline: ${a.airlineName}`);
	}

	if (a.routeTextLong) {
		lines.push(`Route: ${a.routeTextLong}`);
	} else if (a.routeText) {
		lines.push(`Route: ${a.routeText}`);
	} else if (a.routeWarning) {
		lines.push(`Route: ${a.routeWarning}`);
	} else if (a.directionText) {
		lines.push(`Richtung: ${a.directionText}`);
	}

	if (a.routeSource) {
		lines.push(`Quelle: ${a.routeSource}`);
	}

	if (a.aircraftModel) {
		lines.push(`Flugzeug: ${a.aircraftModel}`);
	} else if (a.aircraftType || a.type) {
		lines.push(`Typ: ${a.aircraftType || a.type}`);
	}

	if (a.registration) {
		lines.push(`Kennz.: ${a.registration}`);
	}

	lines.push('');
	lines.push(`Höhe: ${Math.round(a.altFt || 0)} ft`);
	lines.push(`Speed: ${Math.round(a.speedKt || 0)} kt`);
	lines.push(`Steigrate: ${Math.round(a.verticalRate || 0)} ft/min`);
	lines.push(`Kurs: ${Math.round(a.trackDeg || 0)}°`);

	const specialDisplayText = a.specialLiveryVisText || a.specialLiveryFull || a.specialText || '';

	if (specialDisplayText) {
		lines.push('');
		lines.push(`${a.isSpecial ? '⭐ Besonderheit: ' : 'ℹ️ Info: '}${specialDisplayText}`);
	}
	return lines.join('\n');
}

function modeText(mode: string): string {
	if (mode === 'LANDING') {
		return 'Landung';
	}
	if (mode === 'TAKEOFF') {
		return 'Start';
	}
	if (mode === 'OVERFLIGHT') {
		return 'Überflug';
	}
	return 'Flug';
}

/**
 *
 */
export async function ensureStates(adapter: any, config: JetFrameConfig): Promise<void> {
	await ensureBaseStates(adapter, config);
}

async function keepExistingStringState(adapter: any, id: string, value: unknown): Promise<string> {
	const next = String(value || '').trim();

	if (next) {
		return next;
	}

	try {
		const oldState = await adapter.getForeignStateAsync(id);
		return String(oldState?.val || '').trim();
	} catch {
		return '';
	}
}
