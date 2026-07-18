"""
Graph Attention Network (GAT) Module
Produces intersection embeddings considering the graph structure (neighbor traffic).
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GATConv

class TrafficGAT(nn.Module):
    def __init__(self, in_channels: int, hidden_channels: int, out_channels: int, heads: int = 2):
        super(TrafficGAT, self).__init__()
        # First GAT layer
        self.conv1 = GATConv(in_channels, hidden_channels, heads=heads, dropout=0.1)
        # Second GAT layer, outputs a single embedding vector per node
        self.conv2 = GATConv(hidden_channels * heads, out_channels, heads=1, concat=False, dropout=0.1)

    def forward(self, x, edge_index):
        """
        x: Node feature matrix of shape (num_nodes, in_channels)
           e.g., [traffic_density, queue_length, avg_speed, ...]
        edge_index: Graph connectivity matrix of shape (2, num_edges)
        """
        x = self.conv1(x, edge_index)
        x = F.elu(x)
        x = self.conv2(x, edge_index)
        return x
