import csv
import json
import os
import random

input_csv = "data/planes.csv"
output_dir = "../prisma/data"
output_json = os.path.join(output_dir, "planes.json")


os.makedirs(output_dir, exist_ok=True)

AIRCRAFT_SPECS = {
    # Airbus Narrow-body
    "319": (124, 8),  # A319
    "320": (150, 12),  # A320
    "321": (185, 16),  # A321
    "32N": (160, 12),  # A320neo
    "32Q": (195, 16),  # A321neo
    # Airbus Wide-body
    "330": (250, 30),  # A330-200/300
    "332": (210, 30),
    "333": (260, 36),
    "340": (230, 40),  # A340
    "350": (280, 44),  # A350-900
    "359": (280, 44),
    "351": (310, 48),  # A350-1000
    "380": (400, 70),  # A380 (Super Jumbo)
    "388": (400, 70),
    # Boeing Narrow-body
    "737": (130, 8),
    "738": (162, 12),  # B737-800
    "739": (180, 16),  # B737-900
    "7M8": (162, 12),  # B737 MAX 8
    # Boeing Wide-body
    "744": (350, 50),  # B747-400
    "747": (350, 50),
    "763": (200, 30),  # B767-300
    "772": (240, 40),  # B777-200
    "773": (300, 50),  # B777-300ER
    "77W": (300, 50),
    "788": (210, 24),  # B787-8 Dreamliner
    "789": (250, 30),  # B787-9
    # Regional / ATR
    "AT4": (48, 0),  # ATR 42
    "AT7": (70, 0),  # ATR 72
    "ATR": (70, 0),
}

cleaned_data = []

try:
    with open(input_csv, mode="r", encoding="utf-8") as f:
        reader = csv.reader(f)

        for row in reader:
            if len(row) < 3:
                continue

            model_name = row[0]
            iata_code = row[1]
            icao_code = row[2]

            # เลือก Code หลัก
            code = iata_code if iata_code != "\\N" else icao_code
            if not code or code == "\\N":
                continue

            # 🔍 ตรวจสอบว่ามีสเปคไหม?
            if code in AIRCRAFT_SPECS:
                eco_seats, biz_seats = AIRCRAFT_SPECS[code]
                source = "Real Data"
            else:
                # ถ้าไม่เจอข้อมูล ให้สุ่มแบบมีหลักการ
                # เดาจากชื่อรุ่น ถ้ามีคำว่า "Boeing" หรือ "Airbus" ให้เป็นลำใหญ่หน่อย
                if "Boeing" in model_name or "Airbus" in model_name:
                    eco_seats = random.randint(150, 300)
                    biz_seats = random.randint(12, 40)
                else:
                    # เครื่องบินเล็ก (Regional)
                    eco_seats = random.randint(50, 100)
                    biz_seats = 0
                source = "Random"

            cleaned_data.append(
                {
                    "model": model_name,
                    "code": code,
                    "capacityEco": eco_seats,
                    "capacityBiz": biz_seats,
                }
            )

    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(cleaned_data, f, indent=2)

    print(f"Processed {len(cleaned_data)} aircraft models.")
    print(f"Data saved to: {output_json}")

except FileNotFoundError:
    print(f"Error: Could not find '{input_csv}'")
