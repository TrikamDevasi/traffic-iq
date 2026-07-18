"""
Scenario Builder Module
Generates configuration for the simulator based on requested parameters.
"""

import os
import json

class ScenarioBuilder:
    def __init__(self, base_dir: str = "./sim_configs"):
        self.base_dir = base_dir
        if not os.path.exists(self.base_dir):
            os.makedirs(self.base_dir)

    def build_scenario(self, scenario_name: str, intersections: list, duration: int) -> dict:
        """
        Builds the scenario configuration.
        In a full implementation, this writes .nod.xml, .edg.xml, .netccFG, .rou.xml, and .sumocfg files.
        For now, returns a config dictionary used by the environment wrapper.
        """
        config = {
            "scenario": scenario_name,
            "duration": duration,
            "n_intersections": max(1, len(intersections)),
            "intersections": intersections,
            "obs_dim": 10,
            "state_dim": 20,
            "sumocfg_path": os.path.join(self.base_dir, f"{scenario_name}.sumocfg")
        }
        
        # Write dummy config to disk for record keeping
        config_path = os.path.join(self.base_dir, f"{scenario_name}_config.json")
        with open(config_path, "w") as f:
            json.dump(config, f, indent=4)
            
        return config
