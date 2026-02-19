import {
  PrismaClient,
  Role,
  Rank,
  AircraftStatus,
  FlightStatus,
  BookingStatus,
  TicketClass,
  TransactionStatus,
  TransactionType,
} from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { faker } from "@faker-js/faker";
import Papa from "papaparse";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────

const OURAIRPORTS_CSV_URL =
  "https://davidmegginson.github.io/ourairports-data/airports.csv";

/**
 * Asian countries to pull from OurAirports.
 * TH is home base — all others are destination markets.
 */
const ASIAN_COUNTRIES = new Set([
  "TH",
  "SG",
  "MY",
  "ID",
  "PH",
  "VN",
  "KH",
  "LA",
  "MM",
  "JP",
  "KR",
  "CN",
  "HK",
  "TW",
  "IN",
  "AE",
  "QA",
]);

const ALLOWED_AIRPORT_TYPES = new Set(["large_airport", "medium_airport"]);

/**
 * YokAirlines route network.
 * Routes are bidirectional — each pair seeds both directions.
 */
const ROUTE_PAIRS: [string, string][] = [
  // ── Thai domestic ──────────────────────────────────────────
  ["BKK", "HKT"],
  ["BKK", "CNX"],
  ["BKK", "DMK"],
  ["BKK", "NST"],
  ["BKK", "CEI"],
  ["BKK", "UTH"],
  ["BKK", "KBV"],
  ["DMK", "HKT"],
  ["DMK", "CNX"],
  ["CNX", "HKT"],
  // ── Bangkok → SE Asia ──────────────────────────────────────
  ["BKK", "SIN"],
  ["BKK", "KUL"],
  ["BKK", "CGK"],
  ["BKK", "MNL"],
  ["BKK", "SGN"],
  ["BKK", "HAN"],
  ["BKK", "PNH"],
  ["BKK", "VTE"],
  ["BKK", "RGN"],
  ["BKK", "DAD"],
  // ── Bangkok → NE Asia ──────────────────────────────────────
  ["BKK", "NRT"],
  ["BKK", "ICN"],
  ["BKK", "PVG"],
  ["BKK", "HKG"],
  ["BKK", "TPE"],
  ["BKK", "CAN"],
  ["BKK", "PEK"],
  // ── Bangkok → South Asia & Middle East hubs ────────────────
  ["BKK", "BOM"],
  ["BKK", "DEL"],
  ["BKK", "DXB"],
  ["BKK", "DOH"],
  // ── Phuket & Chiang Mai international ──────────────────────
  ["HKT", "SIN"],
  ["HKT", "KUL"],
  ["HKT", "HKG"],
  ["CNX", "SIN"],
  ["CNX", "KUL"],
  // ── SE Asia cross-routes ───────────────────────────────────
  ["SIN", "KUL"],
  ["SIN", "CGK"],
  ["SIN", "MNL"],
  ["SIN", "SGN"],
  ["KUL", "CGK"],
  ["KUL", "MNL"],
  ["HKG", "ICN"],
  ["HKG", "NRT"],
];

// ─────────────────────────────────────────────────────────────
// REFERENCE DATA — AIRCRAFT TYPES
// ─────────────────────────────────────────────────────────────

const AIRCRAFT_TYPE_DEFS = [
  {
    iataCode: "320",
    model: "Airbus A320-200",
    capacityEco: 150,
    capacityBiz: 12,
    capacityFirst: 0,
  },
  {
    iataCode: "321",
    model: "Airbus A321-200",
    capacityEco: 180,
    capacityBiz: 16,
    capacityFirst: 0,
  },
  {
    iataCode: "333",
    model: "Airbus A330-300",
    capacityEco: 252,
    capacityBiz: 36,
    capacityFirst: 8,
  },
  {
    iataCode: "359",
    model: "Airbus A350-900",
    capacityEco: 270,
    capacityBiz: 42,
    capacityFirst: 10,
  },
  {
    iataCode: "738",
    model: "Boeing 737-800",
    capacityEco: 162,
    capacityBiz: 12,
    capacityFirst: 0,
  },
  {
    iataCode: "789",
    model: "Boeing 787-9",
    capacityEco: 246,
    capacityBiz: 28,
    capacityFirst: 0,
  },
  {
    iataCode: "77W",
    model: "Boeing 777-300ER",
    capacityEco: 304,
    capacityBiz: 42,
    capacityFirst: 8,
  },
  {
    iataCode: "AT7",
    model: "ATR 72-600",
    capacityEco: 70,
    capacityBiz: 0,
    capacityFirst: 0,
  },
];

