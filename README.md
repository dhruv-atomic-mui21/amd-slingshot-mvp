# 🚦 GreenSync — AI Traffic Optimization

> **AMD Slingshot 2026 Hackathon**  
> *Sustainable Smart Cities · ROCm-Accelerated Signal Optimization*

![GreenSync Dashboard](docs/images/dashboard_screenshot.png)

**GreenSync** is an AI-driven traffic management system that dynamically optimizes traffic signal phases to minimize congestion, reduce vehicle idling time, and cut CO₂ emissions across a city grid.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🗺 **Live Traffic Map** | 56-intersection city grid on dark OpenStreetMap tiles (react-leaflet) |
| 🚦 **Real-Time Signals** | Intersection markers switch Green/Yellow/Red every second |
| 🛣 **Live Route Finding** | Click Start + End — A\* finds the optimal path avoiding congested nodes |
| 📍 **Geolocation** | "Use My Location" snaps start point to nearest intersection |
| 📊 **Metrics Chart** | Queue length / delay / CO₂ comparison chart (baseline vs GreenSync) |
| ⚡ **SPaT Replay Engine** | CSV-based Signal Phase & Timing replay at 1× or accelerated speed |
| 🔁 **Before/After Compare** | Instant worst-case corridor scenario with CO₂ & fuel savings |
| 🔌 **SUMO Ready** | Real SUMO/TraCI integration — automatically falls back to mock if SUMO not installed |

---

## 🧠 Architecture

```
┌──────────────────────┐      HTTP/JSON       ┌──────────────────────┐
│   React Frontend     │ ◄──────────────────► │   Flask Backend      │
│  react-leaflet map   │                      │  NetworkX A* routing │
│  recharts charts     │                      │  SUMO / TraCI        │
│  Tailwind CSS        │                      │  SPaT Engine         │
└──────────────────────┘                      └──────────────────────┘
                                                        │
                                              ┌─────────┴──────────┐
                                              │   City Graph        │
                                              │  56-node 7×8 grid  │
                                              │  (NetworkX)         │
                                              └────────────────────┘
```

### Backend Modules

| Module | Purpose |
|---|---|
| `core/graph.py` | 56-node city grid generator, A\* routing with live traffic weighting |
| `core/corridor.py` | 8-node predefined corridor, baseline vs optimized simulation loop |
| `simulation/sumo_runner.py` | TraCI client — live SUMO or deterministic mock fallback |
| `simulation/mock_sumo.py` | Dual-mode simulation (baseline/optimized) with AM/PM peak waves |
| `simulation/spat_engine.py` | CSV SPaT reader with configurable replay speed |
| `app.py` | Flask REST API — 6 endpoints |

### API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Service health + SUMO status |
| `/api/config` | GET | Full graph topology (nodes + edges) |
| `/api/live-data` | GET | Real-time signals, queues, metrics |
| `/api/route` | POST | A\* path between two points (node IDs or lat/lon) |
| `/api/compare` | GET | Baseline vs GreenSync 300-second time series |
| `/api/spat/timeline` | GET | Full SPaT replay timeline |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1 — Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
python app.py
# → http://localhost:5000
```

### 2 — Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## 🎮 Demo Walkthrough

1. **Open** `http://localhost:5173`
2. **Explore the map** — 56 intersections pulse Green/Yellow/Red in real time
3. **Route Finding** — click any intersection (Start 🔵), then click another (End 🟣) — a glowing blue path appears
4. **Geolocation** — click 📍 to snap Start to your real location
5. **Metrics Chart** — scroll down to see queue length over the 300s simulation; the amber band marks the worst-case surge
6. **Run Scenario** — click "▶ Run Scenario" to see the AI's improvement vs fixed timing

---

## ⚡ Activating Real SUMO

The system runs in mock mode out of the box. To use live SUMO simulation:

```bash
# 1. Install SUMO ≥ 1.8.0
#    https://sumo.dlr.de/docs/Installing

# 2. Install Python bindings
pip install traci

# 3. Restart the backend — it auto-detects SUMO
python app.py
# → [SUMO] Simulation started: data/ahmedabad.sumocfg
```

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript |
| Mapping | react-leaflet + CartoDB Dark tiles |
| Charts | Recharts |
| Styling | TailwindCSS |
| Backend | Python 3, Flask, Flask-CORS |
| Graph | NetworkX (A\* pathfinding) |
| Simulation | SUMO + TraCI (optional), mock fallback |

---

## 📁 Project Structure

```
amd-slingshot-mvp/
├── backend/
│   ├── app.py                  # Flask API
│   ├── requirements.txt
│   ├── core/
│   │   ├── graph.py            # 56-node city grid + A* routing
│   │   └── corridor.py         # 8-node corridor comparison
│   ├── data/
│   │   ├── sample_spat.csv     # SPaT replay data (300s)
│   │   └── ahmedabad.sumocfg   # SUMO config
│   └── simulation/
│       ├── sumo_runner.py      # TraCI client + mock fallback
│       ├── mock_sumo.py        # Dual-mode traffic simulation
│       └── spat_engine.py      # SPaT CSV replay engine
└── frontend/
    └── src/
        ├── components/
        │   ├── TrafficMap.tsx  # react-leaflet interactive map
        │   ├── Dashboard.tsx   # Main layout + KPI strip
        │   ├── MetricsChart.tsx # Recharts time-series
        │   └── ComparePanel.tsx # Before/After comparison
        └── services/
            └── api.ts          # Backend API client
```

---

## 📄 License

MIT © 2026 GreenSync Team · AMD Slingshot Hackathon
