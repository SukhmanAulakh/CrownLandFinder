import unittest
import requests
import json
import os

# Base URL for the backend inside the container
BASE_URL = "http://localhost:8000"

class TestAPIRoutes(unittest.TestCase):
    def test_health_check(self):
        response = requests.get(f"{BASE_URL}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "healthy")

    def test_layers_candidates(self):
        response = requests.get(f"{BASE_URL}/api/layers/candidates")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["type"], "FeatureCollection")
        self.assertIn("features", data)

    def test_layers_base(self):
        # Test fetching CLUPA polygons
        response = requests.get(f"{BASE_URL}/api/layers/base_layers/clupa_polygons")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["type"], "FeatureCollection")

    def test_search_bbox_valid(self):
        # Wide bounding box that should return our test data
        # Note: In a real test we'd use actual coordinates, 
        # but since we used mock coordinates like 10000, 10000 in 3161, 
        # we just test that the API handles the query param correctly.
        response = requests.get(f"{BASE_URL}/api/search/bbox?bbox=-96.0,41.0,-74.0,57.0")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["type"], "FeatureCollection")

    def test_search_bbox_invalid(self):
        # Invalid bbox format
        response = requests.get(f"{BASE_URL}/api/search/bbox?bbox=invalid")
        self.assertEqual(response.status_code, 400)

if __name__ == "__main__":
    unittest.main()
