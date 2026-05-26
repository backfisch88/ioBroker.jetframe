![Logo](admin/jetframe.png)

# ioBroker.jetframe

[![NPM version](https://img.shields.io/npm/v/iobroker.jetframe.svg)](https://www.npmjs.com/package/iobroker.jetframe)
[![Downloads](https://img.shields.io/npm/dm/iobroker.jetframe.svg)](https://www.npmjs.com/package/iobroker.jetframe)
![Number of Installations](https://iobroker.live/badges/jetframe-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/jetframe-stable.svg)

[![Test and Release](https://github.com/backfisch88/ioBroker.jetframe/actions/workflows/test-and-release.yml/badge.svg)](https://github.com/backfisch88/ioBroker.jetframe/actions/workflows/test-and-release.yml)

---

## ✈️ JetFrame

JetFrame is a modern FlightWall adapter for ioBroker.

It detects nearby aircraft based on your window position and visualizes them with live flight information, airline branding, aircraft metadata and optional speech announcements.

---

## ✨ Features

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
- Responsive standalone WebApp
- Heatmap statistics
- Emergency / Squawk support
- Aircraft prioritization
- Optional image caching

---

## 🛠 Requirements

- ioBroker
- web adapter
- simple-api adapter
- modern browser (Safari or Chrome recommended)

---

## 🚀 Usage

1. Install and start the required ioBroker adapters:
   - `web`
   - `simple-api`

2. Configure JetFrame in the adapter settings:
   - your home position
   - nearest airport
   - visible viewing direction
   - Simple-API host and port
   - visualization source
   - optional image providers
   - optional image caching

3. Open the WebApp:

    http://IPADRESSE:8082/jetframe/

Direct pages:

    http://IPADRESSE:8082/jetframe/frame.html
    http://IPADRESSE:8082/jetframe/heatmap.html

Example:

    http://192.168.178.10:8082/jetframe/

Optional URL overrides:

    http://IPADRESSE:8082/jetframe/frame.html?apiHost=192.168.178.10&apiPort=8087&source=current

Available sources:

    current
    airport
    overflight

---

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

---

## 🖼️ Images & Logos

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

## 💾 Optional Image Caching

Caching of external images can now be enabled or disabled.

Supports caching for:

- airline logos
- manufacturer logos
- aircraft images

Useful for:

- kiosk systems
- reducing API traffic
- faster loading

---

## 🌍 Configurable API Host

The WebApp supports configurable API hosts.

Example:

    http://IP:8082/jetframe/frame.html?apiHost=192.168.178.10&apiPort=8087

Useful for:

- reverse proxies
- Docker
- Home Assistant dashboards
- remote panels

---

## 📡 Configurable ADS-B Sources

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

## 🚨 Flight Prioritization

JetFrame dynamically prioritizes aircraft.

Priority examples:

- special liveries
- emergency squawks
- emergency aircraft
- runway relevance
- airport relevance
- aircraft near viewing direction

Special aircraft automatically appear before normal traffic.

---

## 📊 Heatmap

Heatmap features:

- responsive landscape mode
- auto-fit layout
- optimized iPhone usage
- top airlines
- top routes
- best traffic time
- current hour statistics
- fullscreen-friendly layout

---

## 📦 Installation

Install the adapter via the ioBroker Admin interface after it has been added to the official ioBroker repository.


## ⚠️ Legal Notice

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

Users are responsible for complying with the licenses and API terms of configured external services.

---

## 🚀 Roadmap

Planned future features:

- historical statistics
- better airport heatmaps
- optional map integration

---

## Changelog

### v1.0.4

- Fix CI deploy workflow and release metadata cleanup.

### v1.0.3

- Release cleanup and checker preparation.


## WORK IN PROGRESS

### v1.0.0

✨ New

- Added standalone WebApp
- Added welcome/start page
- Added responsive heatmap
- Added fullscreen iPhone/iPad support
- Added configurable API host support
- Added external manufacturer logo support
- Added external airline logo support
- Added optional image caching
- Added improved aircraft prioritization
- Added automatic ADS-B fallback handling
- Added landscape auto-fit layout
- Added top airlines and routes statistics
- Added configurable image provider support

🛠 Improvements

- Improved mobile layouts
- Improved iPhone standalone support
- Improved heatmap scaling
- Improved emergency prioritization
- Improved image handling
- Reduced package size significantly
- Removed bundled image/logo dependencies
- Improved fallback handling for adsb.lol / adsb.fi
- Improved fullscreen experience
- Improved Apple-style UI consistency

### v0.5.0

- Added configurable visualization settings
- Added aircraft prioritization
- Added emergency / Squawk support
- Added overflight mode
- Added improved visualization handling

### v0.4.0

- Initial release

---

### License

MIT License

Copyright (c) 2026 backfisch88

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
OF ANY KIND.




Current version: 1.0.4
