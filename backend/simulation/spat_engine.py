"""
SPaT (Signal Phase and Timing) Replay Engine
============================================
Reads a CSV file with historical/synthetic signal data and replays it
at 1× or accelerated speed, emitting JSON events.

CSV Format:
    time_s, intersection_id, phase, duration_s
    0,      INT_0,           GREEN, 40
    0,      INT_1,           RED,   45
    ...

Usage:
    engine = SpatEngine("data/sample_spat.csv")
    engine.load()
    for event in engine.replay(speed=5.0):
        print(event)   # {"time_s": 12, "states": {"INT_0": "GREEN", ...}}
"""

import csv
import time
import threading
from collections import defaultdict
from pathlib import Path
from typing import Dict, Iterator

# ──────────────────────────────────────────────────────────────────────────────

class SpatEvent:
    """A single signal transition event."""
    def __init__(self, time_s: float, intersection_id: str, phase: str, duration_s: float):
        self.time_s          = time_s
        self.intersection_id = intersection_id
        self.phase           = phase
        self.duration_s      = duration_s

    def to_dict(self):
        return {
            "time_s":          self.time_s,
            "intersection_id": self.intersection_id,
            "phase":           self.phase,
            "duration_s":      self.duration_s
        }


class SpatEngine:
    """
    Replays SPaT data from a CSV file.

    Attributes:
        csv_path  : Path to the SPaT CSV.
        events    : List of SpatEvent (sorted by time_s).
        duration_s: Total scenario duration in seconds.
    """

    def __init__(self, csv_path: str):
        self.csv_path  = Path(csv_path)
        self.events: list[SpatEvent] = []
        self.duration_s: float = 0.0
        self._current_state: Dict[str, str] = {}   # intersection_id → phase
        self._current_time: float = 0.0
        self._lock = threading.Lock()
        self._loaded = False

    # ── Loading ───────────────────────────────────────────────────────────────

    def load(self):
        """Parse the CSV file into SpatEvent objects."""
        self.events = []
        with open(self.csv_path, newline='') as f:
            reader = csv.DictReader(f)
            for row in reader:
                evt = SpatEvent(
                    time_s          = float(row["time_s"]),
                    intersection_id = row["intersection_id"].strip(),
                    phase           = row["phase"].strip().upper(),
                    duration_s      = float(row["duration_s"])
                )
                self.events.append(evt)

        self.events.sort(key=lambda e: e.time_s)
        if self.events:
            last = self.events[-1]
            self.duration_s = last.time_s + last.duration_s
        self._loaded = True
        print(f"[SPaT] Loaded {len(self.events)} events, duration={self.duration_s}s")

    # ── State Snapshot (thread-safe) ──────────────────────────────────────────

    def get_snapshot(self) -> dict:
        """Returns the current playback state (used by polls)."""
        with self._lock:
            return {
                "time_s":   self._current_time,
                "duration_s": self.duration_s,
                "progress": round(self._current_time / self.duration_s * 100, 1)
                             if self.duration_s else 0,
                "states":   dict(self._current_state)
            }

    def get_state_at(self, t: float) -> Dict[str, str]:
        """
        Returns the signal state of every intersection at time t.
        Each intersection holds the LAST phase that started at or before t.
        """
        # Group events by intersection
        by_node: Dict[str, list] = defaultdict(list)
        for evt in self.events:
            by_node[evt.intersection_id].append(evt)

        state: Dict[str, str] = {}
        for node_id, evts in by_node.items():
            # Find the active phase at time t
            active = "RED"
            for evt in evts:
                if evt.time_s <= t < evt.time_s + evt.duration_s:
                    active = evt.phase
                    break
            state[node_id] = active
        return state

    # ── Replay Generator ──────────────────────────────────────────────────────

    def replay(self, speed: float = 1.0, step_s: float = 1.0) -> Iterator[dict]:
        """
        Generator that yields snapshots at every `step_s` of simulation time.
        Wall-clock sleep = step_s / speed.
        """
        if not self._loaded:
            self.load()

        t = 0.0
        sleep_time = step_s / speed

        while t <= self.duration_s:
            state = self.get_state_at(t)
            with self._lock:
                self._current_time  = t
                self._current_state = state

            yield {
                "time_s":     round(t, 1),
                "duration_s": self.duration_s,
                "progress":   round(t / self.duration_s * 100, 1),
                "states":     state
            }

            time.sleep(sleep_time)
            t += step_s

    def build_timeline(self) -> list:
        """
        Returns the full replay as a list of snapshots (no sleep, instant).
        Used by /api/compare to generate time-series data.
        """
        if not self._loaded:
            self.load()
        timeline = []
        for t in range(0, int(self.duration_s) + 1, 5):   # every 5 seconds
            state = self.get_state_at(float(t))
            timeline.append({"time_s": t, "states": state})
        return timeline


# ── Module-level helpers ──────────────────────────────────────────────────────

_default_engine: SpatEngine | None = None

def get_engine(csv_path: str | None = None) -> SpatEngine:
    global _default_engine
    if _default_engine is None:
        path = csv_path or str(Path(__file__).parent.parent / "data" / "sample_spat.csv")
        _default_engine = SpatEngine(path)
        _default_engine.load()
    return _default_engine
