"""
QMIX Multi-Agent RL Module
Implements standard Monotonic Value Function Factorisation for MARL.
Includes Individual Agent Networks and a Mixing Network.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F

class AgentNetwork(nn.Module):
    """
    Individual Agent Q-Network (DRQN or dense).
    Here implemented as a dense network for simplicity, acting on observations.
    """
    def __init__(self, obs_dim: int, hidden_dim: int, n_actions: int):
        super(AgentNetwork, self).__init__()
        self.fc1 = nn.Linear(obs_dim, hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, hidden_dim)
        self.q_out = nn.Linear(hidden_dim, n_actions)

    def forward(self, obs):
        x = F.relu(self.fc1(obs))
        x = F.relu(self.fc2(x))
        return self.q_out(x)


class QMixer(nn.Module):
    """
    QMIX Mixing Network.
    Takes agent Q-values and global state, produces joint Q_tot.
    Weights are constrained to be non-negative (absolute value) to maintain monotonicity.
    """
    def __init__(self, n_agents: int, state_dim: int, mixing_embed_dim: int = 32):
        super(QMixer, self).__init__()
        self.n_agents = n_agents
        self.state_dim = state_dim
        self.embed_dim = mixing_embed_dim

        # Hypernetworks generate weights and biases from the global state
        self.hyper_w_1 = nn.Linear(state_dim, self.embed_dim * n_agents)
        self.hyper_w_final = nn.Linear(state_dim, self.embed_dim)
        
        # Biases don't strictly need to be strictly positive
        self.hyper_b_1 = nn.Linear(state_dim, self.embed_dim)
        self.V = nn.Sequential(
            nn.Linear(state_dim, self.embed_dim),
            nn.ReLU(),
            nn.Linear(self.embed_dim, 1)
        )

    def forward(self, agent_qs, states):
        """
        agent_qs: shape (batch_size, 1, n_agents)
        states:   shape (batch_size, state_dim)
        """
        batch_size = agent_qs.size(0)

        # Generate weights (must be absolute for monotonicity)
        w1 = torch.abs(self.hyper_w_1(states))
        w1 = w1.view(batch_size, self.n_agents, self.embed_dim)
        b1 = self.hyper_b_1(states).view(batch_size, 1, self.embed_dim)

        # First layer mixing
        hidden = F.elu(torch.bmm(agent_qs, w1) + b1)

        # Second layer weights
        w_final = torch.abs(self.hyper_w_final(states))
        w_final = w_final.view(batch_size, self.embed_dim, 1)

        # Final bias (V(s))
        v = self.V(states).view(batch_size, 1, 1)

        # Joint Q_tot
        q_tot = torch.bmm(hidden, w_final) + v
        return q_tot.view(batch_size, -1)


class QMIXAgent(nn.Module):
    """
    Wrapper holding both Agent networks and the Mixer.
    """
    def __init__(self, n_agents: int, obs_dim: int, state_dim: int, n_actions: int, hidden_dim: int = 64):
        super(QMIXAgent, self).__init__()
        self.n_agents = n_agents
        # Create an agent network for each intersection
        self.agents = nn.ModuleList([
            AgentNetwork(obs_dim, hidden_dim, n_actions) for _ in range(n_agents)
        ])
        self.mixer = QMixer(n_agents, state_dim)
        
    def forward(self, observations, state):
        """
        observations: list of tensors for each agent
        """
        agent_qs = []
        for i, agent in enumerate(self.agents):
            q_vals = agent(observations[i])
            # Take the max Q-value for each agent (acting greedily)
            # Or if training, take the Q-value of the chosen action. 
            # For simplicity in this forward pass, we'll return all Q-values.
            agent_qs.append(q_vals)
            
        return torch.stack(agent_qs, dim=1) # shape: (batch_size, n_agents, n_actions)
