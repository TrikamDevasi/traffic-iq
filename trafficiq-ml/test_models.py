import torch
import numpy as np
from models.gat import TrafficGAT
from models.qmix import QMIXAgent

def test_gat():
    print("Testing GAT...")
    in_channels = 10
    hidden_channels = 32
    out_channels = 16
    
    model = TrafficGAT(in_channels, hidden_channels, out_channels)
    
    # 3 nodes, 2 edges
    x = torch.rand((3, in_channels))
    # edges: 0->1, 1->2, 2->0 (plus self loops if needed, but not required by GATConv usually)
    edge_index = torch.tensor([[0, 1, 2], [1, 2, 0]], dtype=torch.long)
    
    out = model(x, edge_index)
    assert out.shape == (3, out_channels), f"GAT shape mismatch: {out.shape}"
    print("GAT test passed.")

def test_qmix():
    print("Testing QMIX...")
    n_agents = 4
    obs_dim = 10
    state_dim = 20
    n_actions = 4
    batch_size = 8
    
    model = QMIXAgent(n_agents, obs_dim, state_dim, n_actions)
    
    observations = [torch.rand(batch_size, obs_dim) for _ in range(n_agents)]
    state = torch.rand(batch_size, state_dim)
    
    q_vals = model(observations, state)
    assert q_vals.shape == (batch_size, n_agents, n_actions), f"QMIX output shape mismatch: {q_vals.shape}"
    
    # Simulate chosen actions
    chosen_action_qs = q_vals.max(dim=2)[0] # (batch_size, n_agents)
    q_tot = model.mixer(chosen_action_qs.unsqueeze(1), state)
    assert q_tot.shape == (batch_size, 1), f"Q_tot shape mismatch: {q_tot.shape}"
    print("QMIX test passed.")

if __name__ == "__main__":
    test_gat()
    test_qmix()