/** How many aircraft of each type to put in the fleet */
const AIRCRAFT_COUNTS: Record<string, number> = {
  "320": 6,
  "321": 4,
  "333": 3,
  "359": 2,
  "738": 5,
  "789": 3,
  "77W": 2,
  AT7: 4,
};

/** Thai Civil Aviation Registration prefix for YokAirlines */
const TAIL_PREFIX = "HS-YK";
const TAIL_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ".split("");

// ─────────────────────────────────────────────────────────────
// REFERENCE DATA — STAFF
// ─────────────────────────────────────────────────────────────

const STAFF_DEFS: { role: Role; rank: Rank; count: number }[] = [
  { role: Role.PILOT, rank: Rank.CAPTAIN, count: 10 },
  { role: Role.PILOT, rank: Rank.FIRST_OFFICER, count: 14 },
  { role: Role.CABIN_CREW, rank: Rank.PURSER, count: 8 },
  { role: Role.CABIN_CREW, rank: Rank.CREW, count: 30 },
  { role: Role.GROUND_STAFF, rank: Rank.MANAGER, count: 4 },
  { role: Role.GROUND_STAFF, rank: Rank.SUPERVISOR, count: 8 },
  { role: Role.GROUND_STAFF, rank: Rank.STAFF, count: 20 },
  { role: Role.MECHANIC, rank: Rank.SUPERVISOR, count: 4 },
  { role: Role.MECHANIC, rank: Rank.STAFF, count: 12 },
  { role: Role.ADMIN, rank: Rank.MANAGER, count: 3 },
];

// ─────────────────────────────────────────────────────────────
// FALLBACK AIRPORT DATA
// Used when OurAirports CSV doesn't contain a needed IATA code
// ─────────────────────────────────────────────────────────────

interface AirportCoords {
  iataCode: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
}

