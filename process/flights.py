import json
import os
import random
from datetime import datetime, timedelta
from typing import Dict, List

OUTPUT_DIR = "../prisma/data"


def generate_flight_code(airline_code: str = "YOK", flight_number: int = 1) -> str:
    """Generate flight code like YOK101, YOK102, etc."""
    return f"{airline_code}{flight_number:03d}"


def calculate_arrival_time(departure_time: datetime, duration_mins: int) -> datetime:
    """Calculate arrival time based on departure and duration."""
    return departure_time + timedelta(minutes=duration_mins)


def calculate_base_price(distance_km: int, class_multiplier: float = 1.0) -> float:
    """
    Calculate base price based on distance.
    Formula: Base price = (distance * 0.15) + 50
    Short haul (< 1000km): ~$200-300
    Medium haul (1000-3000km): ~$300-500
    Long haul (> 3000km): ~$500-1000+
    """
    base = (distance_km * 0.15) + 50
    # Add some randomness (±15%)
    variation = random.uniform(0.85, 1.15)
    return round(base * variation * class_multiplier, 2)


def generate_flights_for_route(
    route_id: int,
    origin: str,
    dest: str,
    distance_km: int,
    duration_mins: int,
    start_flight_number: int,
    days_range: int = 90,
    flights_per_day: int = 2,
) -> List[Dict]:
    """Generate multiple flights for a given route."""
    flights = []
    current_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    # Generate flights for the next X days
    for day in range(days_range):
        flight_date = current_date + timedelta(days=day)

        # Generate multiple flights per day
        for flight_of_day in range(flights_per_day):
            flight_number = (
                start_flight_number + (day * flights_per_day) + flight_of_day
            )

            # Varied departure times throughout the day
            if flight_of_day == 0:
                # Morning flight (6 AM - 10 AM)
                hour = random.randint(6, 10)
            else:
                # Afternoon/Evening flight (2 PM - 8 PM)
                hour = random.randint(14, 20)

            minute = random.choice([0, 15, 30, 45])

            departure_time = flight_date.replace(hour=hour, minute=minute)
            arrival_time = calculate_arrival_time(departure_time, duration_mins)

            # Determine status based on departure time
            now = datetime.now()
            if departure_time < now - timedelta(hours=2):
                # Flight has already arrived
                status = "ARRIVED"
            elif departure_time < now:
                # Flight has departed but not arrived yet
                status = "DEPARTED"
            elif departure_time < now + timedelta(hours=2):
                # Flight is boarding
                status = "BOARDING"
            else:
                # Future flight
                status = random.choice(
                    ["SCHEDULED"] * 95 + ["DELAYED"] * 3 + ["CANCELLED"] * 2
                )

            # Generate gate (A1-A20, B1-B20, C1-C20)
            terminal = random.choice(["A", "B", "C"])
            gate_num = random.randint(1, 20)
            gate = f"{terminal}{gate_num}"

            # Calculate base price (economy class)
            base_price = calculate_base_price(distance_km)

            flights.append(
                {
                    "flightCode": generate_flight_code("YOK", flight_number),
                    "routeId": route_id,
                    "origin": origin,  # For reference only, not in DB
                    "dest": dest,  # For reference only, not in DB
                    "departureTime": departure_time.isoformat(),
                    "arrivalTime": arrival_time.isoformat(),
                    "status": status,
                    "gate": gate,
                    "basePrice": base_price,
                }
            )

    return flights


def generate_all_flights():
    """Generate flights for predefined popular routes."""

    print("🛫 Generating Flights...")

    # Popular routes (you should adjust these based on your actual routes)
    # Format: (origin, dest, distance_km, duration_mins)
    popular_routes = [
        # Domestic Thailand
        ("BKK", "CNX", 600, 75),  # Bangkok to Chiang Mai
        ("BKK", "HKT", 680, 85),  # Bangkok to Phuket
        ("BKK", "HDY", 450, 60),  # Bangkok to Hat Yai
        ("BKK", "KBV", 650, 80),  # Bangkok to Krabi
        ("BKK", "USM", 760, 95),  # Bangkok to Koh Samui
        # Regional Asia
        ("BKK", "SIN", 1430, 150),  # Bangkok to Singapore
        ("BKK", "KUL", 1180, 130),  # Bangkok to Kuala Lumpur
        ("BKK", "HKG", 1700, 165),  # Bangkok to Hong Kong
        ("BKK", "TPE", 2300, 210),  # Bangkok to Taipei
        ("BKK", "ICN", 3590, 340),  # Bangkok to Seoul
        ("BKK", "NRT", 4600, 380),  # Bangkok to Tokyo
        # Long Haul
        ("BKK", "SYD", 7520, 560),  # Bangkok to Sydney
        ("BKK", "LHR", 9560, 720),  # Bangkok to London
        ("BKK", "CDG", 9450, 710),  # Bangkok to Paris
    ]

    all_flights = []
    flight_number = 100  # Starting flight number

    for origin, dest, distance, duration in popular_routes:
        # Generate 2 flights per day for 90 days = 180 flights per route
        route_flights = generate_flights_for_route(
            route_id=0,  # Will be set by seed script
            origin=origin,
            dest=dest,
            distance_km=distance,
            duration_mins=duration,
            start_flight_number=flight_number,
            days_range=90,
            flights_per_day=2,
        )
        all_flights.extend(route_flights)
        flight_number += len(route_flights)
        print(f"   Generated {len(route_flights)} flights for {origin} → {dest}")

    return all_flights


def run_generator():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    print("--- Yok Airlines Flight Generator ---")
    flights = generate_all_flights()

    # Save to JSON
    output_path = os.path.join(OUTPUT_DIR, "flights.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(flights, f, indent=2, ensure_ascii=False)

    print(f"\n💾 Saved {len(flights)} flights to {output_path}")
    print(f"📊 Flight Statistics:")

    # Statistics
    statuses = {}
    for flight in flights:
        status = flight["status"]
        statuses[status] = statuses.get(status, 0) + 1

    for status, count in sorted(statuses.items()):
        print(f"   {status}: {count}")

    print("\n✨ Flight generation completed!")


if __name__ == "__main__":
    run_generator()
