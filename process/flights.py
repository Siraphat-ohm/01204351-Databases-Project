import csv
import json
import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple

OUTPUT_DIR = Path("../prisma/data")
ROUTES_FILE = Path("routes.dat")  # Your OpenFlights file


def load_openflights_routes(
    filepath: Path, target_route_count: int = 40
) -> List[Tuple[str, str, int, int]]:
    """
    Parses OpenFlights routes.dat, picks a random sample of routes,
    and estimates the distance and duration.
    """
    print(f"📖 Reading OpenFlights data from {filepath}...")

    unique_route_pairs = set()

    try:
        with filepath.open("r", encoding="utf-8") as f:
            reader = csv.reader(f)
            for row in reader:
                # OpenFlights format: Airline, ID, Source, ID, Dest, ID, Codeshare, Stops, Equip
                if len(row) >= 6:
                    origin = row[2]
                    dest = row[4]
                    # Skip invalid data ('\N' is OpenFlights' null value)
                    if origin != "\\N" and dest != "\\N":
                        unique_route_pairs.add((origin, dest))
    except FileNotFoundError:
        print(f"❌ Could not find {filepath}. Please ensure the file exists.")
        return []

    print(f"✅ Found {len(unique_route_pairs):,} unique routes in dataset.")

    # Pick a random sample to keep DB size manageable
    routes_list = list(unique_route_pairs)
    if len(routes_list) > target_route_count:
        sampled_routes = random.sample(routes_list, target_route_count)
    else:
        sampled_routes = routes_list

    final_routes = []
    for origin, dest in sampled_routes:
        # Since OpenFlights routes.dat doesn't include distance/time, we simulate it.
        # Random duration between 1 hour (60 mins) and 14 hours (840 mins)
        duration_mins = random.randint(60, 840)

        # Estimate distance: Commercial jets fly roughly 800 km/h (13.3 km/min)
        distance_km = int(duration_mins * 13.3)

        final_routes.append((origin, dest, distance_km, duration_mins))

    return final_routes


def generate_flight_code(airline_code: str = "YOK", flight_number: int = 1) -> str:
    return f"{airline_code}{flight_number:05d}"


def calculate_arrival_time(departure_time: datetime, duration_mins: int) -> datetime:
    return departure_time + timedelta(minutes=duration_mins)


def calculate_base_price(distance_km: int) -> float:
    base = (distance_km * 0.15) + 50
    variation = random.uniform(0.85, 1.15)
    return round(base * variation, 2)


def generate_flights_for_route(
    route_id: int,
    origin: str,
    dest: str,
    distance_km: int,
    duration_mins: int,
    start_flight_number: int,
    days_range: int = 180,
    flights_per_day: int = 3,
) -> Tuple[List[Dict], int]:

    flights = []
    current_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    current_flight_number = start_flight_number

    for day in range(days_range):
        flight_date = current_date + timedelta(days=day)

        for flight_of_day in range(flights_per_day):
            if flight_of_day == 0:
                hour = random.randint(6, 10)
            elif flight_of_day == 1:
                hour = random.randint(12, 16)
            else:
                hour = random.randint(18, 23)

            minute = random.choice([0, 15, 30, 45])
            departure_time = flight_date.replace(hour=hour, minute=minute)
            arrival_time = calculate_arrival_time(departure_time, duration_mins)

            now = datetime.now()
            if departure_time < now - timedelta(hours=2):
                status = "ARRIVED"
            elif departure_time < now:
                status = "DEPARTED"
            elif departure_time < now + timedelta(hours=2):
                status = "BOARDING"
            else:
                status = random.choice(
                    ["SCHEDULED"] * 95 + ["DELAYED"] * 3 + ["CANCELLED"] * 2
                )

            gate = f"{random.choice(['A', 'B', 'C', 'D', 'E'])}{random.randint(1, 40)}"

            flights.append(
                {
                    "flightCode": generate_flight_code("YOK", current_flight_number),
                    "routeId": route_id,
                    "origin": origin,
                    "dest": dest,
                    "departureTime": departure_time.isoformat() + "Z",
                    "arrivalTime": arrival_time.isoformat() + "Z",
                    "status": status,
                    "gate": gate,
                    "basePrice": calculate_base_price(distance_km),
                }
            )
            current_flight_number += 1

    return flights, current_flight_number


def run_generator():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print("--- Yok Airlines x OpenFlights Generator ---")

    # Target 40 routes * 180 days * 3 flights/day = 21,600 flights
    all_routes = load_openflights_routes(ROUTES_FILE, target_route_count=40)

    if not all_routes:
        return

    all_flights = []
    current_flight_number = 10000

    print(f"\n🛫 Generating flights for {len(all_routes)} selected routes...")
    for origin, dest, distance, duration in all_routes:
        route_flights, next_flight_number = generate_flights_for_route(
            route_id=0,
            origin=origin,
            dest=dest,
            distance_km=distance,
            duration_mins=duration,
            start_flight_number=current_flight_number,
            days_range=180,
            flights_per_day=3,
        )
        all_flights.extend(route_flights)
        current_flight_number = next_flight_number
        print(f"  Generated {len(route_flights)} flights for {origin} ⇄ {dest}")

    output_path = OUTPUT_DIR / "flights.json"
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(all_flights, f, indent=2, ensure_ascii=False)

    print(f"\n💾 Saved {len(all_flights):,} flights to {output_path}")


if __name__ == "__main__":
    run_generator()
