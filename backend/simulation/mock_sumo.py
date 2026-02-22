import time
import json
import random
import math
import sys
import os
from datetime import datetime

# Add parent directory to path to allow importing from core
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.graph import CITY_GRAPH

def generate_dual_simulation_data(timestamp):
    # Simulate peak hours using sine wave (Peak at 9 AM and 6 PM)
    hour = (timestamp / 3600) % 24
    intensity = (math.sin((hour - 9) * math.pi / 12) + 1) / 2 * 0.8 + 0.2
    
    baseline_phases = {}
    optimized_phases = {}
    baseline_queues = {}
    optimized_queues = {}

    cycle_time_baseline = 90
    t_base = timestamp % cycle_time_baseline

    cycle_time_opt = 60 # Shorter, more adaptive cycle for AI
    t_opt = timestamp % cycle_time_opt

    for node_id in CITY_GRAPH.nodes():
        seed = sum(ord(c) for c in node_id)
        
        # Traffic Volume (Base)
        base_cars = int(intensity * 40)
        r, c = map(int, node_id.split('-'))
        if 2 <= r <= 5 and 2 <= c <= 5: # Downtown
            base_cars += 15
        
        noise = random.randint(-5, 15)
        raw_volume = max(0, base_cars + noise)

        # Baseline Signal (Fixed 90s: 40G, 5Y, 45R)
        offset_base = (seed * 17) % cycle_time_baseline
        local_t_base = (t_base + offset_base) % cycle_time_baseline
        if local_t_base < 40:
            b_state = "GREEN"
        elif local_t_base < 45:
            b_state = "YELLOW"
        else:
            b_state = "RED"
        baseline_phases[node_id] = b_state

        # Optimized Signal (Adapts to volume - fake it by giving greener phases to high volume)
        opt_green_time = min(50, 20 + int(raw_volume * 0.8)) # Dynamic green time
        offset_opt = (seed * 23) % cycle_time_opt
        local_t_opt = (t_opt + offset_opt) % cycle_time_opt
        if local_t_opt < opt_green_time:
            o_state = "GREEN"
        elif local_t_opt < opt_green_time + 4:
            o_state = "YELLOW"
        else:
            o_state = "RED"
        optimized_phases[node_id] = o_state

        # Queue Calculation
        # Baseline: queues build up significantly during red, drain slowly
        b_queue = raw_volume
        if b_state == "RED":
            b_queue = int(raw_volume * 1.5) # Buildup
        elif b_state == "GREEN":
            b_queue = int(raw_volume * 0.8) # Slow drain

        b_queue = max(0, b_queue + int(math.sin(timestamp/10 + seed)*5))

        # Optimized: AI keeps queues short, drains efficiently
        o_queue = raw_volume
        if o_state == "RED":
            o_queue = int(raw_volume * 0.6) # Shorter red means less buildup
        elif o_state == "GREEN":
            o_queue = int(raw_volume * 0.2) # Fast drain (platoon cleared)
            
        o_queue = max(0, o_queue + int(math.sin(timestamp/10 + seed + 5)*2))

        # Further differentiate - AI is just better
        o_queue = min(o_queue, int(b_queue * 0.45)) # AI always at least 55% better

        baseline_queues[node_id] = b_queue
        optimized_queues[node_id] = o_queue

    return {
        "baseline": {
            "signals": baseline_phases,
            "queues": baseline_queues
        },
        "optimized": {
            "signals": optimized_phases,
            "queues": optimized_queues
        }
    }

def stream_data():
    print("Starting Mock SUMO Dual-Stream for 50+ Nodes...")
    try:
        while True:
            now = time.time()
            timestamp = datetime.now().isoformat()
            
            sim_data = generate_dual_simulation_data(now)
            
            data = {
                "timestamp": timestamp,
                "scenarios": sim_data,
                "metadata": {
                    "node_count": len(sim_data["baseline"]["signals"]),
                    "simulation_speed": "1.0x"
                }
            }
            
            print(json.dumps(data))
            time.sleep(1)
    except KeyboardInterrupt:
        print("Stream stopped.")

if __name__ == "__main__":
    stream_data()

