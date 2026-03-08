import json
import random
from pathlib import Path
from typing import Any, Dict, List

import bcrypt
from faker import Faker

fake = Faker()

OUTPUT_DIR = Path("../prisma/data")
BCRYPT_ROUNDS = 10


NUM_PESSENGERS = 200
NUM_PILOTS = 50
NUM_CREW = 100
NUM_ADMINS = 5


def hash_password(plaintext: str) -> str:
    """Hashes a plaintext password using bcrypt."""
    bytes_pw = plaintext.encode("utf-8")
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    return bcrypt.hashpw(bytes_pw, salt).decode("utf-8")


def generate_base_user(role: str, prefix: str = "user") -> Dict[str, Any]:
    """Generates the base Postgres user fields matching the Prisma schema."""
    first_name = fake.first_name()
    last_name = fake.last_name()

    plaintext_pw = f"{role.lower()}{fake.password(length=4, special_chars=False, digits=True, upper_case=False)}"

    domain = (
        "@yokairlines.com" if role != "PASSENGER" else f"@{fake.free_email_domain()}"
    )
    email = f"{first_name.lower()}.{last_name.lower()}{domain}"

    return {
        "username": f"{prefix}_{first_name.lower()}",
        "email": email,
        "passwordHash": hash_password(plaintext_pw),
        "passwordPlaintext": plaintext_pw,
        "role": role,
        "name": f"{first_name} {last_name}",
        "firstName": first_name,
        "lastName": last_name,
        "phone": fake.phone_number(),
    }


def run_generator() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("🚀 Generating Admins...")
    admins = [generate_base_user("ADMIN", "adm") for _ in range(NUM_ADMINS)]

    print("🚀 Generating Pilots...")
    pilots: List[Dict[str, Any]] = []
    for i in range(NUM_PILOTS):
        user = generate_base_user("PILOT", "capt")

        user["staffProfile"] = {
            "employeeId": f"YOK-P{100 + i:03d}",
            "role": "PILOT",
            "rank": "CAPTAIN" if i < 7 else "FIRST_OFFICER",
        }

        user["mongoProfileData"] = {
            "licenseNumber": f"ATPL-{fake.bothify(text='####')}",
            "flightHours": random.randint(1500, 8000),
        }
        pilots.append(user)

    print("🚀 Generating Cabin Crew...")
    crews: List[Dict[str, Any]] = []
    for i in range(NUM_CREW):
        user = generate_base_user("CABIN_CREW", "crew")

        user["staffProfile"] = {
            "employeeId": f"YOK-C{200 + i:03d}",
            "role": "CABIN_CREW",
            "rank": "PURSER" if i < 2 else "CREW",
        }

        user["mongoProfileData"] = {
            "skills": ["First Aid", "English", "Service", "Safety Protocols"],
        }
        crews.append(user)

    print("🚀 Generating Passengers...")
    passengers = [generate_base_user("PASSENGER", "psg") for _ in range(NUM_PESSENGERS)]

    data_map = {
        "admins.json": admins,
        "pilots.json": pilots,
        "crews.json": crews,
        "passengers.json": passengers,
    }

    for filename, data in data_map.items():
        file_path = OUTPUT_DIR / filename
        with file_path.open("w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"  💾 Saved {len(data)} items to {file_path}")


if __name__ == "__main__":
    print("--- Yok Airlines User Generator ---")
    run_generator()
    print("\n✨ All mock data generated successfully!")
