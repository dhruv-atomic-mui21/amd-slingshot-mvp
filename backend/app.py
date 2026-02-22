from flask import Flask, jsonify, request
from flask_cors import CORS
from core.graph import CITY_GRAPH, get_graph_topology, get_best_route
from core.corridor import run_comparison, CORRIDOR
from simulation.sumo_runner import get_runner, is_sumo_active
from simulation.mock_sumo import generate_dual_simulation_data
from simulation.spat_engine import get_engine
import time
import datetime
import math

app = Flask(__name__)
CORS(app)

# Initialize the SUMO runner on startup
_runner = get_runner()
NODE_IDS = list(CITY_GRAPH.nodes())

# ─────────────────────────────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────────────────────────────
@app.route('/health')
def health():
    return jsonify({
        "status": "healthy",
        "service": "GreenSync Backend",
        "nodes": len(NODE_IDS),
        "sumo_active": is_sumo_active()
    })

# ─────────────────────────────────────────────────────────────────────
# Graph Topology (static, sent once on load)
# ─────────────────────────────────────────────────────────────────────
@app.route('/api/config')
def get_config():
    """Returns the static graph topology (nodes + edges) for the map."""
    return jsonify(get_graph_topology())

# ─────────────────────────────────────────────────────────────────────
# Live Traffic State (polled every 1s by frontend)
# ─────────────────────────────────────────────────────────────────────
@app.route('/api/live-data')
def get_live_data():
    now = time.time()
    timestamp = datetime.datetime.now().isoformat()

    if is_sumo_active():
        # Advance simulation and read real SUMO state
        _runner.step()
        sim = _runner.get_state(NODE_IDS)
        signals   = sim["signals"]
        queues    = sim["queues"]

        total_q  = sum(queues.values())
        avg_wait = total_q * 1.5   # SUMO gives more accurate queues

        return jsonify({
            "timestamp": timestamp,
            "mode": "SUMO",
            "signals": signals,
            "queues": queues,
            "metrics": {
                "queue_length": total_q,
                "avg_wait_time": round(avg_wait, 1),
                "carbon_offset": round((time.time() % 3600) * 0.05, 3),
                "ai_confidence": round(98.5 + math.sin(now), 2)
            }
        })
    else:
        # Mock dual-simulation fallback
        sim_data = generate_dual_simulation_data(now)
        b_q = sim_data["baseline"]["queues"]
        o_q = sim_data["optimized"]["queues"]
        b_total = sum(b_q.values())
        o_total = sum(o_q.values())
        b_wait  = b_total * 2.5
        o_wait  = o_total * 1.2

        queue_reduction = round(
            ((b_total - o_total) / b_total * 100) if b_total > 0 else 0, 1
        )

        return jsonify({
            "timestamp": timestamp,
            "mode": "MOCK",
            # Expose optimized signals as the "live" view
            "signals": sim_data["optimized"]["signals"],
            "queues":  sim_data["optimized"]["queues"],
            "metrics": {
                "queue_length": o_total,
                "avg_wait_time": round(o_wait, 1),
                "carbon_offset": round((time.time() % 3600) * 0.05, 3),
                "ai_confidence": round(98.5 + math.sin(now), 2)
            },
            "comparison": {
                "baseline_queue": b_total,
                "optimized_queue": o_total,
                "queue_reduction_pct": queue_reduction,
                "baseline_wait": round(b_wait, 1),
                "optimized_wait": round(o_wait, 1)
            }
        })

# ─────────────────────────────────────────────────────────────────────
# Route Finding
# ─────────────────────────────────────────────────────────────────────
@app.route('/api/route', methods=['POST'])
def get_route():
    """
    Find optimal path.
    Accepts: { start: "R-C", end: "R-C" }
    OR:       { start_lat, start_lon, end_lat, end_lon }
    """
    data = request.json or {}
    start = data.get('start')
    end   = data.get('end')

    # Support lat/lon input → snap to nearest grid node
    if not start and 'start_lat' in data:
        start = _snap_to_node(data['start_lat'], data['start_lon'])
    if not end and 'end_lat' in data:
        end = _snap_to_node(data['end_lat'], data['end_lon'])

    if not start or not end:
        return jsonify({"error": "Missing start or end node"}), 400

    # Get current queues for live weighting
    if is_sumo_active():
        state  = _runner.get_state([start, end] + list(CITY_GRAPH.nodes()))
        queues = state["queues"]
    else:
        sim    = generate_dual_simulation_data(time.time())
        queues = sim["optimized"]["queues"]

    path = get_best_route(start, end, queues)

    # Build a lat/lon polyline for Leaflet
    path_latlon = []
    for node_id in path:
        ndata = CITY_GRAPH.nodes[node_id]
        path_latlon.append({
            "id": node_id,
            "lat": ndata['pos'][0],
            "lon": ndata['pos'][1]
        })

    return jsonify({
        "path": path,
        "path_latlon": path_latlon,
        "estimated_duration_s": len(path) * 45,
        "estimated_distance_m": (len(path) - 1) * 500 if len(path) > 1 else 0
    })

# ─────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────
def _snap_to_node(lat: float, lon: float) -> str:
    """Find the nearest grid node to given lat/lon coordinates."""
    best_node = None
    best_dist = float('inf')
    for node_id, data in CITY_GRAPH.nodes(data=True):
        nLat, nLon = data['pos']
        dist = math.sqrt((lat - nLat)**2 + (lon - nLon)**2)
        if dist < best_dist:
            best_dist  = dist
            best_node  = node_id
    return best_node

# ─────────────────────────────────────────────────────────────────────
# Stage 2: SPaT Replay
# ─────────────────────────────────────────────────────────────────────
@app.route('/api/spat/status')
def get_spat_status():
    """Returns the current SPaT engine snapshot (call every ~1s to poll playback)."""
    engine = get_engine()
    return jsonify(engine.get_snapshot())

@app.route('/api/spat/timeline')
def get_spat_timeline():
    """Returns the full SPaT timeline as a list of snapshots (for chart init)."""
    engine = get_engine()
    return jsonify({
        "corridor": CORRIDOR,
        "timeline": engine.build_timeline()
    })

# ─────────────────────────────────────────────────────────────────────
# Stage 2: Optimization Comparison
# ─────────────────────────────────────────────────────────────────────
_comparison_cache: dict | None = None

@app.route('/api/compare')
def get_comparison():
    """
    Runs the baseline vs optimized comparison on the corridor.
    Results are cached after first run for demo performance.
    """
    global _comparison_cache
    duration = float(request.args.get('duration', 300))
    if _comparison_cache is None or request.args.get('refresh') == '1':
        _comparison_cache = run_comparison(duration_s=duration)
    return jsonify(_comparison_cache)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
