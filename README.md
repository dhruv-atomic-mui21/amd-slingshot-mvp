### Sarthak GreenSync

## AI-Driven Traffic Signal Optimization

### AMD Slingshot 2026 — Technical Report and Implementation Guide

**Track:** Sustainable Smart Cities
**Focus:** Intelligent Transportation Systems, Real-Time Optimization, ROCm-Ready Architecture

## 1. Executive Summary

GreenSync is an AI-driven traffic management system designed to optimize traffic signal phase timing across an urban grid in real time. The system dynamically adapts signal behavior based on live congestion metrics, reducing vehicle queue lengths, idle time, fuel consumption, and CO₂ emissions.

The project demonstrates:

* Graph-based traffic modeling
* Real-time signal phase simulation
* AI-assisted routing and corridor optimization
* Deterministic replay and before/after benchmarking
* Readiness for GPU-accelerated workloads under AMD ROCm

## 2. Problem Statement

Urban traffic congestion results in:

* Excessive idling and fuel waste
* Increased greenhouse gas emissions
* Inefficient fixed-time signal plans that do not adapt to demand

Most deployed systems rely on static schedules or localized heuristics. GreenSync addresses this gap by modeling the city as a weighted graph and continuously re-optimizing signal timing and routing decisions based on real-time state.

## 3. System Overview

GreenSync consists of a frontend visualization layer and a backend simulation and optimization engine.

### High-Level Architecture

```
┌────────────────────────┐      HTTP / JSON     ┌─────────────────────────┐ 
│   Frontend Dashboard   │ ◄──────────────────► │   Backend API           │
│                        │                      │                         │
│ - Live city map        │                      │ - Traffic simulation    │
│ - Signal visualization │                      │ - A* pathfinding        │
│ - KPI charts           │                      │ - SPaT replay engine    │
└────────────────────────┘                      └─────────────────────────┘
                                                           │
                                                  ┌────────┴─────────┐
                                                  │ City Graph Model │
                                                  │ 56-node grid     │
                                                  │ NetworkX         │
                                                  └──────────────────┘
```

## 4. Core Capabilities

### 4.1 Traffic Modeling

* City represented as a 56-node (7×8) directed graph
* Edge weights dynamically updated based on queue length and signal state
* Supports predefined critical corridors for worst-case analysis

### 4.2 Signal Phase and Timing (SPaT)

* Real-time signal state updates at 1-second resolution
* CSV-based SPaT timeline replay for deterministic evaluation
* Accelerated playback for rapid benchmarking

### 4.3 AI-Assisted Routing

* A* pathfinding over live-weighted graph
* Avoids congested intersections
* Accepts node IDs or geographic coordinates

### 4.4 Baseline vs Optimized Comparison

* Fixed-time baseline simulation
* Optimized adaptive signal control
* Time-series comparison of:

  * Queue length
  * Average delay
  * Estimated CO₂ emissions

### 4.5 SUMO Integration

* Native TraCI support for real microscopic traffic simulation
* Automatic fallback to deterministic mock simulation if SUMO is unavailable
* Identical API surface for both modes

## 5. Backend Design

### Module Responsibilities

| Module                      | Description                                                        |
| --------------------------- | ------------------------------------------------------------------ |
| `core/graph.py`             | City grid generation and A* routing with live congestion weighting |
| `core/corridor.py`          | Predefined corridor simulation for worst-case evaluation           |
| `simulation/sumo_runner.py` | TraCI-based SUMO interface with runtime detection                  |
| `simulation/mock_sumo.py`   | Deterministic traffic simulator with peak-wave modeling            |
| `simulation/spat_engine.py` | SPaT CSV parser and replay controller                              |
| `app.py`                    | Flask REST API exposing simulation and optimization endpoints      |

## 6. REST API Specification

| Endpoint             | Method | Purpose                                     |
| -------------------- | ------ | ------------------------------------------- |
| `/health`            | GET    | Service health and SUMO availability        |
| `/api/config`        | GET    | Full city graph topology                    |
| `/api/live-data`     | GET    | Signal states, queues, live KPIs            |
| `/api/route`         | POST   | A* routing between two points               |
| `/api/compare`       | GET    | Baseline vs optimized metrics (300s window) |
| `/api/spat/timeline` | GET    | Full SPaT replay dataset                    |

## 7. Frontend Capabilities

* Interactive city map with live signal states
* Real-time routing visualization
* KPI dashboard with time-series charts
* Before/after scenario comparison panel
* Geolocation-based routing initialization

## 8. AMD Slingshot and Acceleration Readiness

While the current prototype executes on CPU, the architecture is intentionally designed for GPU acceleration:

### ROCm-Ready Workloads

* Graph traversal and pathfinding
* Parallel corridor simulations
* Batched SPaT evaluation
* Time-series KPI aggregation

### Planned GPU Offload Targets

* NetworkX graph operations → HIP/CuGraph equivalent
* Multi-scenario simulation loops
* Reinforcement learning–based signal optimization

The modular backend enables transparent substitution of accelerated kernels without frontend or API changes.

## 9. Reproducibility and Determinism

* Fixed random seeds in mock simulation
* CSV-based SPaT replay
* Deterministic baseline and optimized runs
* Identical inputs produce identical outputs

This ensures fair benchmarking and hackathon evaluation.

## 10. Setup and Execution Guide

### Prerequisites

* Python 3.10+
* Node.js 18+

### Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
python app.py
```


### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## 11. Enabling Real SUMO Simulation

By default, GreenSync runs in mock simulation mode.

To enable live SUMO:

```bash
pip install traci
```

Install SUMO (version ≥ 1.8.0), then restart the backend. The system automatically detects SUMO and switches to live TraCI mode.

## 12. Project Structure

```
amd-slingshot-mvp/
├── backend/
│   ├── app.py
│   ├── core/
│   ├── simulation/
│   └── data/
└── frontend/
    └── src/
        ├── components/
        └── services/
```
**Note:- this is an mvp version of the actual project for the amd slingshot contest, for details about all my research on this idea check out here:  https://github.com/dhruv-atomic-mui21/sarthak-GS.git
## 13. License

MIT License
© 2026 GreenSync Team
AMD Slingshot Hackathon Submission
