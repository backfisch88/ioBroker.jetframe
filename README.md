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

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.