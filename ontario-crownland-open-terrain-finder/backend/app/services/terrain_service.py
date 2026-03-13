import numpy as np

class TerrainAnalyzer:
    """
    Generic terrain analysis functions operating on 2D numpy arrays.
    """
    
    @staticmethod
    def calculate_local_relief(dem_array: np.ndarray) -> float:
        """
        Returns the local relief (max - min) in the provided DEM window.
        """
        if dem_array.size == 0: return 0.0
        return float(np.max(dem_array) - np.min(dem_array))

    @staticmethod
    def calculate_slope(dem_array: np.ndarray, cell_size_m: float) -> np.ndarray:
        """
        Calculates slope array given a DEM and cell size.
        Returns array of same shape with slope in degrees.
        """
        if dem_array.size == 0 or dem_array.shape[0] < 3 or dem_array.shape[1] < 3:
            return np.zeros_like(dem_array)
            
        dzdx = np.gradient(dem_array, cell_size_m, axis=1)
        dzdy = np.gradient(dem_array, cell_size_m, axis=0)
        
        slope_rad = np.arctan(np.sqrt(dzdx**2 + dzdy**2))
        return np.degrees(slope_rad)

    @staticmethod
    def calculate_rising_terrain_fraction(dem_array: np.ndarray, current_z: float, elevation_threshold: float = 2.0) -> float:
        """
        Fraction of the area that is locally higher than current_z + threshold.
        Acts as an enclosure/backstop proxy.
        """
        if dem_array.size == 0: return 0.0
        rising_cells = np.sum(dem_array > (current_z + elevation_threshold))
        return float(rising_cells / dem_array.size)

    @staticmethod
    def calculate_concavity(dem_array: np.ndarray) -> float:
        """
        Simple proxy for concavity based on deviation from mean.
        Negative implies convex (hill), positive implies concave (bowl/valley).
        """
        if dem_array.size == 0: return 0.0
        center_val = dem_array[dem_array.shape[0]//2, dem_array.shape[1]//2]
        mean_val = np.mean(dem_array)
        return float(mean_val - center_val)
        
    @staticmethod
    def terrain_enclosure_score(local_relief: float, rising_fraction: float, concavity: float) -> float:
        """
        Calculate generic enclosure score combining relief, rising terrain and concavity.
        """
        # Base scoring off some heuristic weights (can be aligned with scoring.yaml in upper layers)
        # This function isolates the math.
        # High relief + high rising fraction + high concavity (bowl) = good enclosure
        base = max(0.0, local_relief) * 0.5
        rise = rising_fraction * 100 * 0.3
        concave = max(0.0, concavity) * 2.0
        
        score = base + rise + concave
        return min(100.0, score)
