"""
SUMO Environment Wrapper (with Custom Fallback)
Exposes an RL-friendly interface: reset(), step(), get_state()
If 'traci' is unavailable (e.g. SUMO not installed), it falls back to a simulated Python environment.
"""

import math
import random
import numpy as np

try:
    import traci
    SUMO_AVAILABLE = True
except ImportError:
    SUMO_AVAILABLE = False


class FallbackSimulator:
    """
    A lightweight mock simulator that mimics traffic behavior if SUMO is unavailable.
    Useful for testing the ML pipeline on systems without SUMO installed.
    """
    def __init__(self, config):
        self.config = config
        self.n_agents = config.get("n_intersections", 1)
        self.obs_dim = config.get("obs_dim", 10)
        self.state_dim = config.get("state_dim", 20)
        
        self.time_step = 0
        self.max_steps = config.get("duration", 3600)
        
        # State approximation: arbitrary features
        self._state = np.random.rand(self.state_dim).astype(np.float32)
        self._observations = np.random.rand(self.n_agents, self.obs_dim).astype(np.float32)

    def reset(self):
        self.time_step = 0
        self._state = np.random.rand(self.state_dim).astype(np.float32)
        self._observations = np.random.rand(self.n_agents, self.obs_dim).astype(np.float32)
        return self._state, self._observations

    def step(self, actions):
        """
        Takes actions (phases), updates state, and returns (reward, next_state, next_obs, done).
        """
        self.time_step += 1
        done = self.time_step >= self.max_steps
        
        # Simulate traffic changes based on actions (mock logic)
        for i, a in enumerate(actions):
            # E.g. phase 0 might clear traffic if there is some, else do nothing.
            # Here we just introduce random walk with drift
            self._observations[i] += np.random.normal(0, 0.1, self.obs_dim)
            self._observations[i] = np.clip(self._observations[i], 0, 1)

        self._state = np.random.rand(self.state_dim).astype(np.float32)
        
        # Mock global reward (e.g., negative of total queue length approximated by sum of observations)
        reward = -np.sum(self._observations)
        
        return reward, self._state, self._observations, done

    def close(self):
        pass


class SUMOEnvironment:
    """
    Real SUMO wrapper.
    """
    def __init__(self, sumocfg_path, config):
        if not SUMO_AVAILABLE:
            raise RuntimeError("SUMO (traci) is not installed.")
        self.sumocfg_path = sumocfg_path
        self.config = config
        self.n_agents = config.get("n_intersections", 1)
        
    def reset(self):
        traci.start(["sumo", "-c", self.sumocfg_path, "--no-step-log", "true"])
        # In a full implementation, you'd extract real state from traci here
        state = np.zeros(self.config.get("state_dim", 20))
        obs = np.zeros((self.n_agents, self.config.get("obs_dim", 10)))
        return state, obs
        
    def step(self, actions):
        # Apply actions (change traffic light phases)
        # traci.trafficlight.setPhase("node_id", phase)
        traci.simulationStep()
        
        # Extract new state and calculate reward
        state = np.zeros(self.config.get("state_dim", 20))
        obs = np.zeros((self.n_agents, self.config.get("obs_dim", 10)))
        reward = 0.0
        done = traci.simulation.getMinExpectedNumber() <= 0
        
        return reward, state, obs, done

    def close(self):
        traci.close()


def create_env(config, force_fallback=False):
    if not SUMO_AVAILABLE or force_fallback:
        print("[Env] Using Fallback Simulator (SUMO unavailable or forced fallback).")
        return FallbackSimulator(config)
    else:
        print("[Env] Using Real SUMO Simulator.")
        return SUMOEnvironment(config.get("sumocfg_path", "default.sumocfg"), config)
