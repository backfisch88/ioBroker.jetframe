![Logo](admin/jetframe.png)

# ioBroker.jetframe

[![NPM version](https://img.shields.io/npm/v/iobroker.jetframe.svg)](https://www.npmjs.com/package/iobroker.jetframe)
[![Downloads](https://img.shields.io/npm/dm/iobroker.jetframe.svg)](https://www.npmjs.com/package/iobroker.jetframe)
![Number of Installations](https://iobroker.live/badges/jetframe-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/jetframe-stable.svg)

[![Test and Release](https://github.com/backfisch88/ioBroker.jetframe/actions/workflows/test-and-release.yml/badge.svg)](https://github.com/backfisch88/ioBroker.jetframe/actions/workflows/test-and-release.yml)

---

# ✈️ JetFrame

JetFrame is a modern FlightWall adapter for ioBroker.

It detects nearby aircraft based on your window position and visualizes them with live flight information, airline branding, aircraft metadata and optional speech announcements.

---

# ✨ Features

- Live aircraft detection
- Window-direction based filtering
- Apple-style glass UI
- Airline logos
- Manufacturer logos
- Flight routes
- Aircraft type detection
- Callsign / flight number
- Live ADS-B data
- JetPhotos integration
- Special liveries
- Browser speech synthesis
- Flyover animations
- Adaptive mobile UI


---

# 🛠 Requirements

- ioBroker
- simple-api adapter
- modern browser (Safari or Chrome recommended)

---

# 🚀 Usage

1. Install and start the required ioBroker adapters:
   - `web` adapter
   - `simple-api` adapter

2. Configure JetFrame in the adapter settings:
   - your home position
   - your nearest airport
   - your visible window direction / viewing area
   - Simple-API host and port for the visualization
   - visualization source: current flight, airport traffic or overflight

3. The visualization reads its connection settings from `vis-config.json`, which is written automatically by the adapter.

4. Open the visualization in your browser:

```text
http://IPADRESSE:8082/jetframe.admin/
```

Example:

```text
http://192.168.178.10:8082/jetframe.admin/
```

Optional URL overrides:

```text
http://IPADRESSE:8082/jetframe.admin/?apiHost=192.168.178.10&apiPort=8087&source=current
```

Available sources:

```text
current
airport
overflight
```

---

# 📦 Installation

```bash
iobroker url https://github.com/backfisch88/ioBroker.jetframe/releases/latest/download/iobroker.jetframe-0.4.0.tgz --host this
```

---

# ⚠️ Legal Notice

JetFrame may display publicly available aviation-related information including:

- airline names
- aircraft metadata
- airport information
- aircraft images
- airline logos
- manufacturer logos
- live flight tracking data

All trademarks, logos, airline names, aircraft images and related content remain the property of their respective owners.

JetFrame is not affiliated with, endorsed by or officially connected to any airline, airport, aircraft manufacturer, JetPhotos, ADS-B provider or flight tracking service.

The adapter is intended exclusively for:

- private use
- informational purposes
- non-commercial local visualizations

JetFrame itself does not bundle or claim ownership of third-party trademarks, airline logos or aircraft photography unless explicitly stated otherwise.

Users are responsible for complying with the respective licenses, API terms and usage restrictions of configured external data sources.

If you are a rights holder and believe content is being used improperly, please open an issue in this repository.

---

# 🚀 Roadmap

Planned future features:


---

# Changelog

## **WORK IN PROGRESS**

### v0.5.0

✨ New

* Added configurable visualization settings via adapter admin
* Added automatic config generation for the external visualization
* Added selectable visualization source: current flight, airport traffic or overflight
* Added aircraft prioritization options
* Added emergency / Squawk detection support
* Added emergency display states for the visualization
* Added configurable emergency Squawk handling for 7700, 7600 and 7500
* Added overflight-only mode

🛠 Improvements

* Improved Simple-API handling for the visualization
* Visualization now keeps Simple-API host, port and source consistent after reload
* Improved mobile admin layout
* Improved map sizing on mobile devices
* Improved map zoom behavior by excluding large ADS-B scan circles from automatic zoom
* Improved special livery display in the visualization
* Improved aircraft selection when multiple aircraft are visible

🎨 UI

* Added dedicated visualization settings block in admin
* Added prioritization settings block in admin
* Added emergency / Squawk settings block in admin
* Emergency messages are highlighted in the visualization
* Refined JetFrame visualization layout

### v0.4.0

* Initial release


---

# License

MIT License

Copyright (c) 2026 backfisch88

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.---

# 🆕 New in JetFrame 0.6.x

## 🌐 Standalone WebApp

JetFrame now includes a modern standalone WebApp interface.

Includes:

- responsive mobile layout
- fullscreen iPhone/iPad support
- standalone kiosk mode
- live flight frame
- heatmap statistics
- welcome/start page
- navigation between pages
- Apple-style UI

Pages:

http://IP:8082/jetframe/
http://IP:8082/jetframe/frame.html
http://IP:8082/jetframe/heatmap.html

---

# 🖼️ Images & Logos

JetFrame no longer ships with bundled images or logos.

This keeps:

- package size smaller
- updates faster
- licensing cleaner
- customization easier

Users can configure their own image/logo providers.

---

## Manufacturer Logos

Example using logo.dev:

AIRBUS=https://img.logo.dev/airbus.com?token=APIKEY&size=80&retina=true&format=png

BOEING=https://img.logo.dev/boeing.com?token=APIKEY&size=80&retina=true&format=png

EMBRAER=https://img.logo.dev/embraer.com?token=APIKEY&size=80&retina=true&format=png

Configured via:

- externalManufacturerLogos
- manufacturerLogoUrls

---

## Airline Logos

Example airline logo source:

https://raw.githubusercontent.com/Jxck-S/airline-logos/refs/heads/main/fr24_banners

Supports:

- airline logos
- aircraft images
- optional local caching
- external image providers

---

# 💾 Optional Image Caching

Caching of external images can now be enabled or disabled.

Supports caching for:

- airline logos
- manufacturer logos
- aircraft images

Useful for:

- kiosk systems
- offline setups
- reducing API traffic
- faster loading

---

# 🌍 Configurable API Host

The WebApp now supports configurable API hosts.

Example:

http://IP:8082/jetframe/frame.html?apiHost=192.168.178.10&apiPort=8087

Useful for:

- reverse proxies
- Docker
- Home Assistant dashboards
- remote panels

---

# 📡 Configurable ADS-B Sources

Supported:

- adsb.lol
- adsb.fi
- automatic fallback switching
- configurable source priority

Improved handling for:

- 503 errors
- connection resets
- automatic failover

---

# 🚨 Flight Prioritization

JetFrame now prioritizes aircraft dynamically.

Priority examples:

- special liveries
- emergency squawks
- emergency aircraft
- runway relevance
- airport relevance
- aircraft near viewing direction

Special aircraft automatically appear before normal traffic.

---

# 📊 Heatmap Improvements

New Heatmap features:

- responsive landscape mode
- auto-fit layout
- optimized iPhone usage
- top airlines
- top routes
- best traffic time
- current hour statistics
- fullscreen-friendly layout

---

# 📱 iPhone/iPad WebApp Support

Recommended setup:

1. Open in Safari
2. Share
3. Add to Home Screen

JetFrame launches like a native fullscreen app.

Optimized for:

- iPad wall displays
- kitchen dashboards
- kiosk installations
- airport spotting stations

