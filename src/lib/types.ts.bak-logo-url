export type FlightMode = 'TAKEOFF' | 'LANDING' | 'OVERFLIGHT' | '';

/**
 *
 */
export interface JetFrameConfig {
	enabled: boolean;
	/**
	 *
	 */
	homeLat: number;
	/**
	 *
	 */
	homeLon: number;

	/**
	 *
	 */
	airport: {
		/**
		 *
		 */
		iata: string;
		/**
		 *
		 */
		icao?: string;
		/**
		 *
		 */
		name: string;
		/**
		 *
		 */
		lat: number;
		/**
		 *
		 */
		lon: number;
	};

	/**
	 *
	 */
	radiusNm: number;

	/**
	 *
	 */
	adsbCustomUrl: string;
	maxHomeDistanceNm: number;

	/**
	 *
	 */
	searchPollSeconds: number;
	/**
	 *
	 */
	livePollSeconds: number;
	/**
	 *
	 */
	liveMaxSeconds: number;

	/**
	 *
	 */
	windowBearingDeg: number;
	/**
	 *
	 */
	windowFovDeg: number;

	/**
	 *
	 */
	minAltitudeFt: number;
	/**
	 *
	 */
	maxAltitudeFt: number;

	/**
	 *
	 */
	autoRunwayTrackToleranceDeg: number;
	/**
	 *
	 */
	minClimbRate: number;
	/**
	 *
	 */
	minSinkRate: number;

	/**
	 *
	 */
	overflightEnabled: boolean;
	/**
	 *
	 */
	overflightOnly: boolean;
	priorityEnabled: boolean;
	prioritySpecialLivery: boolean;
	priorityAircraftSize: boolean;
	priorityMilitaryGov: boolean;
	emergencyPriorityEnabled: boolean;
	emergencySpeechEnabled: boolean;
	emergencySquawk7500: boolean;
	emergencySquawk7600: boolean;
	emergencySquawk7700: boolean;
	/**
	 *
	 */
	overflightMaxDistanceNm: number;
	/**
	 *
	 */
	overflightMinAltitudeFt: number;
	/**
	 *
	 */
	overflightMaxAltitudeFt: number;
	/**
	 *
	 */
	overflightRequiresWindow: boolean;

	/**
	 *
	 */
	dpRoot: string;
	/**
	 *
	 */
	airportJsonDp: string;

	/**
	 *
	 */
	speechMode?: 'browser' | 'external' | 'both' | 'off';
	/**
	 *
	 */
	speechTemplate?: string;
	/**
	 *
	 */
	speechEnabled: boolean;
}

/**
 *
 */
export interface Aircraft {
	/**
	 *
	 */
	hex: string;
	/**
	 *
	 */
	callsign: string;

	operationalCallsign?: string;
	routeCallsign?: string;

	type: string;
	/**
	 *
	 */
	registration: string;

	/**
	 *
	 */
	lat: number;
	/**
	 *
	 */
	lon: number;

	/**
	 *
	 */
	altFt: number;
	/**
	 *
	 */
	speedKt: number;
	/**
	 *
	 */
	trackDeg: number;
	/**
	 *
	 */
	verticalRate: number;

	/**
	 *
	 */
	seenSec: number;

	/**
	 *
	 */
	bearingHomeDeg?: number;
	/**
	 *
	 */
	distHomeNm?: number;
	/**
	 *
	 */
	distAirportNm?: number;

	/**
	 *
	 */
	bearingAircraftToAirportDeg?: number;
	/**
	 *
	 */
	bearingAirportToAircraftDeg?: number;

	/**
	 *
	 */
	landingTrackDiffDeg?: number;
	/**
	 *
	 */
	takeoffTrackDiffDeg?: number;
	/**
	 *
	 */
	airportTrackDiffDeg?: number;
	/**
	 *
	 */
	windowDiffDeg?: number;
	/**
	 *
	 */
	windowDiffAbsDeg?: number;

	/**
	 *
	 */
	inWindow?: boolean;
	/**
	 *
	 */
	relevant?: boolean;
	/**
	 *
	 */
	priority?: number;

	/**
	 *
	 */
	mode?: FlightMode;
	/**
	 *
	 */
	icon?: string;
	/**
	 *
	 */
	directionText?: string;

	/**
	 *
	 */
	airlineName?: string;
	/**
	 *
	 */
	airlineIata?: string;
	/**
	 *
	 */
	airlineIcao?: string;

	/**
	 *
	 */
	originIata?: string;
	/**
	 *
	 */
	destIata?: string;
	/**
	 *
	 */
	originName?: string;
	/**
	 *
	 */
	destName?: string;

	/**
	 *
	 */
	routeText?: string;
	/**
	 *
	 */
	routeTextLong?: string;
	/**
	 *
	 */
	routeReliable?: boolean;
	/**
	 *
	 */
	routeWarning?: string;
	/**
	 *
	 */
	routeSource?: string;

	/**
	 *
	 */
	aircraftModel?: string;
	/**
	 *
	 */
	aircraftType?: string;

	/**
	 *
	 */
	logoUrl?: string;
	/**
	 *
	 */
	jetphotosUrl?: string;
	/**
	 *
	 */
	jetphotosImageUrl?: string;

	/**
	 *
	 */
	localLogoUrl?: string;
	/**
	 *
	 */
	localImageUrl?: string;
	/**
	 *
	 */
	finalImageUrl?: string;

	/**
	 *
	 */
	specialText?: string;
	/**
	 *
	 */
	speechText?: string;
	/**
	 *
	 */
	specialLiveryTitle?: string;
	/**
	 *
	 */
	specialLiveryDescription?: string;
	/**
	 *
	 */
	specialLiveryFull?: string;
	/**
	 *
	 */
	specialLiveryVisText?: string;
	/**
	 *
	 */
	specialDisplayText?: string;

	/**
	 *
	 */
	modeVisText?: string;
	/**
	 *
	 */
	windowPositionText?: string;
	/**
	 *
	 */
	windowPositionClass?: string;
	/**
	 *
	 */
	windowPositionSpeechText?: string;

	/**
	 *
	 */
	originDisplayName?: string;
	/**
	 *
	 */
	destDisplayName?: string;
	/**
	 *
	 */
	routeDisplayText?: string;
	/**
	 *
	 */
	routeCodesText?: string;

	/**
	 *
	 */
	manufacturer?: string;
	/**
	 *
	 */
	manufacturerLogoText?: string;
	/**
	 *
	 */
	manufacturerLogoUrl?: string;
	/**
	 *
	 */
	aircraftTypeText?: string;
	/**
	 *
	 */
	aircraftSize?: string;

	squawk?: string;
	emergency?: string;
	isEmergency?: boolean;
	emergencyType?: string;
	emergencyText?: string;
	/**
	 *
	 */
	isSpecial?: boolean;
}