const FALLBACK_AIRPORTS: AirportCoords[] = [
  {
    iataCode: "BKK",
    name: "Suvarnabhumi Airport",
    city: "Bangkok",
    country: "TH",
    lat: 13.6811,
    lon: 100.7472,
  },
  {
    iataCode: "DMK",
    name: "Don Mueang International Airport",
    city: "Bangkok",
    country: "TH",
    lat: 13.9126,
    lon: 100.6067,
  },
  {
    iataCode: "HKT",
    name: "Phuket International Airport",
    city: "Phuket",
    country: "TH",
    lat: 8.1132,
    lon: 98.3169,
  },
  {
    iataCode: "CNX",
    name: "Chiang Mai International Airport",
    city: "Chiang Mai",
    country: "TH",
    lat: 18.7668,
    lon: 98.9625,
  },
  {
    iataCode: "NST",
    name: "Nakhon Si Thammarat Airport",
    city: "Nakhon Si Thammarat",
    country: "TH",
    lat: 8.5396,
    lon: 99.9447,
  },
  {
    iataCode: "CEI",
    name: "Chiang Rai International Airport",
    city: "Chiang Rai",
    country: "TH",
    lat: 19.9523,
    lon: 99.8828,
  },
  {
    iataCode: "UTH",
    name: "Udon Thani International Airport",
    city: "Udon Thani",
    country: "TH",
    lat: 17.3864,
    lon: 102.7883,
  },
  {
    iataCode: "KBV",
    name: "Krabi International Airport",
    city: "Krabi",
    country: "TH",
    lat: 8.0992,
    lon: 98.9861,
  },
  {
    iataCode: "SIN",
    name: "Singapore Changi Airport",
    city: "Singapore",
    country: "SG",
    lat: 1.3644,
    lon: 103.9915,
  },
  {
    iataCode: "KUL",
    name: "Kuala Lumpur International Airport",
    city: "Kuala Lumpur",
    country: "MY",
    lat: 2.7456,
    lon: 101.7099,
  },
  {
    iataCode: "CGK",
    name: "Soekarno-Hatta International Airport",
    city: "Jakarta",
    country: "ID",
    lat: -6.1256,
    lon: 106.6558,
  },
  {
    iataCode: "MNL",
    name: "Ninoy Aquino International Airport",
    city: "Manila",
    country: "PH",
    lat: 14.5086,
    lon: 121.0197,
  },
  {
    iataCode: "SGN",
    name: "Tan Son Nhat International Airport",
    city: "Ho Chi Minh City",
    country: "VN",
    lat: 10.8188,
    lon: 106.652,
  },
  {
    iataCode: "HAN",
    name: "Noi Bai International Airport",
    city: "Hanoi",
    country: "VN",
    lat: 21.2212,
    lon: 105.8072,
  },
  {
    iataCode: "PNH",
    name: "Phnom Penh International Airport",
    city: "Phnom Penh",
    country: "KH",
    lat: 11.5466,
    lon: 104.844,
  },
  {
    iataCode: "VTE",
    name: "Wattay International Airport",
    city: "Vientiane",
    country: "LA",
    lat: 17.9883,
    lon: 102.5633,
  },
  {
    iataCode: "RGN",
    name: "Yangon International Airport",
    city: "Yangon",
    country: "MM",
    lat: 16.9073,
    lon: 96.1332,
  },
  {
    iataCode: "DAD",
    name: "Da Nang International Airport",
    city: "Da Nang",
    country: "VN",
    lat: 16.0439,
    lon: 108.1993,
  },
  {
    iataCode: "NRT",
    name: "Narita International Airport",
    city: "Tokyo",
    country: "JP",
    lat: 35.772,
    lon: 140.3929,
  },
  {
    iataCode: "ICN",
    name: "Incheon International Airport",
    city: "Seoul",
    country: "KR",
    lat: 37.4691,
    lon: 126.451,
  },
  {
    iataCode: "PVG",
    name: "Shanghai Pudong International Airport",
    city: "Shanghai",
    country: "CN",
    lat: 31.1443,
    lon: 121.8083,
  },
  {
    iataCode: "HKG",
    name: "Hong Kong International Airport",
    city: "Hong Kong",
    country: "HK",
    lat: 22.308,
    lon: 113.9185,
  },
  {
    iataCode: "TPE",
    name: "Taiwan Taoyuan International Airport",
    city: "Taipei",
    country: "TW",
    lat: 25.0777,
    lon: 121.2328,
  },
  {
    iataCode: "CAN",
    name: "Guangzhou Baiyun International Airport",
    city: "Guangzhou",
    country: "CN",
    lat: 23.3924,
    lon: 113.2988,
  },
  {
    iataCode: "PEK",
    name: "Beijing Capital International Airport",
    city: "Beijing",
    country: "CN",
    lat: 40.0799,
    lon: 116.6031,
  },
  {
    iataCode: "BOM",
    name: "Chhatrapati Shivaji Maharaj International",
    city: "Mumbai",
    country: "IN",
    lat: 19.0896,
    lon: 72.8656,
  },
  {
    iataCode: "DEL",
    name: "Indira Gandhi International Airport",
    city: "New Delhi",
    country: "IN",
    lat: 28.5562,
    lon: 77.1,
  },
  {
    iataCode: "DXB",
    name: "Dubai International Airport",
    city: "Dubai",
    country: "AE",
    lat: 25.2528,
    lon: 55.3644,
  },
  {
    iataCode: "DOH",
    name: "Hamad International Airport",
    city: "Doha",
    country: "QA",
    lat: 25.2609,
    lon: 51.6138,
  },
];

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)));
}

function durationMins(distanceKm: number): number {
  // 850 km/h cruise + 35 min ground time
  return Math.round((distanceKm / 850) * 60 + 35);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60_000);
}

function uniqueCode(prefix: string, used: Set<string>, length = 5): string {
  for (let i = 0; i < 1000; i++) {
    const code = `${prefix}${faker.string.numeric(length)}`;
    if (!used.has(code)) {
      used.add(code);
      return code;
    }
  }
  throw new Error(`Could not generate unique code with prefix ${prefix}`);
}

// ─────────────────────────────────────────────────────────────
// STEP 1 — FETCH AIRPORTS FROM OURAIRPORTS
// ─────────────────────────────────────────────────────────────

