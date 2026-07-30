# 🚛 TNTC Telemetry Engine & Live Dashboard

![TNTC Logo](https://files.catbox.moe/ujn8ng.png)

A high-performance, real-time telemetry tracking system and live web dashboard built for the **Tamilnadu Trucking Crew (TNTC)** division under **Tamilnadu Logistics (TNL)**. 

This repository contains the custom C++ SCS Telemetry Plugin, the Python Companion app, and a fully modular vanilla JavaScript dashboard.

---

## 🌟 Key Features

### ⚡ Real-Time Telemetry & Tracking
* **0.01s Non-Blocking Threading:** Telemetry uploads to Google Sheets run asynchronously in background threads to guarantee zero game micro-stutters or frame drops in ETS2/ATS.
* **10-Second Live Sync:** Fast live rider updates with aggressive cache-busting so active deliveries render on the dashboard instantly.
* **Smart "PAUSED" Deliveries:** Closing the game (Alt+F4 or exit) automatically saves the ongoing waybill to a local vault and flags the driver as `PAUSED` on the web dashboard with a live 48-hour countdown timer.
* **Auto-Cleanup & Duplicate Wiper:** Automatically wipes duplicate entries and handles crash recoveries gracefully upon game launch.
* **Anti-Glitch Distance Engine:** Blocks free-cam / dev-cam teleports (capped at 5km per tick) and resolves the 400,000 km odometer bug.

### 🎨 Modular Web Dashboard
* **Lazy Loading Architecture:** Heavy sheets (like Tour manifests) only fetch data when their specific tab is clicked, dramatically saving user bandwidth.
* **Dynamic Event Cover Engine:** Automatically translates event dates (e.g., `"07 Jun"`) to match full monthly cover banners (`"June 2026"`).
* **Hall of Fame & All-Time Stats:** Features driver name normalization (`normalizeKey()`) to correctly group stats across upper/lowercase variations and whitespace.
* **Smart DOM Caching:** Custom DOM update engine (`updateDOMIfChanged`) prevents screen flickering during polling.

---

## 📁 Repository Structure

```text
├── index.html              # Main Dashboard Interface
├── core.js                 # Global states, utils, and DOM cache
├── api.js                  # Data fetchers & PapaParse CSV connectors
├── overview.js             # Division stats, leaderboards, & Chart.js engine
├── logs_events.js          # Job logs, Event filtering, & Modal logic
├── tour.js                 # Tour/Campaign manifest engine
├── liveriders.js           # Live telemetry UI & 48-hour timer ticker
├── init.js                 # Tab switching, lazy loading, & event listeners
├── TNTC_Companion.py       # Python Telemetry Engine (UDP receiver & Sheets bridge)
└── Telementry_code.cpp     # C++ SCS Telemetry SDK DLL Plugin
