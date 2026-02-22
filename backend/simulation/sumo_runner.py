"""
SUMO Runner: Manages the TraCI connection to a running SUMO process.
Falls back gracefully to mock simulation if SUMO is not installed.

Usage:
    runner = SumoRunner("data/ahmedabad.sumocfg")
    runner.start()
    state = runner.get_state()
    runner.stop()
"""
import os
import sys
import math
import random
import time

SUMO_AVAILABLE = False

try:
    import traci
    SUMO_AVAILABLE = True
    print("[SUMO] TraCI module found. SUMO integration enabled.")
except ImportError:
    print("[SUMO] TraCI not found. Running in MOCK mode.")


class SumoRunner:
    """
    Manages a SUMO TraCI session and exposes traffic state.
    If SUMO is not available, falls back to a deterministic mock.
    """

    def __init__(self, config_path: str = None):
        self.config_path = config_path or os.path.join(
            os.path.dirname(__file__), "..", "data", "ahmedabad.sumocfg"
        )
        self.active = False
        self._mock_time = time.time()

    def start(self):
        if SUMO_AVAILABLE and os.path.exists(self.config_path):
            try:
                sumo_binary = "sumo"
                traci.start([sumo_binary, "-c", self.config_path, "--no-step-log"])
                self.active = True
                print(f"[SUMO] Simulation started: {self.config_path}")
            except Exception as e:
                print(f"[SUMO] Failed to start: {e}. Falling back to MOCK.")
                self.active = False
        else:
            print("[SUMO] Config not found or SUMO not installed. Using MOCK.")
            self.active = False

    def step(self):
        """Advance simulation by one step."""
        if self.active:
            try:
                traci.simulationStep()
            except Exception as e:
                print(f"[SUMO] Step error: {e}")
                self.active = False

    def get_state(self, node_ids: list) -> dict:
        """
        Returns signal phases and queue lengths for all known nodes.
        If SUMO is active, queries TraCI. Otherwise returns mock data.
        """
        if self.active:
            return self._get_sumo_state(node_ids)
        else:
            return self._get_mock_state(node_ids)

    def _get_sumo_state(self, node_ids: list) -> dict:
        """Query TraCI for real signal and queue data."""
        signals = {}
        queues = {}

        # Get all traffic light IDs from SUMO
        tl_ids = traci.trafficlight.getIDList()
        lane_ids = traci.lane.getIDList()

        for node_id in node_ids:
            # Try to map node_id to a SUMO traffic light
            # Convention: node IDs like "3-4" → TL ID "tl_3_4"
            tl_id = node_id.replace("-", "_")
            if tl_id in tl_ids:
                phase = traci.trafficlight.getPhase(tl_id)
                # SUMO phases: even = green, odd = yellow/red (simplified)
                phase_def = traci.trafficlight.getPhaseDef(tl_id, phase)
                if 'G' in phase_def or 'g' in phase_def:
                    signals[node_id] = "GREEN"
                elif 'y' in phase_def or 'Y' in phase_def:
                    signals[node_id] = "YELLOW"
                else:
                    signals[node_id] = "RED"
            else:
                signals[node_id] = "GREEN"  # Default

            # Queue length: sum vehicles waiting on lanes near this node
            q = 0
            for lane_id in lane_ids:
                if tl_id in lane_id:
                    q += traci.lane.getLastStepHaltingNumber(lane_id)
            queues[node_id] = q

        return {"signals": signals, "queues": queues}

    def _get_mock_state(self, node_ids: list) -> dict:
        """Deterministic mock when SUMO is not available."""
        now = time.time()
        hour = (now / 3600) % 24
        intensity = (math.sin((hour - 9) * math.pi / 12) + 1) / 2 * 0.8 + 0.2

        signals = {}
        queues = {}
        cycle_time = 90
        t = now % cycle_time

        for node_id in node_ids:
            seed = sum(ord(c) for c in node_id)
            offset = (seed * 17) % cycle_time
            local_t = (t + offset) % cycle_time

            if local_t < 40:
                signals[node_id] = "GREEN"
            elif local_t < 45:
                signals[node_id] = "YELLOW"
            else:
                signals[node_id] = "RED"

            base_cars = int(intensity * 40)
            try:
                r, c = map(int, node_id.split('-'))
                if 2 <= r <= 5 and 2 <= c <= 5:
                    base_cars += 15
            except ValueError:
                pass

            noise = random.randint(-5, 15)
            queues[node_id] = max(0, base_cars + noise)

        return {"signals": signals, "queues": queues}

    def stop(self):
        if self.active:
            try:
                traci.close()
            except Exception:
                pass
            self.active = False
            print("[SUMO] Simulation stopped.")


# Global singleton runner
_runner: SumoRunner = None


def get_runner() -> SumoRunner:
    global _runner
    if _runner is None:
        _runner = SumoRunner()
        _runner.start()
    return _runner


def is_sumo_active() -> bool:
    return get_runner().active