interface OurAirportRow {
  id: string;
  ident: string;
  type: string;
  name: string;
  latitude_deg: string;
  longitude_deg: string;
  elevation_ft: string;
  continent: string;
  iso_country: string;
  iso_region: string;
  municipality: string;
  scheduled_service: string;
  icao_code: string;
  iata_code: string;
}

async function fetchOurAirports(): Promise<Map<string, AirportCoords>> {
  console.log("📡 Fetching airports from OurAirports...");
  let csv = "";
  try {
    const res = await fetch(OURAIRPORTS_CSV_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    csv = await res.text();
  } catch (e) {
    console.warn(
      "  ⚠️  Could not fetch OurAirports — using fallback data only",
    );
    const map = new Map<string, AirportCoords>();
    FALLBACK_AIRPORTS.forEach((a) => map.set(a.iataCode, a));
    return map;
  }

  const { data } = Papa.parse<OurAirportRow>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  const map = new Map<string, AirportCoords>();
  for (const row of data) {
    const iata = row.iata_code?.trim();
    if (!iata || iata.length !== 3) continue;
    if (!ALLOWED_AIRPORT_TYPES.has(row.type)) continue;
    if (!ASIAN_COUNTRIES.has(row.iso_country)) continue;
    if (row.scheduled_service !== "yes") continue;
    if (map.has(iata)) continue;

    map.set(iata, {
      iataCode: iata,
      name: row.name.trim(),
      city: row.municipality?.trim() || row.name.trim(),
      country: row.iso_country.trim(),
      lat: parseFloat(row.latitude_deg),
      lon: parseFloat(row.longitude_deg),
    });
  }

  // Fill any gaps with fallbacks
  for (const fb of FALLBACK_AIRPORTS) {
    if (!map.has(fb.iataCode)) map.set(fb.iataCode, fb);
  }

  // Filter to only airports we actually need for routes
  const neededIatas = new Set(ROUTE_PAIRS.flat());
  const filtered = new Map<string, AirportCoords>();
  for (const iata of neededIatas) {
    const entry = map.get(iata);
    if (entry) filtered.set(iata, entry);
    else console.warn(`  ⚠️  No data for airport: ${iata}`);
  }

  console.log(
    `✅ ${filtered.size} airports loaded (${map.size} available in region)`,
  );
  return filtered;
}

// ─────────────────────────────────────────────────────────────
// STEP 2 — SEED AIRCRAFT TYPES
// ─────────────────────────────────────────────────────────────

async function seedAircraftTypes() {
  console.log("🛩️  Seeding aircraft types...");
  const results = [];
  for (const def of AIRCRAFT_TYPE_DEFS) {
    const t = await prisma.aircraftType.upsert({
      where: { iataCode: def.iataCode },
      update: {},
      create: def,
    });
    results.push(t);
  }
  console.log(`   ✅ ${results.length} aircraft types`);
  return results;
}

// ─────────────────────────────────────────────────────────────
// STEP 3 — SEED AIRCRAFT FLEET
// ─────────────────────────────────────────────────────────────

async function seedAircraft(types: { id: string; iataCode: string }[]) {
  console.log("✈️  Seeding aircraft fleet...");
  const fleet = [];
  let tailIdx = 0;

  for (const type of types) {
    const count = AIRCRAFT_COUNTS[type.iataCode] ?? 2;
    for (let i = 0; i < count; i++) {
      // Build tail number: HS-YKA1, HS-YKA2, HS-YKB1 ...
      const letter =
        TAIL_LETTERS[Math.floor(tailIdx / 9) % TAIL_LETTERS.length];
      const num = (tailIdx % 9) + 1;
      const tailNumber = `${TAIL_PREFIX}${letter}${num}`;
      tailIdx++;

      // Last aircraft of each type is in maintenance (realistic fleet ops)
      const status =
        i === count - 1 && count >= 3
          ? AircraftStatus.MAINTENANCE
          : AircraftStatus.ACTIVE;

      const a = await prisma.aircraft.upsert({
        where: { tailNumber },
        update: {},
        create: { tailNumber, status, aircraftTypeId: type.id },
      });
      fleet.push(a);
    }
  }

  console.log(`   ✅ ${fleet.length} aircraft`);
  return fleet;
}

// ─────────────────────────────────────────────────────────────
// STEP 4 — SEED AIRPORTS
// ─────────────────────────────────────────────────────────────

async function seedAirports(airports: Map<string, AirportCoords>) {
  console.log("🏙️  Seeding airports...");
  const results = [];
  for (const a of airports.values()) {
    const record = await prisma.airport.upsert({
      where: { iataCode: a.iataCode },
      update: {},
      create: {
        iataCode: a.iataCode,
        name: a.name,
        city: a.city,
        country: a.country,
      },
    });
    results.push(record);
  }
  console.log(`   ✅ ${results.length} airports`);
  return results;
}

// ─────────────────────────────────────────────────────────────
// STEP 5 — SEED ROUTES
// ─────────────────────────────────────────────────────────────

async function seedRoutes(
  airportCoords: Map<string, AirportCoords>,
  dbAirports: { id: string; iataCode: string }[],
) {
  console.log("🗺️  Seeding routes...");

  const iataToId = new Map(dbAirports.map((a) => [a.iataCode, a.id]));
  const results = [];
  const seenPairs = new Set<string>();

  for (const [oa, da] of ROUTE_PAIRS) {
    const oCoords = airportCoords.get(oa);
    const dCoords = airportCoords.get(da);
    const oId = iataToId.get(oa);
    const dId = iataToId.get(da);

    if (!oCoords || !dCoords || !oId || !dId) {
      console.warn(`   ⚠️  Skipping route ${oa}↔${da} — airport not found`);
      continue;
    }

    const distKm = haversineKm(
      oCoords.lat,
      oCoords.lon,
      dCoords.lat,
      dCoords.lon,
    );
    const mins = durationMins(distKm);

    // Seed both directions
    for (const [fromId, toId, fromIata, toIata] of [
      [oId, dId, oa, da],
      [dId, oId, da, oa],
    ] as [string, string, string, string][]) {
      const key = `${fromIata}-${toIata}`;
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);

      try {
        const r = await prisma.route.upsert({
          where: {
            originAirportId_destAirportId: {
              originAirportId: fromId,
              destAirportId: toId,
            },
          },
          update: {},
          create: {
            originAirportId: fromId,
            destAirportId: toId,
            distanceKm: distKm,
            durationMins: mins,
          },
        });
        results.push(r);
      } catch {
        // upsert guard
      }
    }
  }

  console.log(`   ✅ ${results.length} routes`);
  return results;
}

