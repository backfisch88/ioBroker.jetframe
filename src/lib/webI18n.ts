// Translation dictionary for the static "chrome" text of the built-in web
// UI pages (buttons, headers, labels, hints). This intentionally covers
// only the two languages the adapter auto-detects from ioBroker's system
// language: German (if the ioBroker system language is 'de') and English
// (fallback for everything else).
//
// Dynamic, flight-derived text (route info, compass directions, status
// messages, etc.) is generated server-side elsewhere (states.ts, main.ts,
// flightInfo.ts) and is out of scope for this dictionary.

export type WebLang = 'en' | 'de';

export const WEB_TRANSLATIONS: Record<WebLang, Record<string, string>> = {
	en: {
		heroSub: 'Your live flight radar for home',
		statusConnecting: 'Connecting to JetFrame…',
		jetframeActive: 'JetFrame active',
		jetframePaused: 'JetFrame paused',
		liveDetectionOn: 'Live detection is enabled',
		liveDetectionOff: 'Live detection is paused',
		navFrameTitle: 'Live Frame',
		navFrameSub: 'Show current aircraft',
		navHeatmapTitle: 'Heatmap',
		navHeatmapSub: 'Daily statistics & best spotting time',
		navStatsTitle: 'Statistics',
		navStatsSub: 'Yesterday, records & spotting times',
		statToday: 'TODAY',
		statCurrent: 'CURRENT',
		statLandings: 'LANDINGS',
		footer: 'JetFrame · Auto-refresh every 10 seconds',
		serverUnreachable: 'JetFrame server unreachable',
		statusReady: 'JetFrame ready',
		statusLabel: 'Status',
		status_searching: 'searching',
		status_live: 'live',
		status_disabled: 'disabled',
		status_cleared: 'cleared',
		status_lost: 'lost',

		waitingForFlight: 'Waiting for flight',
		jetframeOff: 'JetFrame off',
		flight: 'Flight',
		nextFlight: 'Next Flight',
		altitudeFt: 'ALTITUDE FT',
		heading: 'HEADING',
		registration: 'Reg.',
		speechOutput: 'Speech output',
		back: 'Back',

		heatmapTitle: 'Heatmap',
		flights: 'Flights',
		landings: 'Landings',
		departures: 'Departures',
		overflights: 'Overflights',
		flightMovements: 'Flight movements',
		loadingTraffic: 'Loading traffic…',
		bestTimeDash: 'Best time: –',
		topAirlines: 'Top Airlines',
		topAirline: 'Top airline',
		topRoutes: 'Top Routes',
		topRoute: 'Top route',

		statsTitle: 'Statistics',
		today: 'Today',
		flightsToday: 'flights today',
		yesterday: 'Yesterday',
		recap: 'recap',
		recordDay: 'Record day',
		allTime: 'All-time',
		bestTime: 'Best time',
		overall: 'overall',
		noRecordYet: 'no record yet',
		noPreviousDayYet: 'no previous day yet',
		flightsTotal: 'flights total',
		heavyToday: 'Heavy today',
		a380b747Sep: 'A380 / B747 separately',
		specialsToday: 'Specials today',
		specialLiveries: 'special liveries',
		dailyHistory: 'Daily history',
		topAirlinesAllTime: 'Top Airlines All-time',
		topRoutesAllTime: 'Top Routes All-time',
	},
	de: {
		heroSub: 'Dein Live-Flugradar für Zuhause',
		statusConnecting: 'Verbinde mit JetFrame…',
		jetframeActive: 'JetFrame aktiv',
		jetframePaused: 'JetFrame pausiert',
		liveDetectionOn: 'Live-Erkennung ist eingeschaltet',
		liveDetectionOff: 'Live-Erkennung ist pausiert',
		navFrameTitle: 'Live Frame',
		navFrameSub: 'Aktuelles Flugzeug anzeigen',
		navHeatmapTitle: 'Heatmap',
		navHeatmapSub: 'Tagesstatistik & beste Spotterzeit',
		navStatsTitle: 'Statistik',
		navStatsSub: 'Gestern, Rekorde & Spotterzeiten',
		statToday: 'HEUTE',
		statCurrent: 'AKTUELL',
		statLandings: 'LANDUNGEN',
		footer: 'JetFrame · Auto-Refresh alle 10 Sekunden',
		serverUnreachable: 'JetFrame-Server nicht erreichbar',
		statusReady: 'JetFrame bereit',
		statusLabel: 'Status',
		status_searching: 'sucht',
		status_live: 'live',
		status_disabled: 'deaktiviert',
		status_cleared: 'zurückgesetzt',
		status_lost: 'verloren',

		waitingForFlight: 'Warte auf Flug',
		jetframeOff: 'JetFrame aus',
		flight: 'Flug',
		nextFlight: 'Nächster Flug',
		altitudeFt: 'HÖHE FT',
		heading: 'KURS',
		registration: 'Kennz.',
		speechOutput: 'Sprachausgabe',
		back: 'Zurück',

		heatmapTitle: 'Heatmap',
		flights: 'Flüge',
		landings: 'Landungen',
		departures: 'Starts',
		overflights: 'Überflüge',
		flightMovements: 'Flugbewegungen',
		loadingTraffic: 'Lade Traffic…',
		bestTimeDash: 'Beste Zeit: –',
		topAirlines: 'Top Airlines',
		topAirline: 'Top Airline',
		topRoutes: 'Top Routen',
		topRoute: 'Top Route',

		statsTitle: 'Statistik',
		today: 'Heute',
		flightsToday: 'Flüge heute',
		yesterday: 'Gestern',
		recap: 'Rückblick',
		recordDay: 'Rekordtag',
		allTime: 'Alltime',
		bestTime: 'Beste Zeit',
		overall: 'allgemein',
		noRecordYet: 'noch kein Rekord',
		noPreviousDayYet: 'noch kein Vortag',
		flightsTotal: 'Flüge insgesamt',
		heavyToday: 'Heavy heute',
		a380b747Sep: 'A380 / B747 separat',
		specialsToday: 'Specials heute',
		specialLiveries: 'Speziallackierungen',
		dailyHistory: 'Tageshistorie',
		topAirlinesAllTime: 'Top Airlines Alltime',
		topRoutesAllTime: 'Top Routen Alltime',
	},
};

/**
 * Replaces every `{{t.key}}` placeholder in the given HTML with the
 * translated string for the given language (falling back to the English
 * string, then to the raw key, if a translation is missing).
 */
export function applyWebTranslations(html: string, lang: WebLang): string {
	const dict = WEB_TRANSLATIONS[lang] || WEB_TRANSLATIONS.en;

	return html
		.replace('{{T_JSON}}', JSON.stringify(dict))
		.replace(/\{\{t\.([a-zA-Z0-9_]+)\}\}/g, (_match, key: string) => dict[key] ?? WEB_TRANSLATIONS.en[key] ?? key)
		.replace(/<html lang="[a-z-]*">/, `<html lang="${lang}">`);
}
