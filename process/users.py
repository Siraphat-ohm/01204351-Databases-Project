import json
import os
import random

import bcrypt
from faker import Faker

fake = Faker()
OUTPUT_DIR = "../prisma/data"
BCRYPT_ROUNDS = 10


def hash_password(plaintext):
    bytes_pw = plaintext.encode("utf-8")
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    return bcrypt.hashpw(bytes_pw, salt).decode("utf-8")


def generate_user(role, prefix="user"):
    first_name = fake.first_name()
    last_name = fake.last_name()
    plaintext = f"{role.lower()}{fake.password(length=4, special_chars=False, digits=True, upper_case=False)}"

    return {
        "username": f"{prefix}_{first_name.lower()}",
        "email": f"{first_name.lower()}.{last_name.lower()}@yokairlines.com"
        if role != "PASSENGER"
        else fake.email(),
        "passwordHash": hash_password(plaintext),
        "passwordPlaintext": plaintext,
        "role": role,
        "firstName": first_name,
        "lastName": last_name,
        "phone": fake.phone_number(),
    }


def run_generator():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    print("🚀 Generating Admins...")
    admins = [generate_user("ADMIN", "adm") for _ in range(5)]

    print("🚀 Generating Pilots...")
    pilots = []
    for i in range(10):
        user = generate_user("PILOT", "capt")
        # เพิ่มข้อมูลสำหรับ StaffProfile
        user["staffProfile"] = {
            "employeeId": f"YOK-P{100 + i:03d}",
            "rank": "CAPTAIN" if i < 7 else "FIRST_OFFICER",
            "licenseNumber": f"ATPL-{fake.bothify(text='####')}",
            "flightHours": random.randint(1500, 8000),
        }
        pilots.append(user)

    print("🚀 Generating Cabin Crew...")
    crews = []
    for i in range(10):
        user = generate_user("CABIN_CREW", "crew")
        user["staffProfile"] = {
            "employeeId": f"YOK-C{200 + i:03d}",
            "rank": "PURSER" if i < 2 else "CREW",
            "skills": ["First Aid", "English", "Service"],
        }
        crews.append(user)

    print("🚀 Generating Passengers...")
    passengers = [generate_user("PASSENGER", "psg") for _ in range(20)]

    data_map = {
        "admins.json": admins,
        "pilots.json": pilots,
        "crews.json": crews,
        "passengers.json": passengers,
    }

    for filename, data in data_map.items():
        path = os.path.join(OUTPUT_DIR, filename)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"💾 Saved {len(data)} items to {path}")


if __name__ == "__main__":
    print("--- Yok Airlines User Generator ---")
    run_generator()
    print("\n✨ All roles generated successfully!")