// ─────────────────────────────────────────────────────────────
// STEP 6 — SEED FLIGHTS
// ─────────────────────────────────────────────────────────────

function calcPrices(distanceKm: number) {
  // Base economy price scales with distance; business/first are multiples
  const eco = Math.round(500 + distanceKm * 0.07);
  return {
    basePriceEconomy: eco,
    basePriceBusiness: Math.round(eco * 3.5),
    basePriceFirst: Math.round(eco * 7.0),
  };
}

async function seedFlights(
  routes: { id: string; durationMins: number | null; distanceKm: number }[],
  aircraft: { id: string }[],
) {
  console.log("🛫 Seeding flights (30-day schedule)...");

  const activeAircraft = aircraft.filter((_, i) => i % 3 !== 2); // exclude maintenance
  const DEPARTURE_HOURS = [6, 9, 13, 17, 21]; // realistic slot times
  const usedCodes = new Set<string>();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const flights = [];

  for (const route of routes) {
    const mins = route.durationMins ?? durationMins(route.distanceKm);
    const prices = calcPrices(route.distanceKm);

    for (let day = -7; day < 30; day++) {
      for (const hour of DEPARTURE_HOURS) {
        // ~60% slot fill rate (not every flight runs every day/slot)
        if (Math.random() > 0.6) continue;

        const code = uniqueCode("YK", usedCodes, 5);

        const departure = addDays(today, day);
        departure.setHours(
          hour,
          pick([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]),
          0,
          0,
        );
        const arrival = addMinutes(departure, mins);

        // Determine flight status based on date
        let status: FlightStatus = FlightStatus.SCHEDULED;
        if (day < -1) {
          status = FlightStatus.ARRIVED;
        } else if (day === -1 || (day === 0 && hour < new Date().getHours())) {
          const roll = Math.random();
          status =
            roll > 0.92
              ? FlightStatus.DELAYED
              : roll > 0.03
                ? FlightStatus.DEPARTED
                : FlightStatus.DIVERTED;
        } else if (day === 0 && hour === new Date().getHours()) {
          status =
            Math.random() > 0.3 ? FlightStatus.BOARDING : FlightStatus.DELAYED;
        }

        const f = await prisma.flight.create({
          data: {
            flightCode: code,
            routeId: route.id,
            aircraftId: pick(activeAircraft).id,
            gate: `${pick(["A", "B", "C", "D", "E"])}${randInt(1, 30)}`,
            departureTime: departure,
            arrivalTime: arrival,
            status,
            basePriceEconomy: prices.basePriceEconomy,
            basePriceBusiness: prices.basePriceBusiness,
            basePriceFirst: prices.basePriceFirst,
          },
        });
        flights.push(f);
      }
    }
  }

  console.log(`   ✅ ${flights.length} flights`);
  return flights;
}

