from graph import build_city_graph
from optimizer import TrafficOptimizer
import networkx as nx

def test_routing():
    print("Building City Graph...")
    G = build_city_graph()
    optimizer = TrafficOptimizer(G)
    
    print("Graph Nodes:", G.nodes())
    start = "N1"
    end = "N5"
    
    # Test 1: Static Path (No Traffic)
    path = optimizer.find_optimal_path(start, end, realtime_data=None)
    print(f"Static Path from {start} to {end}: {path}")
    
    # Test 2: Traffic Penalty
    # Simulate heavy queue at N3 (University)
    mock_realtime = {
        "signals": {"N3": "RED"},
        "queues": {"N3": 50} # High queue penalty
    }
    
    # Should potentially prefer different path if available or cost increases
    # In this simple line graph, path might be same but cost higher. 
    # Let's see if we can force a different path. 
    # Current edges: N1-N2-N3-N4-N5 and N1-N3 direct.
    # N1-N3 direct is 1500m. N1-N2-N3 is 1200+1000 = 2200m.
    # Default best is N1-N3 (1500m).
    
    # If N3 has high penalty, maybe go N1-N2? But N2 also leads to N3...
    # Wait, N2 connects to N3. So both paths go through N3??
    # Edges: N1-N2, N2-N3, N3-N4, N4-N5. Also N1-N3.
    # So all paths to N5 go through N3.
    # So routing won't change, but we should see cost calculation logic working if we inspected it.
    
    # Let's just verify code runs without error for now.
    path_traffic = optimizer.find_optimal_path(start, end, realtime_data=mock_realtime)
    print(f"Traffic Path from {start} to {end}: {path_traffic}")
    
    print("Test Complete.")

if __name__ == "__main__":
    test_routing()
