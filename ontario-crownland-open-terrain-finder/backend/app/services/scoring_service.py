import yaml
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class ScoringEngine:
    def __init__(self, config_path: str):
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
            
        self.params = self.config.get("scoring_parameters", {})
        self.weights = self.params.get("weights", {})
        self.thresholds = self.params.get("thresholds", {})
        
    def calculate_open_land_score(self, area_m2: float, dist_to_road_m: float, dist_to_trail_m: float) -> float:
        """
        Calculate open land score using distance penalty logic.
        Higher is better (more open / less conflict).
        """
        base_score = 100.0
        
        # Penalties based on config weights. 
        # Using linear distance proxies for simplicity.
        w_road = self.weights.get("open_land", {}).get("road_distance", -0.2)
        w_trail = self.weights.get("open_land", {}).get("trail_distance", -0.2)
        
        # Example: penalty applies if under 1000m, decays linearly
        road_penalty = max(0, 1000 - dist_to_road_m) * abs(w_road) / 10
        trail_penalty = max(0, 1000 - dist_to_trail_m) * abs(w_trail) / 10
        
        score = base_score - road_penalty - trail_penalty
        return max(0.0, score)

    def classify(self, open_land_score: float, terrain_enclosure_score: float, overlaps_exclusion: bool = False) -> str:
        """
        Rules:
        Exclude hard-protected overlaps.
        Borderline results -> Candidate for manual review.
        """
        if overlaps_exclusion:
            return "Excluded"
            
        t_high = self.thresholds.get("higher_open_terrain", {})
        t_cand = self.thresholds.get("candidate", {})
        
        if (open_land_score >= t_high.get("open_land_score", 75) and
            terrain_enclosure_score >= t_high.get("terrain_enclosure_score", 65)):
            return "Higher open-terrain candidate"
            
        if (open_land_score >= t_cand.get("open_land_score", 40) and 
            terrain_enclosure_score >= t_cand.get("terrain_enclosure_score", 30)):
            return "Candidate for manual review"
            
        # Below candidate threshold -> Excluded
        return "Excluded"
