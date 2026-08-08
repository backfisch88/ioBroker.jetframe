/**
 * Minimal ioBroker adapter interface used by lib functions.
 * Using this instead of `any` gives better IDE support while
 * avoiding a circular import of adapter-core in every lib file.
 */
export interface AdapterLike {
	namespace: string;
	instance?: number;
	config: any;
	contentLang?: 'en' | 'de';

	log: {
		info: (msg: string) => void;
		warn: (msg: string) => void;
		error: (msg: string) => void;
		debug: (msg: string) => void;
	};

	getForeignStateAsync(id: string): Promise<ioBroker.State | null | undefined>;
	setForeignStateAsync(id: string, value: ioBroker.StateValue, ack?: boolean): Promise<any>;

	getForeignObjectAsync(id: string): Promise<ioBroker.Object | null | undefined>;
	setForeignObjectAsync(id: string, obj: any): Promise<any>;
	extendForeignObjectAsync(id: string, obj: any): Promise<any>;

	readDirAsync(adapter: string, path: string): Promise<any[]>;
	readFileAsync(adapter: string, path: string): Promise<any>;
	writeFileAsync(adapter: string, path: string, data: Buffer | string): Promise<any>;
	unlinkAsync(adapter: string, path: string): Promise<any>;

	setTimeout: (cb: (...args: any[]) => void, ms: number) => ioBroker.Timeout | undefined;
	clearTimeout(timer: ioBroker.Timeout): void;
	delay(ms: number): Promise<void>;
}

export type FlightMode = 'TAKEOFF' | 'LANDING' | 'OVERFLIGHT' | '';

/**
 *
 */
export interface JetFrameConfig {
	enabled: boolean;

	homeLat: number;

	homeLon: number;

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

	radiusNm: number;

	adsbCustomUrl: string;
	maxHomeDistanceNm: number;

	searchPollSeconds: number;

	livePollSeconds: number;

	liveMaxSeconds: number;

	windowBearingDeg: number;

	windowFovDeg: number;

	minAltitudeFt: number;

	maxAltitudeFt: number;

	autoRunwayTrackToleranceDeg: number;

	minClimbRate: number;

	minSinkRate: number;

	overflightEnabled: boolean;

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

	externalManufacturerLogos: boolean;
	manufacturerLogoUrls: string;
	externalAirlineLogos: boolean;
	airlineLogoBaseUrl: string;
	cacheExternalImages: boolean;

	overflightMaxDistanceNm: number;

	overflightMinAltitudeFt: number;

	overflightMaxAltitudeFt: number;

	overflightRequiresWindow: boolean;

	dpRoot: string;

	airportJsonDp: string;

	speechMode?: 'browser' | 'external' | 'both' | 'off';

	speechTemplate?: string;

	speechEnabled: boolean;

	webPort: number;
	webLanguage: 'auto' | 'en' | 'de';
	contentLang: 'en' | 'de';
}

/**
 *
 */
export interface Aircraft {
	hex: string;

	callsign: string;

	operationalCallsign?: string;
	routeCallsign?: string;

	type: string;

	registration: string;

	lat: number;

	lon: number;

	altFt: number;

	speedKt: number;

	trackDeg: number;

	verticalRate: number;

	seenSec: number;

	bearingHomeDeg?: number;

	distHomeNm?: number;
	distanceKm?: number;

	distAirportNm?: number;

	bearingAircraftToAirportDeg?: number;

	bearingAirportToAircraftDeg?: number;

	landingTrackDiffDeg?: number;

	takeoffTrackDiffDeg?: number;

	airportTrackDiffDeg?: number;

	windowDiffDeg?: number;

	windowDiffAbsDeg?: number;

	inWindow?: boolean;

	relevant?: boolean;

	priority?: number;

	mode?: FlightMode;

	icon?: string;

	directionText?: string;

	airlineName?: string;

	airlineIata?: string;

	airlineIcao?: string;

	originIata?: string;

	destIata?: string;

	originName?: string;

	destName?: string;

	routeText?: string;

	routeTextLong?: string;

	routeReliable?: boolean;

	routeWarning?: string;

	routeSource?: string;

	aircraftModel?: string;

	aircraftType?: string;

	logoUrl?: string;

	jetphotosUrl?: string;

	jetphotosImageUrl?: string;

	localLogoUrl?: string;

	localImageUrl?: string;

	finalImageUrl?: string;

	specialText?: string;

	speechText?: string;

	specialLiveryTitle?: string;

	specialLiveryDescription?: string;

	specialLiveryFull?: string;

	specialLiveryVisText?: string;

	specialDisplayText?: string;

	modeVisText?: string;

	probableRunway?: string;
	probableRunwayText?: string;
	probableRunwayHeading?: number;
	probableRunwayDiffDeg?: number;
	runwayConfidence?: number;
	windowPositionText?: string;

	windowPositionClass?: string;

	windowPositionSpeechText?: string;

	originDisplayName?: string;

	destDisplayName?: string;
	departureAirport?: string;
	approachAirport?: string;

	routeDisplayText?: string;

	routeCodesText?: string;

	manufacturer?: string;

	manufacturerLogoText?: string;

	manufacturerLogoUrl?: string;

	aircraftTypeText?: string;

	aircraftSize?: string;

	squawk?: string;
	emergency?: string;
	isEmergency?: boolean;
	emergencyType?: string;
	emergencyText?: string;

	isSpecial?: boolean;
}
