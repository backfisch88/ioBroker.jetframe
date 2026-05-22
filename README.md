# ioBroker.jetframe

[![NPM version](https://img.shields.io/npm/v/iobroker.jetframe.svg)](https://www.npmjs.com/package/iobroker.jetframe)
[![Downloads](https://img.shields.io/npm/dm/iobroker.jetframe.svg)](https://www.npmjs.com/package/iobroker.jetframe)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)

**JetFrame** ist ein ioBroker-Adapter zur Live-Flugverfolgung und -visualisierung auf Basis von ADS-B-Daten. Er erkennt Flugzeuge, die an deinem Fenster vorbeifliegen, und zeigt sie in einer modernen Web-App mit Foto, Fluginformationen und Statistiken an.

---

## ✈️ Funktionen

- **Live-Flugverfolgung** über ADS-B (adsb.lol mit automatischem Fallback auf adsb.fi)
- **Fenstererkennung** – zeigt nur Flugzeuge, die tatsächlich durch dein Sichtfeld fliegen
- **Echtzeit-Visualisierung** mit Flugzeugfoto, Airline-Logo, Hersteller-Logo und Flugroute
- **Heatmap** – Tagesstatistik mit Spotterzeitanalyse und bester Spotterzeit
- **Statistiken** – Rekordtage, Heavy-Aircraft-Tracking, Special-Livery-Erkennung
- **Sprachausgabe** – optional über Browser-TTS oder externe ioBroker-Objekte
- **Runway-Erkennung** – zeigt die wahrscheinliche Start-/Landebahn an
- **Responsive Web-UI** – optimiert für iPhone, iPad und Desktop (Portrait und Landscape)

---

## 📋 Voraussetzungen

- ioBroker (aktuelle Version empfohlen)
- Node.js **≥ 22**
- Simple-API Adapter (für die Web-Oberfläche)
- ADS-B-Empfang in deiner Nähe (öffentliche APIs werden genutzt, kein eigener Receiver nötig)

---

## 🚀 Installation

### Über ioBroker Admin (empfohlen)

1. Im ioBroker Admin unter **Adapter** auf das **+**-Symbol klicken
2. „Eigene URL" wählen und folgendes eingeben:
   ```
   https://github.com/backfisch88/ioBroker.jetframe/tarball/main
   ```
3. Adapter installieren und konfigurieren

### Manuell via npm

```bash
iobroker url https://github.com/backfisch88/ioBroker.jetframe/tarball/main
iobroker upload jetframe
iobroker start jetframe.0
```

---

## ⚙️ Konfiguration

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

---

## 🌐 Web-Oberfläche

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

Die Web-App unterstützt folgende URL-Parameter für mehrere Instanzen oder abweichende API-Konfigurationen:

| Parameter | Beispiel | Beschreibung |
|---|---|---|
| `instance` | `?instance=1` | Adapter-Instanz (Standard: `0`) |
| `apiHost` | `?apiHost=192.168.1.10` | Simple-API Hostname |
| `apiPort` | `?apiPort=8087` | Simple-API Port |
| `source` | `?source=overflight` | Anzeigemodus: `current`, `airport`, `overflight` |

---

## 📊 ioBroker-Datenpunkte

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

---

## 🏗️ Entwicklung

### Voraussetzungen

- Node.js ≥ 22
- TypeScript (wird als dev-dependency installiert)

### Befehle

```bash
# Abhängigkeiten installieren
npm install

# TypeScript bauen
npm run build

# Im Watch-Modus entwickeln
npm run watch

# Typ-Check ohne Build
npm run check

# Linting
npm run lint

# Tests
npm run test

# Neue Version releasen
npm run release
```

### Projektstruktur

```
ioBroker.jetframe/
├── admin/                  # Web-Oberfläche (HTML, CSS, JS)
│   ├── index.html          # Startseite
│   ├── frame.html          # Live-Flugzeigeanzeige
│   ├── heatmap.html        # Tages-Heatmap
│   ├── stats.html          # Statistiken
│   └── jetframe.css        # Design-System (Glassmorphism, responsive)
├── src/
│   ├── main.ts             # Adapter-Hauptklasse
│   └── lib/
│       ├── types.ts        # Gemeinsame TypeScript-Typen
│       ├── adsb.ts         # ADS-B API-Client (adsb.lol + Fallback)
│       ├── classify.ts     # Flugzeug-Klassifizierung & Fenster-Matching
│       ├── flightInfo.ts   # Fluginformationen (Route, Airline, Bild)
│       ├── images.ts       # Bild-Download & -Caching
│       ├── states.ts       # ioBroker-State-Management
│       ├── airports.ts     # Flughafen-Datenbank
│       ├── geo.ts          # Geo-Berechnungen
│       ├── config.ts       # Konfigurationsverarbeitung
│       ├── specialLiveries.ts  # Sonderlackierungen-Datenbank
│       ├── staticFiles.ts  # Admin-Dateien ins ioBroker-VFS kopieren
│       └── visConfig.ts    # Visualisierungs-Konfiguration
├── test/                   # Integrationstests
├── io-package.json         # ioBroker-Paketbeschreibung
└── package.json
```

---

## 📄 Datenschutz & Rechtliches

JetFrame ruft öffentliche ADS-B-APIs ab:

- **[adsb.lol](https://adsb.lol)** – primäre Datenquelle
- **[adsb.fi](https://adsb.fi)** – automatischer Fallback
- **[Jetphotos.com](https://www.jetphotos.com)** – Flugzeugfotos (nur URL-Lookup, kein Download ohne Cache-Einstellung)
- **[HexDB.io](https://hexdb.io)** – Routen- und Airline-Informationen
- **[FR24 (Flightradar24)](https://www.flightradar24.com)** – Ergänzende Routeninformationen

Alle Daten werden ausschließlich lokal im ioBroker gespeichert. Es werden keine Nutzerdaten an Dritte weitergegeben.

ADS-B-Daten sind öffentlich zugängliche Signale, die von Flugzeugen ausgestrahlt werden. Die Nutzung ist in den meisten Ländern legal und wird von Luftfahrtbehörden toleriert. Die Verantwortung für die rechtskonforme Nutzung liegt beim Betreiber.

---

## 📝 Changelog

### 1.0.0 (2026-05-22)

**Vollständiges Redesign der Web-Oberfläche**
- Neues Glassmorphism Design-System – einheitliche CSS-Datei ohne Duplikate
- Vollständig responsiv: iPhone (Portrait + Landscape), iPad (Portrait + Landscape), Desktop
- Live Frame: Flugzeugfoto immer im 16:10-Format, Preload-Skeleton passend zum Layout
- Heatmap: Neue Stunden-Heatmap mit Wärme-Gradient und beste Spotterzeit
- Statistik: Rekordtage, Heavy-Aircraft, Special-Liveries, Alltime-Rankings

**Verbesserte Flugerkennung**
- ADS-B Fallback: automatisch adsb.lol → adsb.fi bei Nichterreichbarkeit
- Stabilere Flugverfolgung und Runway-Zuordnung
- Fensterpositionen-Berechnung (links/rechts/direkt, Grad-Angabe)

**Technische Verbesserungen**
- TypeScript: `AdapterLike`-Interface statt `any` in lib-Funktionen
- Entfernung aller `.bak`-Dateien und Buildartefakte
- Bereinigung der `package.json` (keine doppelten Script-Einträge)
- `shouldWarn503` (unbenutzter Code) entfernt
- Leere JSDoc-Blöcke aus `types.ts` entfernt

### 0.6.0 (2026-05-19)

- Komplett neues glassmorphes UI
- Tablet- und Handy-Optimierungen
- Neue Heatmap-Seite
- Neue Statistik-Seite
- ADS-B Fallback auf adsb.fi
- Special-Livery-Erkennung
- Airline-/Hersteller-Logos
- Squawk-/Notfall-Erkennung
- Flugzeug-Größenklassen (Narrowbody, Widebody, Jumbo, …)

### 0.5.0

- Konfigurierbare Visualisierung und Anzeigequelle
- Flugzeug-Priorisierung
- Verbesserte Admin-Karte

### 0.1.0 – 0.4.x

- Erste Versionen, grundlegende ADS-B-Integration

---

## 📜 Lizenz

MIT License – © 2024–2026 [backfisch88](https://github.com/backfisch88)

Weitere Details siehe [LICENSE](LICENSE).