// ─────────────────────────────────────────────────────────────
// STEP 7 — SEED USERS (passengers + staff)
// ─────────────────────────────────────────────────────────────

async function seedUsers(
  dbAirports: { id: string; iataCode: string }[],
  passengerCount = 200,
) {
  console.log("👤 Seeding passengers...");

  const bkkAirport =
    dbAirports.find((a) => a.iataCode === "BKK") ?? dbAirports[0];
  const thaiAirports = dbAirports.filter((a) =>
    ["BKK", "DMK", "HKT", "CNX"].includes(a.iataCode),
  );

  // ── Passengers ───────────────────────────────────────────
  const passengers = [];
  for (let i = 0; i < passengerCount; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const u = await prisma.user.create({
      data: {
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        name: `${firstName} ${lastName}`,
        phone: faker.phone.number(),
        role: Role.PASSENGER,
        emailVerified: Math.random() > 0.1,
        image: Math.random() > 0.6 ? faker.image.avatar() : null,
      },
    });
    passengers.push(u);
  }
  console.log(`   ✅ ${passengers.length} passengers`);

  // ── Staff ─────────────────────────────────────────────────
  console.log("👷 Seeding staff...");
  const staff = [];
  let empNum = 1000;

  for (const def of STAFF_DEFS) {
    for (let i = 0; i < def.count; i++) {
      empNum++;
      const employeeId = `YK${empNum}`;
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();

      const u = await prisma.user.create({
        data: {
          email: `${employeeId.toLowerCase()}@yokairlines.com`,
          name: `${firstName} ${lastName}`,
          phone: faker.phone.number(),
          role: def.role,
          emailVerified: true,
          staffProfile: {
            create: {
              employeeId,
              role: def.role,
              rank: def.rank,
              baseAirportId: bkkAirport.id,
              stationId: pick(thaiAirports.length ? thaiAirports : dbAirports)
                .id,
            },
          },
        },
        include: { staffProfile: true },
      });
      staff.push(u);
    }
  }
  console.log(`   ✅ ${staff.length} staff members`);

  return { passengers, staff };
}

// ─────────────────────────────────────────────────────────────
// STEP 8 — ASSIGN CAPTAINS TO FLIGHTS
// ─────────────────────────────────────────────────────────────

async function assignCaptains(
  flights: { id: string }[],
  staff: {
    staffProfile: { id: string; role: Role; rank: Rank | null } | null;
  }[],
) {
  console.log("👨‍✈️  Assigning captains to flights...");

  const captains = staff
    .map((s) => s.staffProfile)
    .filter(
      (p): p is NonNullable<typeof p> =>
        p !== null && p.role === Role.PILOT && p.rank === Rank.CAPTAIN,
    );

  if (!captains.length) {
    console.warn("   ⚠️  No captains found");
    return;
  }

  let count = 0;
  for (const f of flights) {
    if (Math.random() > 0.1) {
      // 90% of flights have a named captain
      await prisma.flight.update({
        where: { id: f.id },
        data: { captainId: pick(captains).id },
      });
      count++;
    }
  }
  console.log(`   ✅ Assigned captains to ${count} flights`);
}

