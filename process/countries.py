import csv
import json
import os

# Config
input_csv = "./data/countries.csv"
output_json = "../prisma/data/countries.json"

processed_countries = []

if not os.path.exists(input_csv):
    print(f"Error: File not found {input_csv}")
    exit()

with open(input_csv, "r", encoding="utf-8") as f:
    reader = csv.reader(f)
    for row in reader:
        if len(row) < 2:
            continue

        name = row[0]
        code = row[1]

        if not code or code == "\\N":
            continue

        processed_countries.append({"name": name, "code": code})

os.makedirs(os.path.dirname(output_json), exist_ok=True)
with open(output_json, "w", encoding="utf-8") as f:
    json.dump(processed_countries, f, indent=2)

print(f"Processed {len(processed_countries)} countries.")
print(f"Saved to: {output_json}")
