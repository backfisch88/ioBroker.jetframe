![Logo](admin/jetframe.png)

# ioBroker.jetframe

[![NPM version](https://img.shields.io/npm/v/iobroker.jetframe.svg)](https://www.npmjs.com/package/iobroker.jetframe)
[![Downloads](https://img.shields.io/npm/dm/iobroker.jetframe.svg)](https://www.npmjs.com/package/iobroker.jetframe)
[![NPM](https://nodei.co/npm/iobroker.jetframe.png?downloads=true)](https://www.npmjs.com/package/iobroker.jetframe)

## JetFrame

**JetFrame** is an ioBroker adapter for live flight tracking and visualization based on ADS-B data. It detects aircraft flying past your window and displays them in a modern web app with photo, flight information and statistics.

## Features

- **Live flight tracking** via ADS-B (adsb.lol with automatic fallback to adsb.fi)
- **Window detection** – only shows aircraft that actually pass through your field of view
- **Real-time visualization** with aircraft photo, airline logo, manufacturer logo and flight route
- **Heatmap** – daily statistics with spotter-time analysis and best spotting time
- **Statistics** – record days, heavy-aircraft tracking, special-livery detection
- **Speech output** – optional, via browser TTS or external ioBroker objects
- **Runway detection** – shows the probable departure/arrival runway
- **Responsive web UI** – optimized for iPhone, iPad and desktop (portrait and landscape)
- **Overflight mode** – optional detection of aircraft passing directly overhead
- **Emergency detection** – squawk 7500/7600/7700 are highlighted

## Requirements

- ioBroker js-controller ≥ 6.0.11
- Node.js ≥ 22
- Simple-API adapter (for the web interface)
- ADS-B coverage near you (public APIs are used, no own receiver required)

## Configuration

After installation, configure the adapter under **Admin → JetFrame → Instance → Settings**:

| Setting | Description |
|---|---|
| **Home coordinates** | Latitude and longitude of your location |
| **Airport** | IATA code, name and coordinates of the nearest airport |
| **Search radius (nm)** | Radius (nautical miles) around the airport used for ADS-B queries |
| **Window direction** | Compass bearing your window faces (0° = north) |
| **Window field of view** | Field of view of your window, in degrees (e.g. 90°) |
| **Altitude limits** | Minimum/maximum altitude (ft) at which aircraft are shown |
| **Poll interval** | How often new aircraft are searched for (search and live tracking) |
| **Overflights** | Enables detection of aircraft passing directly overhead |
| **Speech output** | Browser TTS, external ioBroker object, or disabled |
| **Images** | Configuration for external airline and manufacturer logos |

## Web Interface

The web app is reachable through the Simple-API adapter:

```
http://<iobroker-ip>:<simple-api-port>/jetframe.admin/index.html
```

### Pages

| Page | URL | Description |
|---|---|---|
| **Home** | `index.html` | Overview, system status, navigation |
| **Live Frame** | `frame.html` | Real-time aircraft display with photo |
| **Heatmap** | `heatmap.html` | Daily statistics and best spotting time |
| **Statistics** | `stats.html` | Records, all-time rankings, daily history |

### URL Parameters

| Parameter | Example | Description |
|---|---|---|
| `instance` | `?instance=1` | Adapter instance (default: `0`) |
| `apiHost` | `?apiHost=192.168.1.10` | Simple-API hostname |
| `apiPort` | `?apiPort=8087` | Simple-API port |
| `source` | `?source=overflight` | Display mode: `current`, `airport`, `overflight` |

### Language

The web UI pages (`index.html`, `frame.html`, `heatmap.html`, `stats.html`) are currently **German-only** and do not yet have an i18n mechanism. This is a known limitation; multi-language support for the web UI is planned for a future release. The admin configuration page itself is fully translated into all 11 supported ioBroker languages.

## ioBroker States

The adapter creates the following states under `jetframe.0.*`:

### Status

| State | Type | Description |
|---|---|---|
| `enabled` | boolean | Enable/disable the adapter |
| `status` | string | Current status text |
| `clearImageCache` | boolean | Trigger: clear the image cache |

### Current flight (`current.*`)

| State | Description |
|---|---|
| `callsign` | IATA callsign (e.g. `LH123`) |
| `routeDisplayText` | Route as text (e.g. `Frankfurt → Munich`) |
| `routeCodesText` | Route as IATA codes (e.g. `FRA → MUC`) |
| `airlineName` | Airline name |
| `aircraftTypeText` | Aircraft type (e.g. `Airbus A321`) |
| `aircraftSize` | Size class (`Narrowbody`, `Widebody`, `Jumbo`, …) |
| `registration` | Registration (e.g. `D-AIBL`) |
| `altitudeFt` | Altitude in feet |
| `speedKt` | Speed in knots |
| `verticalRate` | Climb/descent rate (ft/min) |
| `probableRunwayText` | Probable runway (e.g. `RWY 25L`) |
| `windowPositionText` | Window position (e.g. `left of window · 12°`) |
| `modeVisText` | Mode text (e.g. `🛬 Landing Frankfurt`) |
| `localImageUrl` | URL to the cached aircraft photo |
| `speechText` | Speech-output text |
| `specialLiveryVisText` | Special livery (e.g. `100th Anniversary`) |
| `emergencyText` | Emergency info (for squawk 7500/7600/7700) |

### Statistics (`statistics.today.*`, `statistics.yesterday.*`, `statistics.alltime.*`)

Daily statistics with flight count, landings, departures, overflights, best spotting time, heavy-aircraft counter, special-livery counter, top airlines and top routes.

## Images & Logos

JetFrame can display aircraft photos, airline logos and manufacturer logos. By default these are fetched from public APIs (JetPhotos for photos, HexDB for route/airline data). External logo sources can be configured in the adapter settings. Optional local caching reduces external requests and speeds up display.

## Privacy & Legal Notice

JetFrame queries public ADS-B APIs:

- **[adsb.lol](https://adsb.lol)** – primary data source
- **[adsb.fi](https://adsb.fi)** – automatic fallback
- **[Jetphotos.com](https://www.jetphotos.com)** – aircraft photos (URL lookup only, no download unless caching is enabled)
- **[HexDB.io](https://hexdb.io)** – route and airline information
- **[Flightradar24](https://www.flightradar24.com)** – supplementary route information

All data is stored exclusively locally within ioBroker. No user data is shared with third parties.

ADS-B data consists of publicly broadcast signals transmitted by aircraft. Its use is legal in most countries and is tolerated by aviation authorities. Responsibility for lawful use lies with the operator.

All trademarks, logos, airline names, aircraft images and related content remain the property of their respective rights holders. JetFrame is not affiliated with, endorsed by, or officially connected to any airline, airport, aircraft manufacturer, JetPhotos, ADS-B provider, or flight-tracking service.

This adapter is intended exclusively for private, informational, non-commercial local visualization. Users are responsible for complying with the licenses and API terms of the configured external services.

## Changelog

<!--
    Placeholder for the next version (at the beginning of the line):
    ### **WORK IN PROGRESS**
-->


### **WORK IN PROGRESS**
- (ioBroker-Bot) Adapter requires admin >= 7.8.23 now.

### 1.0.7 (2026-06-23)

- (backfisch88) Bugfix release: build output is now committed to the repository (required by the ioBroker repo-checker), added CHANGELOG_OLD.md for older changelog entries

### 1.0.6 (2026-06-23)

- (backfisch88) Bugfix release: removed invalid io-package.json schema property, translated README.md to English, removed the last plain setTimeout()-based fallback in favor of mandatory adapter-managed delay()

Older entries can be found in [CHANGELOG_OLD.md](CHANGELOG_OLD.md).

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
