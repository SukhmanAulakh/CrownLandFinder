import unittest
import os
import yaml
from pathlib import Path
import sys

# Ensure app is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.scoring_service import ScoringEngine

class TestScoringEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create a temporary config for testing
        cls.config_path = "test_scoring_params.yaml"
        cls.config_data = {
            "scoring_parameters": {
                "weights": {
                    "open_land": {
                        "road_distance": -0.5,
                        "trail_distance": -0.2
                    }
                },
                "thresholds": {
                    "higher_open_terrain": {
                        "open_land_score": 80,
                        "terrain_enclosure_score": 60
                    },
                    "candidate": {
                        "open_land_score": 50,
                        "terrain_enclosure_score": 30
                    }
                }
            }
        }
        with open(cls.config_path, 'w') as f:
            yaml.dump(cls.config_data, f)
        
        cls.scorer = ScoringEngine(cls.config_path)

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(cls.config_path):
            os.remove(cls.config_path)

    def test_open_land_score_far_away(self):
        # Far from roads and trails should give high score (100)
        score = self.scorer.calculate_open_land_score(10000, 5000, 5000)
        self.assertEqual(score, 100.0)

    def test_open_land_score_near_road(self):
        # Near road should apply penalty
        # 1000 - 100 = 900. 900 * 0.5 / 10 = 45 penalty
        # 100 - 45 = 55
        score = self.scorer.calculate_open_land_score(10000, 100, 5000)
        self.assertAlmostEqual(score, 55.0)

    def test_classify_high_quality(self):
        # High score should be classified as "Higher open-terrain candidate"
        classification = self.scorer.classify(85, 65)
        self.assertEqual(classification, "Higher open-terrain candidate")

    def test_classify_candidate(self):
        # Mid score should be "Candidate for manual review"
        classification = self.scorer.classify(60, 40)
        self.assertEqual(classification, "Candidate for manual review")

    def test_classify_excluded(self):
        # Low score should be "Excluded"
        classification = self.scorer.classify(40, 20)
        self.assertEqual(classification, "Excluded")

    def test_classify_hard_excluded(self):
        # Explicit exclusion overlap
        classification = self.scorer.classify(100, 100, overlaps_exclusion=True)
        self.assertEqual(classification, "Excluded")

if __name__ == "__main__":
    unittest.main()
