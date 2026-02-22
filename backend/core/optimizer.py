import networkx as nx
import math

class TrafficOptimizer:
    def __init__(self, graph):
        self.graph = graph
        
    def calculate_cost(self, u, v, data, realtime_data):
        # Base cost: travel time
        cost = data['base_time']
        
        # Add penalty if target node (v) has a Red Light or High Queue
        if realtime_data:
            node_data = realtime_data.get('signals', {}).get(v)
            queue_len = realtime_data.get('queues', {}).get(v, 0)
            
            # Penalty for RED light
            if node_data == "RED":
                cost += 30  # Assume avg 30s wait
                
            # Penalty for Queue (e.g., 2s per car)
            cost += queue_len * 2
            
        return cost
        
    def find_optimal_path(self, start_node, end_node, realtime_data=None):
        def heuristic(n1, n2):
            # Euclidean distance heuristic (simplified for lat/lon)
            # In production, use Haversine
            pos1 = self.graph.nodes[n1]['pos']
            pos2 = self.graph.nodes[n2]['pos']
            return math.sqrt((pos1[0]-pos2[0])**2 + (pos1[1]-pos2[1])**2) * 100000 # scaling factor

        def weight_func(u, v, data):
            return self.calculate_cost(u, v, data, realtime_data)
            
        try:
            path = nx.astar_path(self.graph, start_node, end_node, heuristic=heuristic, weight=weight_func)
            return path
        except nx.NetworkXNoPath:
            return []

    def get_green_wave_speed(self, path, realtime_data):
        # Simple logic: If next light is RED, slow down. If GREEN, maintain speed.
        next_node = path[1] if len(path) > 1 else None
        if not next_node:
            return 0
            
        signal = realtime_data.get('signals', {}).get(next_node)
        if signal == "RED":
            return 30 # Slow down to 30 km/h
        elif signal == "GREEN":
            return 50 # Speed up to 50 km/h (limit)
        else:
            return 40 # Moderate