// ─────────────────────────────────────────────────────────────
// STEP 9 — SEED BOOKINGS, TICKETS & TRANSACTIONS
// ─────────────────────────────────────────────────────────────

const SEAT_CONFIG = {
  [TicketClass.FIRST_CLASS]: { rows: [1, 5], letters: ["A", "B", "C", "D"] },
  [TicketClass.BUSINESS]: {
    rows: [6, 15],
    letters: ["A", "B", "C", "D", "E", "F"],
  },
  [TicketClass.ECONOMY]: {
    rows: [16, 45],
    letters: ["A", "B", "C", "D", "E", "F"],
  },
};

function generateSeat(cls: TicketClass): string {
  const cfg = SEAT_CONFIG[cls];
  return `${randInt(cfg.rows[0], cfg.rows[1])}${pick(cfg.letters)}`;
}

const PAYMENT_METHODS = [
  "CARD",
  "PROMPTPAY",
  "TRUEMONEY",
  "RABBIT_LINE_PAY",
] as const;
const PASSENGER_NATIONALITIES = [
  "TH",
  "SG",
  "JP",
  "US",
  "GB",
  "CN",
  "KR",
  "AU",
  "DE",
  "FR",
];
const REFUND_REASONS = [
  "Passenger request",
  "Flight cancelled by airline",
  "Schedule change",
  "Medical reason",
  "Visa denied",
];

