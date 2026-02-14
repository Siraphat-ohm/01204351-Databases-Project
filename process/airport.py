import csv
import json
import os

# 1. Define input and output filenames
input_csv = './data/airports.csv' # Ensure you save your raw data here
output_json = 'prisma/data/airports.json' # We will put this in a prisma/data folder

# Ensure directory exists
os.makedirs(os.path.dirname(output_json), exist_ok=True)

cleaned_data = []

# 2. Open and parse the CSV
# The csv module handles the quotes "Goroka Airport" automatically
try:
    with open(input_csv, mode='r', encoding='utf-8') as f:
        reader = csv.reader(f)
        
        for row in reader:
            # According to your snippet:
            # Index 1: Name ("Goroka Airport")
            # Index 2: City ("Goroka")
            # Index 3: Country ("Papua New Guinea")
            # Index 4: IATA ("GKA")
            
            # Safety check: ensure row has enough columns
            if len(row) < 5:
                continue

            name = row[1]
            city = row[2]
            country = row[3]
            iata_code = row[4]

            # 3. Filter invalid data
            # In datasets like OpenFlights, missing IATA is often "\N" or empty
            # Your schema requires iataCode to be Unique, so we skip bad ones
            if not iata_code or iata_code == "\\N" or len(iata_code) != 3:
                continue

            cleaned_data.append({
                "name": name,
                "city": city,
                "country": country,
                "iataCode": iata_code
            })

    # 4. Save to JSON
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(cleaned_data, f, indent=2)

    print(f"Successfully converted {len(cleaned_data)} airports to {output_json}")

except FileNotFoundError:
    print(f"Error: Could not find {input_csv}. Please create it first.")