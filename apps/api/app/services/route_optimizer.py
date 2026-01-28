"""
Route Optimization Service for BookACleaner.ai
Optimizes cleaner job routes using TSP algorithms
"""
import os
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import logging
import math

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Google Maps API key for distance matrix
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points in kilometers"""
    R = 6371  # Earth's radius in kilometers
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_lat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


class RouteOptimizer:
    """Optimizes job routes for cleaners using TSP algorithms"""
    
    def __init__(self):
        self.api_key = GOOGLE_MAPS_API_KEY
        # Average driving speed in km/h for estimation
        self.avg_speed_kmh = 40
    
    def calculate_distance_matrix(self, locations: List[Dict]) -> List[List[float]]:
        """Calculate distance matrix between all locations"""
        n = len(locations)
        matrix = [[0.0] * n for _ in range(n)]
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    lat1 = locations[i].get("lat", 0)
                    lon1 = locations[i].get("lng", 0)
                    lat2 = locations[j].get("lat", 0)
                    lon2 = locations[j].get("lng", 0)
                    matrix[i][j] = haversine_distance(lat1, lon1, lat2, lon2)
        
        return matrix
    
    def estimate_travel_time(self, distance_km: float) -> int:
        """Estimate travel time in minutes"""
        hours = distance_km / self.avg_speed_kmh
        return int(hours * 60)
    
    def solve_tsp_nearest_neighbor(
        self,
        distance_matrix: List[List[float]],
        start_index: int = 0
    ) -> Tuple[List[int], float]:
        """
        Solve TSP using nearest neighbor heuristic
        Returns: (ordered indices, total distance)
        """
        n = len(distance_matrix)
        if n == 0:
            return [], 0.0
        
        visited = [False] * n
        route = [start_index]
        visited[start_index] = True
        total_distance = 0.0
        current = start_index
        
        for _ in range(n - 1):
            nearest = -1
            nearest_dist = float('inf')
            
            for j in range(n):
                if not visited[j] and distance_matrix[current][j] < nearest_dist:
                    nearest = j
                    nearest_dist = distance_matrix[current][j]
            
            if nearest != -1:
                visited[nearest] = True
                route.append(nearest)
                total_distance += nearest_dist
                current = nearest
        
        return route, total_distance
    
    def solve_tsp_2opt(
        self,
        distance_matrix: List[List[float]],
        initial_route: List[int],
        max_iterations: int = 100
    ) -> Tuple[List[int], float]:
        """
        Improve route using 2-opt local search
        Returns: (optimized route, total distance)
        """
        def route_distance(route: List[int]) -> float:
            total = 0.0
            for i in range(len(route) - 1):
                total += distance_matrix[route[i]][route[i + 1]]
            return total
        
        best_route = initial_route.copy()
        best_distance = route_distance(best_route)
        improved = True
        iterations = 0
        
        while improved and iterations < max_iterations:
            improved = False
            iterations += 1
            
            for i in range(1, len(best_route) - 1):
                for j in range(i + 1, len(best_route)):
                    # Reverse segment between i and j
                    new_route = (
                        best_route[:i] +
                        best_route[i:j+1][::-1] +
                        best_route[j+1:]
                    )
                    new_distance = route_distance(new_route)
                    
                    if new_distance < best_distance:
                        best_route = new_route
                        best_distance = new_distance
                        improved = True
        
        return best_route, best_distance
    
    async def optimize_jobs(
        self,
        jobs: List[Dict],
        start_location: Optional[Dict] = None
    ) -> Dict:
        """
        Optimize the order of jobs for minimal travel
        
        Args:
            jobs: List of jobs with property location data
            start_location: Optional starting location (cleaner's home)
        
        Returns: Optimized job order with travel times
        """
        if not jobs:
            return {"optimized_jobs": [], "total_distance": 0, "total_travel_time": 0}
        
        # Build locations list
        locations = []
        if start_location:
            locations.append({
                "id": "start",
                "lat": start_location.get("lat", 34.0522),  # Default LA
                "lng": start_location.get("lng", -118.2437),
                "name": "Starting Location"
            })
        
        for job in jobs:
            prop = job.get("property", {})
            locations.append({
                "id": job.get("id"),
                "lat": prop.get("lat", 34.0522),
                "lng": prop.get("lng", -118.2437),
                "name": prop.get("address", "Unknown"),
                "job": job
            })
        
        # Calculate distance matrix
        distance_matrix = self.calculate_distance_matrix(locations)
        
        # Solve TSP with 2-opt improvement
        start_idx = 0 if start_location else 0
        initial_route, _ = self.solve_tsp_nearest_neighbor(distance_matrix, start_idx)
        optimized_route, total_distance = self.solve_tsp_2opt(distance_matrix, initial_route)
        
        # Build result
        optimized_jobs = []
        travel_segments = []
        
        for i, idx in enumerate(optimized_route):
            loc = locations[idx]
            if loc["id"] == "start":
                continue
            
            segment = {
                "order": len(optimized_jobs) + 1,
                "job": loc.get("job"),
                "location": loc["name"],
            }
            
            # Add travel time from previous location
            if i > 0:
                prev_idx = optimized_route[i - 1]
                dist = distance_matrix[prev_idx][idx]
                travel_time = self.estimate_travel_time(dist)
                segment["travel_from_previous"] = {
                    "distance_km": round(dist, 2),
                    "estimated_minutes": travel_time
                }
                travel_segments.append({
                    "from": locations[prev_idx]["name"],
                    "to": loc["name"],
                    "distance_km": round(dist, 2),
                    "minutes": travel_time
                })
            
            optimized_jobs.append(segment)
        
        total_travel_minutes = sum(s["minutes"] for s in travel_segments) if travel_segments else 0
        
        return {
            "optimized_jobs": optimized_jobs,
            "total_distance_km": round(total_distance, 2),
            "total_travel_minutes": total_travel_minutes,
            "travel_segments": travel_segments,
            "optimization_method": "2-opt TSP"
        }
    
    async def find_schedule_gaps(
        self,
        jobs: List[Dict],
        working_hours: Tuple[int, int] = (8, 18)  # 8am to 6pm
    ) -> List[Dict]:
        """Find gaps in cleaner's schedule that could fit additional jobs"""
        gaps = []
        
        # Sort jobs by scheduled time
        sorted_jobs = sorted(jobs, key=lambda j: j.get("scheduled_date", ""))
        
        for i in range(len(sorted_jobs) - 1):
            current = sorted_jobs[i]
            next_job = sorted_jobs[i + 1]
            
            current_end = datetime.fromisoformat(
                current.get("scheduled_date", "").replace("Z", "+00:00")
            )
            current_hours = current.get("estimated_hours", 2)
            current_end += timedelta(hours=current_hours)
            
            next_start = datetime.fromisoformat(
                next_job.get("scheduled_date", "").replace("Z", "+00:00")
            )
            
            gap_hours = (next_start - current_end).total_seconds() / 3600
            
            if gap_hours >= 2:  # At least 2 hours gap
                gaps.append({
                    "start": current_end.isoformat(),
                    "end": next_start.isoformat(),
                    "hours_available": round(gap_hours, 1),
                    "after_job": current.get("id"),
                    "before_job": next_job.get("id"),
                    "can_fit": "standard" if gap_hours >= 2 else "quick"
                })
        
        return gaps


# Singleton instance
route_optimizer = RouteOptimizer()