async function seedBookings(
  passengers: { id: string }[],
  flights: {
    id: string;
    basePriceEconomy: any;
    basePriceBusiness: any;
    basePriceFirst: any;
  }[],
  bookingCount = 400,
) {
  console.log("🎫 Seeding bookings, tickets & transactions...");

  const usedPNRs = new Set<string>();
  let created = 0;

  // Use only future/recent flights for bookings (more realistic)
  const bookableFlights = flights.slice(0, Math.ceil(flights.length * 0.8));

  for (let i = 0; i < bookingCount; i++) {
    const user = pick(passengers);
    const flight = pick(bookableFlights);

    // Class distribution: 70% economy, 22% business, 8% first
    const classRoll = Math.random();
    const cls: TicketClass =
      classRoll > 0.92
        ? TicketClass.FIRST_CLASS
        : classRoll > 0.7
          ? TicketClass.BUSINESS
          : TicketClass.ECONOMY;

    const pricePerTicket =
      cls === TicketClass.FIRST_CLASS
        ? Number(flight.basePriceFirst)
        : cls === TicketClass.BUSINESS
          ? Number(flight.basePriceBusiness)
          : Number(flight.basePriceEconomy);

    const paxCount = randInt(1, 4);
    const totalPrice = pricePerTicket * paxCount;

    // PNR
    let pnr = faker.string.alphanumeric({ length: 6, casing: "upper" });
    for (let t = 0; t < 20 && usedPNRs.has(pnr); t++) {
      pnr = faker.string.alphanumeric({ length: 6, casing: "upper" });
    }
    if (usedPNRs.has(pnr)) continue;
    usedPNRs.add(pnr);

    // Booking status distribution
    const statusRoll = Math.random();
    const bookingStatus: BookingStatus =
      statusRoll > 0.92
        ? BookingStatus.CANCELLED
        : statusRoll > 0.05
          ? BookingStatus.CONFIRMED
          : BookingStatus.PENDING;

    // Transaction status follows booking status
    const txStatus: TransactionStatus =
      bookingStatus === BookingStatus.CANCELLED
        ? TransactionStatus.REFUNDED
        : bookingStatus === BookingStatus.CONFIRMED
          ? TransactionStatus.SUCCESS
          : TransactionStatus.PENDING;

    const txType: TransactionType =
      txStatus === TransactionStatus.REFUNDED
        ? TransactionType.REFUND
        : TransactionType.PAYMENT;

    // Payment method snapshot (denormalized — safe for accounting)
    const pmType = pick(PAYMENT_METHODS);
    const pmRef =
      pmType === "CARD"
        ? `**** **** **** ${randInt(1000, 9999)}`
        : `***-***-${randInt(1000, 9999)}`;

    // Stripe mock IDs (only for completed payments)
    const stripeIntentId =
      txStatus !== TransactionStatus.PENDING
        ? `pi_${faker.string.alphanumeric(24)}`
        : null;

    // Tickets
    const usedSeats = new Set<string>();
    const tickets = Array.from({ length: paxCount }, () => {
      let seat = generateSeat(cls);
      for (let s = 0; s < 10 && usedSeats.has(seat); s++)
        seat = generateSeat(cls);
      usedSeats.add(seat);

      const checkedIn =
        bookingStatus === BookingStatus.CONFIRMED && Math.random() > 0.45;

      return {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        dateOfBirth: faker.date.birthdate({ min: 18, max: 75, mode: "age" }),
        passportNumber: faker.string.alphanumeric({
          length: 9,
          casing: "upper",
        }),
        nationality: pick(PASSENGER_NATIONALITIES),
        gender: pick(["MALE", "FEMALE"]),
        seatNumber: seat,
        class: cls,
        price: pricePerTicket,
        checkedIn,
        checkedInAt: checkedIn ? faker.date.recent({ days: 2 }) : null,
        boardingPass: checkedIn
          ? `BP-${faker.string.alphanumeric({ length: 12, casing: "upper" })}`
          : null,
      };
    });

    await prisma.booking.create({
      data: {
        bookingRef: pnr,
        userId: user.id,
        flightId: flight.id,
        status: bookingStatus,
        totalPrice,
        currency: "THB",
        contactEmail: faker.internet.email().toLowerCase(),
        contactPhone: faker.phone.number(),
        tickets: { create: tickets },
        transactions: {
          create: {
            amount: totalPrice,
            currency: "THB",
            status: txStatus,
            type: txType,
            paymentMethodType: pmType,
            paymentMethodRef: pmRef,
            stripePaymentIntentId: stripeIntentId,
            stripeChargeId: stripeIntentId
              ? `ch_${faker.string.alphanumeric(24)}`
              : null,
            refundedAt:
              txType === TransactionType.REFUND
                ? faker.date.recent({ days: 10 })
                : null,
            refundReason:
              txType === TransactionType.REFUND ? pick(REFUND_REASONS) : null,
          },
        },
      },
    });

    created++;
  }

  console.log(`   ✅ ${created} bookings created`);
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌏  YokAirlines — Database Seed\n" + "─".repeat(50));

  // Clear existing data — order must respect FK constraints
  // Emergency tables may still exist from old migrations — delete them first
  console.log("🧹 Clearing existing data...");

  // Emergency system (old schema — may or may not exist)
  try {
    await (prisma as any).activeEmergencyTask.deleteMany();
    await (prisma as any).emergencyIncident.deleteMany();
    await (prisma as any).emergencyTaskTemplate.deleteMany();
    await (prisma as any).emergencyType.deleteMany();
  } catch {
    // Tables don't exist in current schema — safe to ignore
  }

  // Core tables in FK-safe order
  await prisma.transaction.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.flight.deleteMany();
  await prisma.route.deleteMany();
  await prisma.aircraft.deleteMany();
  await prisma.aircraftType.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.airport.deleteMany();
  console.log("   ✅ Database cleared\n");

  // Seed
  const airportCoords = await fetchOurAirports();
  const aircraftTypes = await seedAircraftTypes();
  const aircraft = await seedAircraft(aircraftTypes);
  const dbAirports = await seedAirports(airportCoords);
  const routes = await seedRoutes(airportCoords, dbAirports);
  const flights = await seedFlights(routes, aircraft);
  const { passengers, staff } = await seedUsers(dbAirports);
  await assignCaptains(flights, staff as any);
  await seedBookings(passengers, flights as any);

  // Summary
  console.log("\n" + "─".repeat(50));
  console.log("✅  Seed complete!\n");
  console.log(`  Airports       : ${dbAirports.length}`);
  console.log(`  Aircraft Types : ${aircraftTypes.length}`);
  console.log(`  Aircraft       : ${aircraft.length}`);
  console.log(`  Routes         : ${routes.length}`);
  console.log(`  Flights        : ${flights.length}`);
  console.log(`  Passengers     : ${passengers.length}`);
  console.log(`  Staff          : ${staff.length}`);
  console.log(
    "\n  ℹ️  MongoDB data (profiles, emergency types) → run mongo-seed.ts",
  );
  console.log("─".repeat(50) + "\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
