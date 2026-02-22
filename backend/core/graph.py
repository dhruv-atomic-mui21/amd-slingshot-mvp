import networkx as nx
import random

def generate_city_grid(rows=7, cols=8):
    """
    Generates a grid graph representing a city with traffic intersections.
    Nodes are (row, col) tuples converted to string IDs "R-C".
    Edges have 'distance' and 'speed_limit'.
    """
    G = nx.grid_2d_graph(rows, cols)
    
    # Convert node labels to string format "R-C" (e.g., "0-0", "1-2")
    mapping = {node: f"{node[0]}-{node[1]}" for node in G.nodes()}
    G = nx.relabel_nodes(G, mapping)
    
    # Add node attributes (approx lat/long for visualization)
    # Let's assume top-left (0,0) is at 23.0300, 72.5400
    # Each block is roughly 500m
    base_lat = 23.0300
    base_lon = 72.5400
    lat_step = 0.0045 # approx 500m
    lon_step = 0.0045
    
    for node_id in G.nodes():
        r, c = map(int, node_id.split('-'))
        lat = base_lat + (r * lat_step)
        lon = base_lon + (c * lon_step)
        G.nodes[node_id]['pos'] = (lat, lon)
        G.nodes[node_id]['name'] = f"Intersection {node_id}"
        
    # Add edge attributes
    for u, v in G.edges():
        # Manhattan distance on grid is 1 unit, let's say 500m
        dist = 500 
        G[u][v]['distance'] = dist
        G[u][v]['speed_limit'] = 50 # km/h
        G[u][v]['base_time'] = dist / (50 / 3.6) # seconds
        
    # To make it more "city-like", remove a few random edges to create blocks
    # But ensure connectivity
    # (Skipping for MVP to ensure simple grid routing first)
        
    return G

# Initialize the city graph once
CITY_GRAPH = generate_city_grid(rows=7, cols=8)

def get_graph_topology():
    """Returns nodes and edges for frontend visualization."""
    nodes = []
    for n, data in CITY_GRAPH.nodes(data=True):
        nodes.append({
            "id": n,
            "lat": data['pos'][0],
            "lon": data['pos'][1],
            "name": data['name']
        })
        
    edges = []
    for u, v, data in CITY_GRAPH.edges(data=True):
        edges.append({
            "source": u,
            "target": v,
            "distance": data['distance']
        })
        
    return {"nodes": nodes, "edges": edges}

def get_best_route(start_node, end_node, traffic_data=None):
    """
    Finds the shortest path using A* algorithm.
    If traffic_data (queues) is provided, edge weights are adjusted dynamically.
    """
    G = CITY_GRAPH.copy()
    
    # Update weights based on traffic
    if traffic_data:
        for u, v in G.edges():
            # Get queue length for the target node 'v'
            # (In a directed graph, queue at V affects U->V traversal)
            # Since grid is undirected in structure but directed in traversal,
            # we apply penalty if the target node is congested.
            
            queue_len = traffic_data.get(v, 0)
            
            # Base weight is travel time
            weight = G[u][v]['base_time']
            
            # Traffic Penalty: 
            # Assume each car adds ~2s delay (simplified)
            penalty = queue_len * 2.0 
            
            G[u][v]['current_weight'] = weight + penalty
    else:
        for u, v in G.edges():
            G[u][v]['current_weight'] = G[u][v]['base_time']
            
    try:
        path = nx.shortest_path(G, source=start_node, target=end_node, weight='current_weight')
        return path
    except nx.NetworkXNoPath:
        return []

