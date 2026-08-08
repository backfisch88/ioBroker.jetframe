// Central translation dictionary for dynamic, flight-derived text that the
// adapter writes into ioBroker states (compass directions, route info,
// status messages, statistics text, etc.). This is intentionally separate
// from webI18n.ts, which only covers the static web UI page chrome.
//
// Only two languages are supported (matching the adapter's webLanguage
// setting): English (default) and German.

export type ContentLang = 'en' | 'de';

export const COMPASS_DIRECTIONS: Record<ContentLang, string[]> = {
	en: ['↑ North', '↗ Northeast', '→ East', '↘ Southeast', '↓ South', '↙ Southwest', '← West', '↖ Northwest'],
	de: ['↑ Norden', '↗ Nordost', '→ Osten', '↘ Südost', '↓ Süden', '↙ Südwest', '← Westen', '↖ Nordwest'],
};

export const CONTENT_TEXT: Record<ContentLang, Record<string, string>> = {
	en: {
		takeoff: 'Takeoff',
		landing: 'Landing',
		overflight: 'Overflight',
		flight: 'Flight',
		traffic: 'Traffic',
		to: 'to',
		from: 'from',
		landingsPlural: 'Landings',
		takeoffsPlural: 'Departures',

		msgFlight: 'Flight',
		msgRouteVia: 'Route via',
		msgAirline: 'Airline',
		msgRoute: 'Route',
		msgDirection: 'Direction',
		msgSource: 'Source',
		msgAircraft: 'Aircraft',
		msgType: 'Type',
		msgReg: 'Reg.',
		msgAltitude: 'Altitude',
		msgSpeed: 'Speed',
		msgClimbRate: 'Climb rate',
		msgHeading: 'Heading',
		msgSpecial: 'Special',
		msgInfo: 'Info',

		atWindow: 'at the window',
		directlyInFrontOfWindow: 'directly in front of the window',
		leftOfWindow: 'left of window',
		rightOfWindow: 'right of window',
		positionUnknown: 'Position unknown',

		manufacturerFallback: 'Aircraft',

		rwyActive: 'active',
		activeHeading: 'Active heading',
		noFlightNear: 'No takeoff/landing/overflight near',
		probableRwy: 'probable RWY',

		rushHour: 'Rush hour',
		flightsSince: 'flights since',
		currentHour: 'Current hour',
		flights: 'flights',
		bestTime: 'best time',

		unknownAirline: 'Unknown Airline',
		unknown: 'Unknown',

		routeVerified: 'HexDB + Flightera verified',
		routeHexdbOnly: 'HexDB route',
		routeLiveDetected: 'Live flight detected',
		routeDestUnknown: 'Destination unknown',
		routeOriginUnknown: 'Origin unknown',
		routeUnknown: 'Route unknown',
		routeFlighteraPreferred: 'Flightera live preferred, HexDB divergent',
		routeHexdbPreferred: 'HexDB preferred, Flightera divergent',
		routeFr24LiveFallback: 'FR24 live fallback',
		routeAdsbdbFallback: 'ADSBDB fallback',
	},
	de: {
		takeoff: 'Start',
		landing: 'Landung',
		overflight: 'Überflug',
		flight: 'Flug',
		traffic: 'Traffic',
		to: 'nach',
		from: 'von',
		landingsPlural: 'Landungen',
		takeoffsPlural: 'Starts',

		msgFlight: 'Flug',
		msgRouteVia: 'Route über',
		msgAirline: 'Airline',
		msgRoute: 'Route',
		msgDirection: 'Richtung',
		msgSource: 'Quelle',
		msgAircraft: 'Flugzeug',
		msgType: 'Typ',
		msgReg: 'Kennz.',
		msgAltitude: 'Höhe',
		msgSpeed: 'Speed',
		msgClimbRate: 'Steigrate',
		msgHeading: 'Kurs',
		msgSpecial: 'Besonderheit',
		msgInfo: 'Info',

		atWindow: 'am Fenster',
		directlyInFrontOfWindow: 'direkt vor dem Fenster',
		leftOfWindow: 'links vom Fenster',
		rightOfWindow: 'rechts vom Fenster',
		positionUnknown: 'Position unbekannt',

		manufacturerFallback: 'Flugzeug',

		rwyActive: 'aktiv',
		activeHeading: 'Aktive Richtung',
		noFlightNear: 'Kein Start/Landung/Überflug bei',
		probableRwy: 'vermutlich RWY',

		rushHour: 'Rushhour',
		flightsSince: 'Flüge seit',
		currentHour: 'Aktuelle Stunde',
		flights: 'Flüge',
		bestTime: 'beste Zeit',

		unknownAirline: 'Unbekannte Airline',
		unknown: 'Unbekannt',

		routeVerified: 'HexDB + Flightera geprüft',
		routeHexdbOnly: 'HexDB Route',
		routeLiveDetected: 'Live-Flug erkannt',
		routeDestUnknown: 'Ziel unbekannt',
		routeOriginUnknown: 'Start unbekannt',
		routeUnknown: 'Route unbekannt',
		routeFlighteraPreferred: 'Flightera Live bevorzugt, HexDB abweichend',
		routeHexdbPreferred: 'HexDB bevorzugt, Flightera abweichend',
		routeFr24LiveFallback: 'FR24 Live-Fallback',
		routeAdsbdbFallback: 'ADSBDB Fallback',
	},
};

export function t(lang: ContentLang, key: string): string {
	return CONTENT_TEXT[lang]?.[key] ?? CONTENT_TEXT.en[key] ?? key;
}
