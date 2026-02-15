import json
import os
import random
import string
from datetime import datetime, timedelta
from typing import Dict, List

OUTPUT_DIR = "../prisma/data"


def generate_pnr() -> str:
    """Generate a 6-character PNR (Passenger Name Record) like ABC123."""
    letters = "".join(random.choices(string.ascii_uppercase, k=3))
    numbers = "".join(random.choices(string.digits, k=3))
    return letters + numbers


def generate_seat_number(row: int, seat_letter: str) -> str:
    """Generate seat number like 12A, 25F."""
    return f"{row}{seat_letter}"


def calculate_ticket_price(base_price: float, ticket_class: str) -> float:
    """Calculate ticket price based on class."""
    multipliers = {
        "ECONOMY": 1.0,
        "BUSINESS": 2.5,
        "FIRST_CLASS": 4.0,
    }
    multiplier = multipliers.get(ticket_class, 1.0)
    # Add some variation (±5%)
    variation = random.uniform(0.95, 1.05)
    return round(base_price * multiplier * variation, 2)


def generate_tickets(
    num_passengers: int,
    base_price: float,
    aircraft_capacity_eco: int = 150,
    aircraft_capacity_biz: int = 20,
) -> List[Dict]:
    """Generate tickets for a booking."""
    tickets = []

    # Determine classes for passengers
    # 80% economy, 15% business, 5% first class
    classes = []
    for _ in range(num_passengers):
        rand = random.random()
        if rand < 0.80:
            ticket_class = "ECONOMY"
        elif rand < 0.95:
            ticket_class = "BUSINESS"
        else:
            ticket_class = "FIRST_CLASS"
        classes.append(ticket_class)

    # Seat assignments
    seat_letters = ["A", "B", "C", "D", "E", "F"]
    used_seats = set()

    for i, ticket_class in enumerate(classes):
        # Assign row based on class
        if ticket_class == "FIRST_CLASS":
            row = random.randint(1, 3)
        elif ticket_class == "BUSINESS":
            row = random.randint(4, 8)
        else:
            row = random.randint(9, 30)

        # Find available seat
        seat_number = None
        attempts = 0
        while seat_number is None and attempts < 50:
            letter = random.choice(seat_letters)
            potential_seat = generate_seat_number(row, letter)
            if potential_seat not in used_seats:
                seat_number = potential_seat
                used_seats.add(seat_number)
            attempts += 1

        if seat_number is None:
            seat_number = generate_seat_number(row, random.choice(seat_letters))

        # Generate passenger details
        first_names = [
            "John",
            "Jane",
            "Michael",
            "Sarah",
            "David",
            "Emily",
            "James",
            "Emma",
            "Robert",
            "Olivia",
            "William",
            "Sophia",
            "Daniel",
            "Isabella",
            "Matthew",
            "Mia",
            "Andrew",
            "Charlotte",
        ]
        last_names = [
            "Smith",
            "Johnson",
            "Williams",
            "Brown",
            "Jones",
            "Garcia",
            "Miller",
            "Davis",
            "Rodriguez",
            "Martinez",
            "Wilson",
            "Anderson",
        ]

        first_name = random.choice(first_names)
        last_name = random.choice(last_names)

        # Generate date of birth (ages 5-75)
        age = random.randint(5, 75)
        date_of_birth = datetime.now() - timedelta(days=age * 365)

        # 80% have passport numbers
        passport_number = None
        if random.random() < 0.8:
            passport_number = f"P{random.randint(10000000, 99999999)}"

        gender = random.choice(["M", "F"])

        ticket_price = calculate_ticket_price(base_price, ticket_class)

        tickets.append(
            {
                "firstName": first_name,
                "lastName": last_name,
                "dateOfBirth": date_of_birth.isoformat(),
                "passportNumber": passport_number,
                "gender": gender,
                "seatNumber": seat_number,
                "class": ticket_class,
                "price": ticket_price,
            }
        )

    return tickets


