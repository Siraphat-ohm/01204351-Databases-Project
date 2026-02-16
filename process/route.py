import csv
import json
import os
from math import asin, cos, radians, sin, sqrt

INPUT_AIRPORTS_CSV = "./data/airports.csv"
INPUT_ROUTES_CSV = "./data/routes.csv"
OUTPUT_JSON = "../prisma/data/routes.json"


def haversine(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points
    on the earth (specified in decimal degrees)
    """
    # Convert decimal degrees to radians
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])

    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * asin(sqrt(a))
    r = 6371  # Radius of earth in kilometers.
    return int(c * r)


def estimate_duration(km):
    """
    Estimate flight duration in minutes based on distance.
    Avg speed ~800 km/h + 30 mins for taxi/takeoff/landing.
    """
    speed_km_per_min = 800 / 60
    flight_time = km / speed_km_per_min
    return int(flight_time + 30)


# ---------------------------------------------------------
# MAIN PROCESS
# ---------------------------------------------------------
def main():
    # 1. Load Airport Coordinates (IATA -> {lat, lon})
    airports_map = {}

    if not os.path.exists(INPUT_AIRPORTS_CSV):
        print(f"❌ Error: File not found: {INPUT_AIRPORTS_CSV}")
        return

    print("Loading airport coordinates...")
    with open(INPUT_AIRPORTS_CSV, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            # CSV Format from OurAirports:
            # Index 4: IATA Code ("GKA")
            # Index 6: Latitude
            # Index 7: Longitude
            if len(row) < 8:
                continue

            iata = row[4].replace('"', "")  # Remove quotes
            try:
                lat = float(row[6])
                lon = float(row[7])
                airports_map[iata] = {"lat": lat, "lon": lon}
            except ValueError:
                continue

    print(f"✅ Loaded {len(airports_map)} airports.")

    # 2. Process Routes
    processed_routes = []
    seen_routes = set()  # To prevent duplicates like A->B appearing twice

    if not os.path.exists(INPUT_ROUTES_CSV):
        print(f"❌ Error: File not found: {INPUT_ROUTES_CSV}")
        return

    print("Processing routes...")
    with open(INPUT_ROUTES_CSV, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            # CSV Format from OpenFlights:
            # Index 2: Source Airport (IATA)
            # Index 4: Destination Airport (IATA)
            if len(row) < 5:
                continue

            source = row[2]
            dest = row[4]

            # Skip if we don't have coordinates for either airport
            if source not in airports_map or dest not in airports_map:
                continue

            # Check for duplicates
            route_key = f"{source}-{dest}"
            if route_key in seen_routes:
                continue
            seen_routes.add(route_key)

            # Calculate Distance & Duration
            coord1 = airports_map[source]
            coord2 = airports_map[dest]

            distance_km = haversine(
                coord1["lat"], coord1["lon"], coord2["lat"], coord2["lon"]
            )
            duration_mins = estimate_duration(distance_km)

            processed_routes.append(
                {
                    "origin": source,
                    "dest": dest,
                    "distance": distance_km,
                    "duration": duration_mins,
                }
            )

    # 3. Export to JSON
    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(processed_routes, f, indent=2)

    print(f"Successfully processed {len(processed_routes)} routes.")
    print(f"Output saved to: {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
