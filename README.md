![Logo](admin/jetframe.png)

# ioBroker.jetframe

[![NPM version](https://img.shields.io/npm/v/iobroker.jetframe.svg)](https://www.npmjs.com/package/iobroker.jetframe)
[![Downloads](https://img.shields.io/npm/dm/iobroker.jetframe.svg)](https://www.npmjs.com/package/iobroker.jetframe)
[![NPM](https://nodei.co/npm/iobroker.jetframe.png?downloads=true)](https://www.npmjs.com/package/iobroker.jetframe)

## JetFrame

**JetFrame** ist ein ioBroker-Adapter zur Live-Flugverfolgung und -visualisierung auf Basis von ADS-B-Daten. Er erkennt Flugzeuge, die an deinem Fenster vorbeifliegen, und zeigt sie in einer modernen Web-App mit Foto, Fluginformationen und Statistiken an.

## Funktionen

- **Live-Flugverfolgung** über ADS-B (adsb.lol mit automatischem Fallback auf adsb.fi)
- **Fenstererkennung** – zeigt nur Flugzeuge, die tatsächlich durch dein Sichtfeld fliegen
- **Echtzeit-Visualisierung** mit Flugzeugfoto, Airline-Logo, Hersteller-Logo und Flugroute
- **Heatmap** – Tagesstatistik mit Spotterzeitanalyse und bester Spotterzeit
- **Statistiken** – Rekordtage, Heavy-Aircraft-Tracking, Special-Livery-Erkennung
- **Sprachausgabe** – optional über Browser-TTS oder externe ioBroker-Objekte
- **Runway-Erkennung** – zeigt die wahrscheinliche Start-/Landebahn an
- **Responsive Web-UI** – optimiert für iPhone, iPad und Desktop (Portrait und Landscape)
- **Überflugmodus** – optionale Erkennung von Flugzeugen, die direkt über dich fliegen
- **Notfallerkennung** – Squawk 7500/7600/7700 werden hervorgehoben

## Voraussetzungen

- ioBroker js-controller ≥ 6.0.11
- Node.js ≥ 22
- Simple-API Adapter (für die Web-Oberfläche)
- ADS-B-Empfang in deiner Nähe (öffentliche APIs werden genutzt, kein eigener Receiver nötig)

## Konfiguration

Nach der Installation im ioBroker-Admin unter **Adapter → JetFrame → Instanz → Einstellungen**:

| Einstellung | Beschreibung |
|---|---|
| **Heimat-Koordinaten** | Breitengrad und Längengrad deines Standorts |
| **Flughafen** | IATA-Code, Name und Koordinaten des nächsten Flughafens |
| **Suchradius (nm)** | Radius (in Seemeilen) um den Flughafen, in dem ADS-B-Daten abgerufen werden |
| **Fensterrichtung** | Himmelsrichtung, in die dein Fenster zeigt (0° = Norden) |
| **Fenster-Öffnungswinkel** | Sichtfeld deines Fensters in Grad (z. B. 90°) |
| **Höhengrenzen** | Minimale und maximale Flughöhe (ft), bei der Flugzeuge angezeigt werden |
| **Poll-Intervall** | Wie oft nach neuen Flugzeugen gesucht wird (Suche und Live-Tracking) |
| **Überflüge** | Aktiviert die Erkennung von Flugzeugen, die direkt über dich fliegen |
| **Sprachausgabe** | Browser-TTS, externes ioBroker-Objekt oder deaktiviert |
| **Bilder** | Konfiguration für externe Airline- und Hersteller-Logos |

## Web-Oberfläche

Die Web-App ist über den Simple-API-Adapter erreichbar:

```
http://<iobroker-ip>:<simple-api-port>/jetframe.admin/index.html
```

### Seiten

| Seite | URL | Beschreibung |
|---|---|---|
| **Startseite** | `index.html` | Übersicht, Systemstatus, Navigation |
| **Live Frame** | `frame.html` | Echtzeit-Flugzeigeanzeige mit Foto |
| **Heatmap** | `heatmap.html` | Tagesstatistik und beste Spotterzeit |
| **Statistik** | `stats.html` | Rekorde, Alltime-Rankings, Tageshistorie |

### URL-Parameter

| Parameter | Beispiel | Beschreibung |
|---|---|---|
| `instance` | `?instance=1` | Adapter-Instanz (Standard: `0`) |
| `apiHost` | `?apiHost=192.168.1.10` | Simple-API Hostname |
| `apiPort` | `?apiPort=8087` | Simple-API Port |
| `source` | `?source=overflight` | Anzeigemodus: `current`, `airport`, `overflight` |

## ioBroker-Datenpunkte

Der Adapter legt unter `jetframe.0.*` folgende Datenpunkte an:

### Status

| Datenpunkt | Typ | Beschreibung |
|---|---|---|
| `enabled` | boolean | Adapter aktivieren/deaktivieren |
| `status` | string | Aktueller Status-Text |
| `clearImageCache` | boolean | Trigger: Bild-Cache leeren |

### Aktueller Flug (`current.*`)

| Datenpunkt | Beschreibung |
|---|---|
| `callsign` | IATA-Rufzeichen (z. B. `LH123`) |
| `routeDisplayText` | Route als Text (z. B. `Frankfurt → München`) |
| `routeCodesText` | Route als IATA-Codes (z. B. `FRA → MUC`) |
| `airlineName` | Airline-Name |
| `aircraftTypeText` | Flugzeugtyp (z. B. `Airbus A321`) |
| `aircraftSize` | Größenklasse (`Narrowbody`, `Widebody`, `Jumbo`, …) |
| `registration` | Kennzeichen (z. B. `D-AIBL`) |
| `altitudeFt` | Höhe in Fuß |
| `speedKt` | Geschwindigkeit in Knoten |
| `verticalRate` | Steig-/Sinkrate (ft/min) |
| `probableRunwayText` | Wahrscheinliche Runway (z. B. `RWY 25L`) |
| `windowPositionText` | Fensterposition (z. B. `links vom Fenster · 12°`) |
| `modeVisText` | Modus-Text (z. B. `🛬 Landung Frankfurt`) |
| `localImageUrl` | URL zum gecachten Flugzeugfoto |
| `speechText` | Sprachausgabe-Text |
| `specialLiveryVisText` | Sonderlackierung (z. B. `100th Anniversary`) |
| `emergencyText` | Notfall-Info (bei Squawk 7500/7600/7700) |

### Statistiken (`statistics.today.*`, `statistics.yesterday.*`, `statistics.alltime.*`)

Tagesstatistiken mit Anzahl Flüge, Landungen, Starts, Überflüge, beste Spotterzeit, Heavy-Aircraft-Zähler, Special-Livery-Zähler, Top-Airlines und Top-Routen.

## Bilder & Logos

JetFrame kann Flugzeugfotos, Airline-Logos und Hersteller-Logos anzeigen. Diese werden standardmäßig über öffentliche APIs abgerufen (JetPhotos für Fotos, HexDB für Routen-/Airline-Daten). Externe Logo-Quellen lassen sich in den Adaptereinstellungen konfigurieren. Optionales lokales Caching reduziert externe Anfragen und beschleunigt die Anzeige.

## Datenschutz & Rechtliches

JetFrame ruft öffentliche ADS-B-APIs ab:

- **[adsb.lol](https://adsb.lol)** – primäre Datenquelle
- **[adsb.fi](https://adsb.fi)** – automatischer Fallback
- **[Jetphotos.com](https://www.jetphotos.com)** – Flugzeugfotos (nur URL-Lookup, kein Download ohne Cache-Einstellung)
- **[HexDB.io](https://hexdb.io)** – Routen- und Airline-Informationen
- **[Flightradar24](https://www.flightradar24.com)** – ergänzende Routeninformationen

Alle Daten werden ausschließlich lokal im ioBroker gespeichert. Es werden keine Nutzerdaten an Dritte weitergegeben.

ADS-B-Daten sind öffentlich zugängliche Signale, die von Flugzeugen ausgestrahlt werden. Die Nutzung ist in den meisten Ländern legal und wird von Luftfahrtbehörden toleriert. Die Verantwortung für die rechtskonforme Nutzung liegt beim Betreiber.

Alle Markenzeichen, Logos, Airline-Namen, Flugzeugbilder und verwandte Inhalte bleiben Eigentum ihrer jeweiligen Rechteinhaber. JetFrame ist nicht verbunden mit, unterstützt von oder offiziell verbunden mit Airlines, Flughäfen, Flugzeugherstellern, JetPhotos, ADS-B-Anbietern oder Flugverfolgungsdiensten.

Der Adapter ist ausschließlich für private, informative und nicht-kommerzielle lokale Visualisierungen vorgesehen. Nutzer sind selbst für die Einhaltung der Lizenzen und API-Bedingungen der konfigurierten externen Dienste verantwortlich.

## Changelog

<!--
    Placeholder for the next version (at the beginning of the line):
    ### **WORK IN PROGRESS**
-->

### 1.0.5 (2026-06-23)

- (backfisch88) Maintenance release: cleaned up devDependencies, fixed io-package.json schema issues, updated admin/release-script dependency requirements, replaced plain setTimeout with adapter-managed timers, removed obsolete backup files

### 1.0.0 (2026-05-22)

- (backfisch88) Complete redesign of the web UI (glassmorphism, fully responsive for iPhone, iPad and desktop)
- (backfisch88) Improved ADS-B fallback system (adsb.lol → adsb.fi)
- (backfisch88) New flight statistics with heatmap, heavy aircraft and special livery tracking
- (backfisch88) Cleaner TypeScript codebase

### 0.5.0 (2026-04-01)

- (backfisch88) Added configurable visualization settings, visual source selection, aircraft prioritization
- (backfisch88) Added squawk/emergency detection
- (backfisch88) Improved admin map behavior and mobile layout fixes

### 0.2.0 (2026-03-01)

- (backfisch88) Added HexDB route/image support, German airport city names
- (backfisch88) Improved speech trigger handling, overflight-only mode

### 0.1.0 (2026-02-01)

- (backfisch88) Initial release

## License

MIT License

Copyright (c) 2026 backfisch88 <h@h.de>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