def generate_bookings(
    num_bookings: int = 500,
    flights_file: str = "../prisma/data/flights.json",
) -> List[Dict]:
    """Generate bookings with tickets."""

    # Load flights
    if not os.path.exists(flights_file):
        print(f"❌ Flights file not found: {flights_file}")
        return []

    with open(flights_file, "r", encoding="utf-8") as f:
        flights = json.load(f)

    if not flights:
        print("❌ No flights found")
        return []

    print(f"📋 Loaded {len(flights)} flights")

    bookings = []
    used_pnrs = set()

    for i in range(num_bookings):
        # Select a random flight
        flight = random.choice(flights)

        # Generate unique PNR
        pnr = generate_pnr()
        attempts = 0
        while pnr in used_pnrs and attempts < 100:
            pnr = generate_pnr()
            attempts += 1
        used_pnrs.add(pnr)

        # Determine number of passengers (1-4, weighted towards 1-2)
        rand = random.random()
        if rand < 0.40:
            num_passengers = 1
        elif rand < 0.75:
            num_passengers = 2
        elif rand < 0.90:
            num_passengers = 3
        else:
            num_passengers = 4

        # Generate tickets
        tickets = generate_tickets(num_passengers, flight["basePrice"])

        # Calculate total price
        total_price = sum(t["price"] for t in tickets)

        # Determine booking status
        departure_time = datetime.fromisoformat(
            flight["departureTime"].replace("Z", "+00:00")
        )
        now = datetime.now(departure_time.tzinfo)

        if departure_time < now:
            # Past flight - should be confirmed
            status = "CONFIRMED"
        else:
            # Future flight - 95% confirmed, 5% cancelled
            status = random.choice(["CONFIRMED"] * 95 + ["CANCELLED"] * 5)

        # Contact info
        contact_email = f"passenger{i + 1}@example.com"
        contact_phone = f"+66{random.randint(800000000, 899999999)}"

        # Created at - between 1-60 days before departure
        days_before = random.randint(1, 60)
        created_at = departure_time - timedelta(days=days_before)

        booking = {
            "bookingRef": pnr,
            "flightCode": flight[
                "flightCode"
            ],  # For reference, will be replaced with flightId
            "status": status,
            "totalPrice": total_price,
            "contactEmail": contact_email,
            "contactPhone": contact_phone,
            "createdAt": created_at.isoformat(),
            "tickets": tickets,
        }

        bookings.append(booking)

    return bookings


def run_generator():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    print("--- Yok Airlines Booking Generator ---")
    print("🎫 Generating Bookings with Tickets...")

    bookings = generate_bookings(num_bookings=500)

    if not bookings:
        print("❌ No bookings generated")
        return

    # Save to JSON
    output_path = os.path.join(OUTPUT_DIR, "bookings.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(bookings, f, indent=2, ensure_ascii=False)

    print(f"\n💾 Saved {len(bookings)} bookings to {output_path}")

    # Statistics
    print(f"\n📊 Booking Statistics:")

    total_tickets = sum(len(b["tickets"]) for b in bookings)
    print(f"   Total Tickets: {total_tickets}")

    avg_passengers = total_tickets / len(bookings)
    print(f"   Avg Passengers per Booking: {avg_passengers:.2f}")

    statuses = {}
    for booking in bookings:
        status = booking["status"]
        statuses[status] = statuses.get(status, 0) + 1

    print(f"   Status Breakdown:")
    for status, count in sorted(statuses.items()):
        percentage = (count / len(bookings)) * 100
        print(f"      {status}: {count} ({percentage:.1f}%)")

    # Class distribution
    classes = {}
    for booking in bookings:
        for ticket in booking["tickets"]:
            ticket_class = ticket["class"]
            classes[ticket_class] = classes.get(ticket_class, 0) + 1

    print(f"   Ticket Class Distribution:")
    for ticket_class, count in sorted(classes.items()):
        percentage = (count / total_tickets) * 100
        print(f"      {ticket_class}: {count} ({percentage:.1f}%)")

    # Revenue
    total_revenue = sum(b["totalPrice"] for b in bookings)
    avg_booking_value = total_revenue / len(bookings)
    print(f"   Total Revenue: ${total_revenue:,.2f}")
    print(f"   Avg Booking Value: ${avg_booking_value:.2f}")

    print("\n✨ Booking generation completed!")


if __name__ == "__main__":
    run_generator()
