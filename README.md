# SolarGrid AI — Residential Microgrid Energy Management & Decision Support

SolarGrid AI is a modern, responsive web application for simulation-based residential microgrid energy management and engineering decision support. Built using a **warm white, forest green, and emerald** control-room aesthetic with **accessible typography, interactive energy-flow animations, and engineering-grade analytics**.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│                   React 19 + Vite UI                   │
│  Tailwind CSS v4 • Recharts • Radix UI • Lucide Icons │
└───────────────────────────▲────────────────────────────┘
                            │ HTTP (Cookie Sessions & JSON)
┌───────────────────────────▼────────────────────────────┐
│                  FastAPI Backend Server                │
│  Routers: Auth, Simulations, Outage, Explain, Config   │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
┌─────────────▼──────────────┐ ┌───────────▼─────────────┐
│  Python Simulation Engine  │ │  MongoDB Database (Motor│
│ Pure, deterministic physics│ │ Users, Scenarios, Runs  │
│ Dispatch, DSM, P2P, Outage │ │ Seeded Demo Account     │
└─────────────┬──────────────┘ └─────────────────────────┘
              │
┌─────────────▼──────────────┐
│    Gemini AI Explanation   │
│  Narrates computed output  │
│ (Universal Key / Gemini 3) │
└────────────────────────────┘
```

> **Engineering Principle:** Every operational kilowatt-hour, tariff calculation, battery state-of-charge, and dispatch decision is computed strictly by the **deterministic Python simulation engine**. Gemini AI is used solely to explain calculated results in plain language when credentials are available, falling back to a deterministic rule-based engine when unconfigured.

---

## Features & Modules

1. **Microgrid Control Center Dashboard (`/`)**
   - **Interactive Energy-Flow Topology:** Animated dynamic SVG bus showing kilowatt flows between PV arrays, community battery, household loads, and the utility grid.
   - **Hourly Simulation Slider:** Scrub through 24 simulated hours (00:00 to 23:00) with instant topology updates and state-of-charge indicators.
   - **Core KPIs:** Self-sufficiency %, Total PV generation, Grid import/export, and daily monetary savings.
   - **Outage Watch & Maintenance Alerts:** Real-time summary widgets with direct module links.
   - **Gemini AI Run Overview:** 1-click plain-language briefing on microgrid performance.

2. **Simulation Studio (`/simulation`)**
   - **Solar-User Groups:** Multi-group rooftop PV configuration (capacity per home in kWp, number of homes).
   - **Consumers & Demand:** Non-solar household counts, daily demand (kWh), and profile selection (*Residential, Evening Peak, Daytime Occupancy, Flat*).
   - **Battery Storage:** Capacity (kWh), round-trip efficiency (%), charge/discharge ratings, initial & minimum reserve SoC.
   - **Weather & Grid Conditions:** Sunny, Partly Cloudy, Overcast, Rainy weather states; full islanding or partial grid blackout windows.
   - **Decision Strategies:** Toggle **Demand-Side Management (DSM)** (shifting ~12% flexible loads to solar hours) and **Peer-to-Peer (P2P) energy sharing**.
   - **Instant Preview & Saved Runs:** Run instant in-memory previews or save named runs.

3. **Hourly Energy Balance & Decisions (`/energy-balance`)**
   - **Hourly Dispatch Stacked Chart:** Visualizing battery charging/discharging, grid exchange, curtailment, and DSM shifts.
   - **Complete Decision Audit Log:** Hour-by-hour ledger tracking PV, Demand, P2P, Battery ±, SoC, Grid ±, Curtailment, and engine decisions (*Charge battery, Export to grid, Discharge battery, Shed non-essential load, Balanced*).
   - **Solar Group Balance Table:** Net daily supply/deficit per consumer cluster.
   - **AI Dispatch Explainer:** Contextual analysis of dispatch choices.

4. **Scenario Comparison (`/scenarios`)**
   - **Multi-Scenario Benchmarking:** Compare up to 3 saved scenarios side-by-side.
   - **Metric Deltas Table:** Direct comparison of self-sufficiency %, generation, imports, curtailment, battery cycles, and net energy costs.
   - **Visual Benchmark Charts:** Bar comparison across scenarios.
   - **AI Comparative Trade-Off Analysis:** Gemini assesses economic, self-consumption, and resiliency trade-offs.

5. **Generation & Demand Forecasts (`/forecasts`)**
   - **48-Hour Forward Projections:** Clear-sky irradiance model × weather factor with **P10–P90 probabilistic uncertainty bands**.
   - **Day 1 vs Day 2 Outlook Cards:** Peak demand hours, net energy balance, and cloud-cover variance.
   - **Telemetry Ready:** Formatted for future Solcast / OpenWeather API ingestion.

6. **Predictive Maintenance & Cleaning (`/maintenance`)**
   - **Equipment Health Score:** 0–100 composite index tracking dust accumulation, module degradation, and inverter conversion efficiency.
   - **Soiling Loss Gauge & Economic Recovery:** Real-time calculation of recoverable kilowatt-hours and $/day value.
   - **Automated Cleaning Payback Schedule:** Optimal maintenance cycle timelines.
   - **Diagnostic Alerts:** Actionable alerts for high battery cycling, deep discharges, string degradation, or overdue cleaning.

7. **Grid Outage Battery Survival (`/outage`)**
   - **Three Resilience Tiers:** Exact hours of survival for **Full household load**, **Essential load tier** (refrigeration + lighting + comms), and **Critical life-safety tier**.
   - **72-Hour SoC Decay Curves:** Hour-by-hour simulation including daytime PV recharging.
   - **Interactive What-If Simulator:** Dynamically test different blackout start hours, battery capacities, and initial charge levels.
   - **Emergency Load-Shedding Playbook:** Practical steps to stretch backup power.

8. **Settings & Integrations (`/settings`)**
   - **Profile & Currency Customization:** Name, organization, and currency formatting (USD, EUR, GBP, AUD, CAD, JPY, INR).
   - **Gemini AI Configuration:** Universal key, custom API key, or rule-based fallback status.
   - **Telemetry Interface Status:** Inverter (Modbus SunSpec), Smart Meter (DLMS/MQTT), and Weather API status clearly documented as simulated demonstration feeds ready for future hardware adapters.
   - **Demo Reset:** Restore demonstration scenarios at any time.

---

## Getting Started

### 1. Default Demonstration Credentials
- **Email:** `demo@solargrid.ai`
- **Password:** `SolarDemo2026!`
- *(A "Use demo account" 1-click button is available directly on the login screen).*

### 2. Running Locally

#### Backend (FastAPI + Simulation Engine)
```powershell
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

#### Database Seeding
```powershell
cd backend
python seed.py
```

#### Frontend (React + Vite)
```powershell
npm install
npm run dev
```

App is served on `http://localhost:5173/`.
Backend API is available on `http://localhost:8000/`.
