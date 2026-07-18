"""
Multi-Agent Replay Buffer
Stores transitions for QMIX training.
Transition tuple: (state, observations, actions, rewards, next_state, next_observations, dones)
"""

import numpy as np
import random
import torch

class MultiAgentReplayBuffer:
    def __init__(self, capacity: int, n_agents: int, obs_dim: int, state_dim: int):
        self.capacity = capacity
        self.n_agents = n_agents
        self.obs_dim = obs_dim
        self.state_dim = state_dim
        
        self.states = np.zeros((capacity, state_dim), dtype=np.float32)
        self.next_states = np.zeros((capacity, state_dim), dtype=np.float32)
        
        self.observations = np.zeros((capacity, n_agents, obs_dim), dtype=np.float32)
        self.next_observations = np.zeros((capacity, n_agents, obs_dim), dtype=np.float32)
        
        self.actions = np.zeros((capacity, n_agents), dtype=np.int64)
        self.rewards = np.zeros((capacity, 1), dtype=np.float32) # Global reward
        self.dones = np.zeros((capacity, 1), dtype=np.float32)
        
        self.ptr = 0
        self.size = 0

    def push(self, state, obs, action, reward, next_state, next_obs, done):
        """
        Push a new transition into the buffer.
        obs and action should be iterables of length n_agents.
        """
        self.states[self.ptr] = state
        self.next_states[self.ptr] = next_state
        
        for i in range(self.n_agents):
            self.observations[self.ptr, i] = obs[i]
            self.next_observations[self.ptr, i] = next_obs[i]
            self.actions[self.ptr, i] = action[i]
            
        self.rewards[self.ptr] = reward
        self.dones[self.ptr] = done
        
        self.ptr = (self.ptr + 1) % self.capacity
        self.size = min(self.size + 1, self.capacity)

    def sample(self, batch_size: int, device="cpu"):
        """
        Sample a batch of transitions.
        Returns PyTorch tensors.
        """
        indices = np.random.choice(self.size, batch_size, replace=False)
        
        batch = {
            "states": torch.FloatTensor(self.states[indices]).to(device),
            "next_states": torch.FloatTensor(self.next_states[indices]).to(device),
            "observations": torch.FloatTensor(self.observations[indices]).to(device),
            "next_observations": torch.FloatTensor(self.next_observations[indices]).to(device),
            "actions": torch.LongTensor(self.actions[indices]).to(device),
            "rewards": torch.FloatTensor(self.rewards[indices]).to(device),
            "dones": torch.FloatTensor(self.dones[indices]).to(device)
        }
        
        return batch

    def __len__(self):
        return self.size
