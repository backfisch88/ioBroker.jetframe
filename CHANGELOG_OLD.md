# Older changelog entries

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
## 1.0.7 (2026-06-23)

- (backfisch88) Bugfix release: build output is now committed to the repository (required by the ioBroker repo-checker), added CHANGELOG_OLD.md for older changelog entries

## 1.0.6 (2026-06-23)

- (backfisch88) Bugfix release: removed invalid io-package.json schema property, translated README.md to English, removed the last plain setTimeout()-based fallback in favor of mandatory adapter-managed delay()
