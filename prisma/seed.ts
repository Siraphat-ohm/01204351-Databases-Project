import "dotenv/config";
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
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import mongoose from "mongoose";
import CrewProfile from "@/models/CrewProfile";
import FlightOpsLog from "@/models/FlightOpsLog";
import IssueReport from "@/models/IssueReport";
import PaymentLog from "@/models/PaymentLog";

const pg = require("pg") as typeof import("pg");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────────────────────
// CONFIG & REFERENCE DATA
// ─────────────────────────────────────────────────────────────

const OURAIRPORTS_CSV_URL =
  "https://davidmegginson.github.io/ourairports-data/airports.csv";

const ASIAN_COUNTRIES = new Set([
  "TH", "SG", "MY", "ID", "PH", "VN", "KH", "LA", "MM", 
  "JP", "KR", "CN", "HK", "TW", "IN", "AE", "QA",
]);

const ALLOWED_AIRPORT_TYPES = new Set(["large_airport", "medium_airport"]);

const ROUTE_PAIRS: [string, string][] = [
  ["BKK", "HKT"], ["BKK", "CNX"], ["BKK", "DMK"], ["BKK", "NST"], ["BKK", "CEI"],
  ["BKK", "UTH"], ["BKK", "KBV"], ["DMK", "HKT"], ["DMK", "CNX"], ["CNX", "HKT"],
  ["BKK", "SIN"], ["BKK", "KUL"], ["BKK", "CGK"], ["BKK", "MNL"], ["BKK", "SGN"],
  ["BKK", "HAN"], ["BKK", "PNH"], ["BKK", "VTE"], ["BKK", "RGN"], ["BKK", "DAD"],
  ["BKK", "NRT"], ["BKK", "ICN"], ["BKK", "PVG"], ["BKK", "HKG"], ["BKK", "TPE"],
  ["BKK", "CAN"], ["BKK", "PEK"], ["BKK", "BOM"], ["BKK", "DEL"], ["BKK", "DXB"],
  ["BKK", "DOH"], ["HKT", "SIN"], ["HKT", "KUL"], ["HKT", "HKG"], ["CNX", "SIN"],
  ["CNX", "KUL"], ["SIN", "KUL"], ["SIN", "CGK"], ["SIN", "MNL"], ["SIN", "SGN"],
  ["KUL", "CGK"], ["KUL", "MNL"], ["HKG", "ICN"], ["HKG", "NRT"],
];

const AIRCRAFT_TYPE_DEFS = [
  { iataCode: "320", model: "Airbus A320-200", capacityEco: 150, capacityBiz: 12, capacityFirst: 0 },
  { iataCode: "321", model: "Airbus A321-200", capacityEco: 180, capacityBiz: 16, capacityFirst: 0 },
  { iataCode: "333", model: "Airbus A330-300", capacityEco: 252, capacityBiz: 36, capacityFirst: 8 },
  { iataCode: "359", model: "Airbus A350-900", capacityEco: 270, capacityBiz: 42, capacityFirst: 10 },
  { iataCode: "738", model: "Boeing 737-800", capacityEco: 162, capacityBiz: 12, capacityFirst: 0 },
  { iataCode: "789", model: "Boeing 787-9", capacityEco: 252, capacityBiz: 28, capacityFirst: 0 },
  { iataCode: "77W", model: "Boeing 777-300ER", capacityEco: 300, capacityBiz: 42, capacityFirst: 8 },
  { iataCode: "AT7", model: "ATR 72-600", capacityEco: 72, capacityBiz: 0, capacityFirst: 0 },
];

const AIRCRAFT_COUNTS: Record<string, number> = {
  "320": 6, "321": 4, "333": 3, "359": 2, "738": 5, "789": 3, "77W": 2, AT7: 4,
};

const SEED_DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "Passw0rd123!";
const MONGO_URI = process.env.MONGO_USER_DATABASE_URL ?? process.env.MONGODB_URI;

// ─────────────────────────────────────────────────────────────
// REFERENCE DATA — SEAT LAYOUTS
// ─────────────────────────────────────────────────────────────

type CabinName = "FIRST" | "BUSINESS" | "ECONOMY";
interface SeatLayoutCabinDef {
  cabin: CabinName;
  rowStart: number;
  rowEnd: number;
  columns: string[];
  aisleAfter: string[];
  exitRows: number[];
  blockedSeats: string[];
}

const SEAT_LAYOUT_DEFS: {
  iataCode: string;
  reference: string;
  cabins: SeatLayoutCabinDef[];
}[] = [
  {
    iataCode: "320",
    reference: "Thai Airways / Bangkok Airways domestic narrow-body",
    cabins: [
      { cabin: "BUSINESS", rowStart: 1, rowEnd: 3, columns: ["A", "C", "D", "F"], aisleAfter: ["C"], exitRows: [], blockedSeats: [] },
      { cabin: "ECONOMY", rowStart: 5, rowEnd: 29, columns: ["A", "B", "C", "D", "E", "F"], aisleAfter: ["C"], exitRows: [12, 13], blockedSeats: [] },
    ],
  },
  {
    iataCode: "321",
    reference: "Thai Airways regional narrow-body",
    cabins: [
      { cabin: "BUSINESS", rowStart: 1, rowEnd: 4, columns: ["A", "C", "D", "F"], aisleAfter: ["C"], exitRows: [], blockedSeats: [] },
      { cabin: "ECONOMY", rowStart: 6, rowEnd: 35, columns: ["A", "B", "C", "D", "E", "F"], aisleAfter: ["C"], exitRows: [16, 17], blockedSeats: [] },
    ],
  },
  {
    iataCode: "333",
    reference: "Thai Airways Royal First / Royal Silk wide-body",
    cabins: [
      { cabin: "FIRST", rowStart: 1, rowEnd: 2, columns: ["A", "D", "G", "K"], aisleAfter: ["A", "G"], exitRows: [], blockedSeats: [] },
      { cabin: "BUSINESS", rowStart: 5, rowEnd: 10, columns: ["A", "C", "D", "F", "H", "K"], aisleAfter: ["C", "F"], exitRows: [], blockedSeats: [] },
      { cabin: "ECONOMY", rowStart: 13, rowEnd: 40, columns: ["A", "B", "C", "D", "E", "F", "G", "H", "K"], aisleAfter: ["B", "F"], exitRows: [30, 31], blockedSeats: [] },
    ],
  },
  {
    iataCode: "359",
    reference: "Thai Airways flagship — Royal First Suite / Royal Silk",
    cabins: [
      { cabin: "FIRST", rowStart: 1, rowEnd: 2, columns: ["A", "C", "D", "G", "K"], aisleAfter: ["C", "G"], exitRows: [], blockedSeats: [] },
      { cabin: "BUSINESS", rowStart: 5, rowEnd: 11, columns: ["A", "C", "D", "F", "H", "K"], aisleAfter: ["C", "F"], exitRows: [], blockedSeats: [] },
      { cabin: "ECONOMY", rowStart: 14, rowEnd: 43, columns: ["A", "B", "C", "D", "E", "F", "H", "J", "K"], aisleAfter: ["C", "F"], exitRows: [30, 31], blockedSeats: [] },
    ],
  },
  {
    iataCode: "738",
    reference: "Nok Air / Bangkok Airways short-haul",
    cabins: [
      { cabin: "BUSINESS", rowStart: 1, rowEnd: 3, columns: ["A", "C", "D", "F"], aisleAfter: ["C"], exitRows: [], blockedSeats: [] },
      { cabin: "ECONOMY", rowStart: 5, rowEnd: 31, columns: ["A", "B", "C", "D", "E", "F"], aisleAfter: ["C"], exitRows: [15, 16], blockedSeats: [] },
    ],
  },
  {
    iataCode: "789",
    reference: "Thai Airways Royal Silk long-haul (no first class)",
    cabins: [
      { cabin: "BUSINESS", rowStart: 1, rowEnd: 7, columns: ["A", "D", "G", "K"], aisleAfter: ["A", "G"], exitRows: [], blockedSeats: [] },
      { cabin: "ECONOMY", rowStart: 11, rowEnd: 38, columns: ["A", "B", "C", "D", "E", "F", "H", "J", "K"], aisleAfter: ["C", "F"], exitRows: [25, 26], blockedSeats: [] },
    ],
  },
  {
    iataCode: "77W",
    reference: "Thai Airways flagship long-haul — Royal First / Royal Silk",
    cabins: [
      { cabin: "FIRST", rowStart: 1, rowEnd: 2, columns: ["A", "D", "G", "K"], aisleAfter: ["A", "G"], exitRows: [], blockedSeats: [] },
      { cabin: "BUSINESS", rowStart: 5, rowEnd: 11, columns: ["A", "C", "D", "F", "H", "K"], aisleAfter: ["C", "F"], exitRows: [], blockedSeats: [] },
      { cabin: "ECONOMY", rowStart: 14, rowEnd: 43, columns: ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K"], aisleAfter: ["C", "G"], exitRows: [30, 31], blockedSeats: [] },
    ],
  },
  {
    iataCode: "AT7",
    reference: "Bangkok Airways / Nok Air domestic turboprop",
    cabins: [
      { cabin: "ECONOMY", rowStart: 1, rowEnd: 18, columns: ["A", "B", "C", "D"], aisleAfter: ["B"], exitRows: [1, 12], blockedSeats: [] },
    ],
  },
];

const TAIL_PREFIX = "HS-YK";
const TAIL_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ".split("");

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

const FALLBACK_AIRPORTS = [
  { iataCode: "BKK", name: "Suvarnabhumi Airport", city: "Bangkok", country: "TH", lat: 13.6811, lon: 100.7472 },
  { iataCode: "DMK", name: "Don Mueang International Airport", city: "Bangkok", country: "TH", lat: 13.9126, lon: 100.6067 },
  { iataCode: "HKT", name: "Phuket International Airport", city: "Phuket", country: "TH", lat: 8.1132, lon: 98.3169 },
  { iataCode: "CNX", name: "Chiang Mai International Airport", city: "Chiang Mai", country: "TH", lat: 18.7668, lon: 98.9625 },
  { iataCode: "NST", name: "Nakhon Si Thammarat Airport", city: "Nakhon Si Thammarat", country: "TH", lat: 8.5396, lon: 99.9447 },
  { iataCode: "CEI", name: "Chiang Rai International Airport", city: "Chiang Rai", country: "TH", lat: 19.9523, lon: 99.8828 },
  { iataCode: "UTH", name: "Udon Thani International Airport", city: "Udon Thani", country: "TH", lat: 17.3864, lon: 102.7883 },
  { iataCode: "KBV", name: "Krabi International Airport", city: "Krabi", country: "TH", lat: 8.0992, lon: 98.9861 },
  { iataCode: "SIN", name: "Singapore Changi Airport", city: "Singapore", country: "SG", lat: 1.3644, lon: 103.9915 },
  { iataCode: "KUL", name: "Kuala Lumpur International Airport", city: "Kuala Lumpur", country: "MY", lat: 2.7456, lon: 101.7099 },
  { iataCode: "CGK", name: "Soekarno-Hatta International Airport", city: "Jakarta", country: "ID", lat: -6.1256, lon: 106.6558 },
  { iataCode: "MNL", name: "Ninoy Aquino International Airport", city: "Manila", country: "PH", lat: 14.5086, lon: 121.0197 },
  { iataCode: "SGN", name: "Tan Son Nhat International Airport", city: "Ho Chi Minh City", country: "VN", lat: 10.8188, lon: 106.652 },
  { iataCode: "HAN", name: "Noi Bai International Airport", city: "Hanoi", country: "VN", lat: 21.2212, lon: 105.8072 },
  { iataCode: "PNH", name: "Phnom Penh International Airport", city: "Phnom Penh", country: "KH", lat: 11.5466, lon: 104.844 },
  { iataCode: "VTE", name: "Wattay International Airport", city: "Vientiane", country: "LA", lat: 17.9883, lon: 102.5633 },
  { iataCode: "RGN", name: "Yangon International Airport", city: "Yangon", country: "MM", lat: 16.9073, lon: 96.1332 },
  { iataCode: "DAD", name: "Da Nang International Airport", city: "Da Nang", country: "VN", lat: 16.0439, lon: 108.1993 },
  { iataCode: "NRT", name: "Narita International Airport", city: "Tokyo", country: "JP", lat: 35.772, lon: 140.3929 },
  { iataCode: "ICN", name: "Incheon International Airport", city: "Seoul", country: "KR", lat: 37.4691, lon: 126.451 },
  { iataCode: "PVG", name: "Shanghai Pudong International Airport", city: "Shanghai", country: "CN", lat: 31.1443, lon: 121.8083 },
  { iataCode: "HKG", name: "Hong Kong International Airport", city: "Hong Kong", country: "HK", lat: 22.308, lon: 113.9185 },
  { iataCode: "TPE", name: "Taiwan Taoyuan International Airport", city: "Taipei", country: "TW", lat: 25.0777, lon: 121.2328 },
  { iataCode: "CAN", name: "Guangzhou Baiyun International Airport", city: "Guangzhou", country: "CN", lat: 23.3924, lon: 113.2988 },
  { iataCode: "PEK", name: "Beijing Capital International Airport", city: "Beijing", country: "CN", lat: 40.0799, lon: 116.6031 },
  { iataCode: "BOM", name: "Chhatrapati Shivaji Maharaj International", city: "Mumbai", country: "IN", lat: 19.0896, lon: 72.8656 },
  { iataCode: "DEL", name: "Indira Gandhi International Airport", city: "New Delhi", country: "IN", lat: 28.5562, lon: 77.1 },
  { iataCode: "DXB", name: "Dubai International Airport", city: "Dubai", country: "AE", lat: 25.2528, lon: 55.3644 },
  { iataCode: "DOH", name: "Hamad International Airport", city: "Doha", country: "QA", lat: 25.2609, lon: 51.6138 },
];

const PAYMENT_METHODS = ["CARD", "PROMPTPAY", "TRUEMONEY", "RABBIT_LINE_PAY"] as const;
const PASSENGER_NATIONALITIES = ["TH", "SG", "JP", "US", "GB", "CN", "KR", "AU", "DE", "FR"];
const REFUND_REASONS = ["Passenger request", "Flight cancelled by airline", "Schedule change", "Medical reason", "Visa denied"];

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)));
}

function durationMins(distanceKm: number): number {
  return Math.round((distanceKm / 850) * 60 + 35);
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
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

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function makeBookingRef(): string {
  const id = createCuid().replace(/^c/, "").toUpperCase();
  return `YK${id.slice(0, 16)}`;
}

function createCuid(): string {
  const time = Date.now().toString(36);
  const rand = randomBytes(16).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
  return `c${time}${rand}`;
}

// ─────────────────────────────────────────────────────────────
// CACHED SEAT HELPERS (OPTIMIZATION)
// ─────────────────────────────────────────────────────────────

interface LoadedCabin {
  cabin: string;
  rowStart: number;
  rowEnd: number;
  columns: string[];
  blockedSeats: string[];
}

interface LoadedLayout {
  aircraftTypeIataCode: string;
  cabins: LoadedCabin[];
}

// Global cache structure
const seatCache = new Map<string, {
  allSeats: string[];
  classMap: Map<string, TicketClass>;
  cabinMap: Map<TicketClass, string[]>;
}>();

function ticketClassToCabin(cls: TicketClass): "FIRST" | "BUSINESS" | "ECONOMY" {
  if (cls === TicketClass.FIRST_CLASS) return "FIRST";
  if (cls === TicketClass.BUSINESS) return "BUSINESS";
  return "ECONOMY";
}

function cabinToTicketClass(cabin: "FIRST" | "BUSINESS" | "ECONOMY"): TicketClass {
  if (cabin === "FIRST") return TicketClass.FIRST_CLASS;
  if (cabin === "BUSINESS") return TicketClass.BUSINESS;
  return TicketClass.ECONOMY;
}

function buildSeatCache(layouts: Map<string, LoadedLayout>) {
  for (const [iataCode, layout] of layouts.entries()) {
    const allSeats: string[] = [];
    const classMap = new Map<string, TicketClass>();
    const cabinMap = new Map<TicketClass, string[]>();

    for (const cabin of layout.cabins) {
      const ticketClass = cabinToTicketClass(cabin.cabin as "FIRST" | "BUSINESS" | "ECONOMY");
      const cabinSeats: string[] = [];
      
      for (let row = cabin.rowStart; row <= cabin.rowEnd; row++) {
        for (const col of cabin.columns) {
          const seatLabel = `${row}${col}`;
          if (!cabin.blockedSeats.includes(seatLabel)) {
            allSeats.push(seatLabel);
            cabinSeats.push(seatLabel);
            classMap.set(seatLabel, ticketClass);
          }
        }
      }
      cabinMap.set(ticketClass, cabinSeats);
    }
    seatCache.set(iataCode, { allSeats, classMap, cabinMap });
  }
}

function generateSeatForAircraft(aircraftTypeIataCode: string, cls: TicketClass): string | null {
  const cache = seatCache.get(aircraftTypeIataCode);
  if (!cache) return null;
  const seats = cache.cabinMap.get(cls);
  return seats && seats.length > 0 ? pick(seats) : null;
}

function allSeatsForCabin(aircraftTypeIataCode: string, cls: TicketClass): string[] {
  return seatCache.get(aircraftTypeIataCode)?.cabinMap.get(cls) || [];
}

function allSeatsForAircraft(aircraftTypeIataCode: string): string[] {
  return seatCache.get(aircraftTypeIataCode)?.allSeats || [];
}

function ticketClassForSeat(aircraftTypeIataCode: string, seatLabel: string): TicketClass | null {
  return seatCache.get(aircraftTypeIataCode)?.classMap.get(seatLabel) || null;
}

function aircraftHasClass(aircraftTypeIataCode: string, cls: TicketClass): boolean {
  const seats = seatCache.get(aircraftTypeIataCode)?.cabinMap.get(cls);
  return !!(seats && seats.length > 0);
}


// ─────────────────────────────────────────────────────────────
// SEEDING FUNCTIONS
// ─────────────────────────────────────────────────────────────

async function fetchOurAirports() {
  console.log("📡 Fetching airports from OurAirports...");
  let csv = "";
  try {
    const res = await fetch(OURAIRPORTS_CSV_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    csv = await res.text();
  } catch (e) {
    console.warn("  ⚠️  Could not fetch OurAirports — using fallback data only");
  }

  const map = new Map<string, any>();
  if (csv) {
    const { data } = Papa.parse<any>(csv, { header: true, skipEmptyLines: true });
    for (const row of data) {
      const iata = row.iata_code?.trim();
      if (!iata || iata.length !== 3 || !ALLOWED_AIRPORT_TYPES.has(row.type) || !ASIAN_COUNTRIES.has(row.iso_country) || row.scheduled_service !== "yes" || map.has(iata)) continue;
      map.set(iata, { id: createCuid(), iataCode: iata, name: row.name.trim(), city: row.municipality?.trim() || row.name.trim(), country: row.iso_country.trim(), lat: parseFloat(row.latitude_deg), lon: parseFloat(row.longitude_deg) });
    }
  }

  for (const fb of FALLBACK_AIRPORTS) {
    if (!map.has(fb.iataCode)) map.set(fb.iataCode, { id: createCuid(), ...fb });
  }

  const neededIatas = new Set(ROUTE_PAIRS.flat());
  const filtered = Array.from(map.values()).filter((a) => neededIatas.has(a.iataCode));

  console.log(`✅ ${filtered.length} airports loaded in memory`);
  return filtered;
}

async function seedAircraftTypes() {
  console.log("🛩️  Seeding aircraft types...");
  const typesData = AIRCRAFT_TYPE_DEFS.map((def) => ({ id: createCuid(), ...def }));
  await prisma.aircraftType.createMany({ data: typesData });
  return typesData;
}

async function seedSeatLayouts(aircraftTypes: { id: string; iataCode: string }[]) {
  console.log("💺 Seeding seat layouts into Postgres...");
  const iataToId = new Map(aircraftTypes.map((t) => [t.iataCode, t.id]));

  for (const def of SEAT_LAYOUT_DEFS) {
    const aircraftTypeId = iataToId.get(def.iataCode);
    if (!aircraftTypeId) continue;

    await prisma.seatLayoutTemplate.create({
      data: {
        aircraftTypeId,
        reference: def.reference,
        cabins: {
          create: def.cabins.map((c, i) => ({
            cabin: c.cabin as any,
            rowStart: c.rowStart,
            rowEnd: c.rowEnd,
            columns: c.columns,
            aisleAfter: c.aisleAfter,
            exitRows: c.exitRows,
            blockedSeats: c.blockedSeats,
            sortOrder: i,
          })),
        },
      },
    });
  }
  console.log(`   ✅ ${SEAT_LAYOUT_DEFS.length} seat layouts`);
}

async function loadSeatLayouts(): Promise<Map<string, LoadedLayout>> {
  const templates = await prisma.seatLayoutTemplate.findMany({
    include: {
      cabins: { orderBy: { sortOrder: "asc" } },
      aircraftType: { select: { iataCode: true } },
    },
  });

  const map = new Map<string, LoadedLayout>();
  for (const t of templates) {
    map.set(t.aircraftType.iataCode, {
      aircraftTypeIataCode: t.aircraftType.iataCode,
      cabins: t.cabins.map((c) => ({ cabin: c.cabin, rowStart: c.rowStart, rowEnd: c.rowEnd, columns: c.columns, blockedSeats: c.blockedSeats })),
    });
  }
  return map;
}

async function seedAircraft(types: any[]) {
  console.log("✈️  Seeding aircraft fleet...");
  const fleetData = [];
  let tailIdx = 0;

  for (const type of types) {
    const count = AIRCRAFT_COUNTS[type.iataCode] ?? 2;
    for (let i = 0; i < count; i++) {
      const letter = TAIL_LETTERS[Math.floor(tailIdx / 9) % TAIL_LETTERS.length];
      const num = (tailIdx % 9) + 1;
      const tailNumber = `${TAIL_PREFIX}${letter}${num}`;
      tailIdx++;

      const status = i === count - 1 && count >= 3 ? AircraftStatus.MAINTENANCE : AircraftStatus.ACTIVE;
      fleetData.push({ id: createCuid(), tailNumber, status, aircraftTypeId: type.id });
    }
  }
  await prisma.aircraft.createMany({ data: fleetData });
  return fleetData;
}

async function seedAirports(airportsData: any[]) {
  console.log("🏙️  Seeding airports...");
  await prisma.airport.createMany({ data: airportsData });
  return airportsData;
}

async function seedRoutes(airportCoords: any[]) {
  console.log("🗺️  Seeding routes...");
  const routesData = [];
  const iataToNode = new Map(airportCoords.map((a) => [a.iataCode, a]));
  const seenPairs = new Set<string>();

  for (const [oa, da] of ROUTE_PAIRS) {
    const oCoords = iataToNode.get(oa);
    const dCoords = iataToNode.get(da);
    if (!oCoords || !dCoords) continue;

    const distKm = haversineKm(oCoords.lat, oCoords.lon, dCoords.lat, dCoords.lon);
    const mins = durationMins(distKm);

    for (const [from, to] of [[oCoords, dCoords], [dCoords, oCoords]]) {
      const key = `${from.iataCode}-${to.iataCode}`;
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);

      routesData.push({ id: createCuid(), originAirportId: from.id, destAirportId: to.id, distanceKm: distKm, durationMins: mins });
    }
  }
  await prisma.route.createMany({ data: routesData });
  return routesData;
}

async function seedUsers(dbAirports: any[], passengerCount = 200) {
  console.log("👤 Seeding passengers and staff...");
  const usersData = [];
  const accountsData = [];
  const staffProfilesData = [];
  const passwordHash = await bcrypt.hash(SEED_DEFAULT_PASSWORD, 12);
  const bkkAirport = dbAirports.find((a) => a.iataCode === "BKK") ?? dbAirports[0];
  const thaiAirports = dbAirports.filter((a) => ["BKK", "DMK", "HKT", "CNX"].includes(a.iataCode));

  const adminUserId = createCuid();
  usersData.push({ id: adminUserId, email: "admin@yokairlines.com", name: "YokAirlines Admin", phone: faker.phone.number(), role: Role.ADMIN, emailVerified: true, image: null });
  accountsData.push({ id: createCuid(), accountId: adminUserId, providerId: "credential", userId: adminUserId, password: passwordHash });
  staffProfilesData.push({ id: createCuid(), userId: adminUserId, employeeId: "YK0000", role: Role.ADMIN, rank: Rank.MANAGER, baseAirportId: bkkAirport.id, stationId: bkkAirport.id });

  for (let i = 0; i < passengerCount; i++) {
    const userId = createCuid();
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    usersData.push({ id: userId, email: faker.internet.email({ firstName, lastName }).toLowerCase(), name: `${firstName} ${lastName}`, phone: faker.phone.number(), role: Role.PASSENGER, emailVerified: Math.random() > 0.1, image: Math.random() > 0.6 ? faker.image.avatar() : null });
    accountsData.push({ id: createCuid(), accountId: userId, providerId: "credential", userId, password: passwordHash });
  }

  let empNum = 1000;
  for (const def of STAFF_DEFS) {
    for (let i = 0; i < def.count; i++) {
      empNum++;
      const employeeId = `YK${empNum}`;
      const userId = createCuid();
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();

      usersData.push({ id: userId, email: `${employeeId.toLowerCase()}@yokairlines.com`, name: `${firstName} ${lastName}`, phone: faker.phone.number(), role: def.role, emailVerified: true });
      accountsData.push({ id: createCuid(), accountId: userId, providerId: "credential", userId, password: passwordHash });
      staffProfilesData.push({ id: createCuid(), userId: userId, employeeId, role: def.role, rank: def.rank, baseAirportId: bkkAirport.id, stationId: pick(thaiAirports.length ? thaiAirports : dbAirports).id });
    }
  }

  for (const chunk of chunkArray(usersData, 5000)) await prisma.user.createMany({ data: chunk });
  for (const chunk of chunkArray(accountsData, 5000)) await prisma.account.createMany({ data: chunk });
  await prisma.staffProfile.createMany({ data: staffProfilesData });

  console.log("  👑 Admin login: admin@yokairlines.com");
  console.log(`  🔑 Seed credential password: ${SEED_DEFAULT_PASSWORD}`);

  return { passengers: usersData.filter((u) => u.role === Role.PASSENGER), staff: usersData.filter((u) => u.role !== Role.PASSENGER), staffProfiles: staffProfilesData };
}

function calcPrices(distanceKm: number) {
  const eco = Math.round(500 + distanceKm * 0.07);
  return { basePriceEconomy: eco, basePriceBusiness: Math.round(eco * 3.5), basePriceFirst: Math.round(eco * 7.0) };
}

async function seedFlights(routes: any[], aircraft: any[], aircraftTypes: any[], staffProfiles: any[]) {
  console.log("🛫 Seeding flights (30-day schedule)...");
  const activeAircraft = aircraft.filter((_, i) => i % 3 !== 2);
  const DEPARTURE_HOURS = [6, 9, 13, 17, 21];
  const usedCodes = new Set<string>();
  const typeIdToIata = new Map(aircraftTypes.map((t) => [t.id, t.iataCode]));

  const captains = staffProfiles.filter((p) => p.role === Role.PILOT && p.rank === Rank.CAPTAIN);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const flightsData = [];

  for (const route of routes) {
    const mins = route.durationMins ?? durationMins(route.distanceKm);
    const prices = calcPrices(route.distanceKm);

    for (let day = -7; day < 30; day++) {
      for (const hour of DEPARTURE_HOURS) {
        if (Math.random() > 0.6) continue;

        const ac = pick(activeAircraft);
        const departure = addDays(today, day);
        departure.setHours(hour, pick([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]), 0, 0);
        const arrival = addMinutes(departure, mins);

        let status: FlightStatus = FlightStatus.SCHEDULED;
        if (day < -1) status = FlightStatus.ARRIVED;
        else if (day === -1 || (day === 0 && hour < new Date().getHours())) {
          const roll = Math.random();
          status = roll > 0.92 ? FlightStatus.DELAYED : roll > 0.03 ? FlightStatus.DEPARTED : FlightStatus.DIVERTED;
        } else if (day === 0 && hour === new Date().getHours()) {
          status = Math.random() > 0.3 ? FlightStatus.BOARDING : FlightStatus.DELAYED;
        }

        const captainId = captains.length && Math.random() > 0.1 ? pick(captains).id : null;

        flightsData.push({
          id: createCuid(),
          flightCode: uniqueCode("YK", usedCodes, 5),
          routeId: route.id,
          aircraftId: ac.id,
          captainId: captainId,
          gate: `${pick(["A", "B", "C", "D", "E"])}${randInt(1, 30)}`,
          departureTime: departure,
          arrivalTime: arrival,
          status,
          basePriceEconomy: prices.basePriceEconomy,
          basePriceBusiness: prices.basePriceBusiness,
          basePriceFirst: prices.basePriceFirst,
          aircraftTypeIataCode: typeIdToIata.get(ac.aircraftTypeId) ?? "320", 
        });
      }
    }
  }

  for (const chunk of chunkArray(flightsData, 5000)) {
    const dbData = chunk.map(({ aircraftTypeIataCode, ...rest }) => rest);
    await prisma.flight.createMany({ data: dbData });
  }

  return flightsData;
}

async function seedBookings(passengers: any[], flights: any[], bookingCount = 400) {
  console.log("🎫 Seeding bookings, tickets & transactions...");

  const bookingsData: any[] = [];
  const ticketsData: any[] = [];
  const transactionsData: any[] = [];

  const FLUSH_THRESHOLD = 500;
  let totalBookingsCreated = 0;
  let totalTicketsCreated = 0;
  let totalTransactionsCreated = 0;

  const flushBuffers = async (force = false) => {
    if (!force && bookingsData.length < FLUSH_THRESHOLD && ticketsData.length < FLUSH_THRESHOLD && transactionsData.length < FLUSH_THRESHOLD) return;

    if (bookingsData.length > 0) {
      totalBookingsCreated += bookingsData.length;
      for (const chunk of chunkArray(bookingsData, 500)) await prisma.booking.createMany({ data: chunk });
      bookingsData.length = 0;
    }
    if (ticketsData.length > 0) {
      totalTicketsCreated += ticketsData.length;
      for (const chunk of chunkArray(ticketsData, 500)) await prisma.ticket.createMany({ data: chunk });
      ticketsData.length = 0;
    }
    if (transactionsData.length > 0) {
      totalTransactionsCreated += transactionsData.length;
      for (const chunk of chunkArray(transactionsData, 500)) await prisma.transaction.createMany({ data: chunk });
      transactionsData.length = 0;
    }
  };

  // ── Phase 1: Random bookings ─────────────────────────────────────────────
  const usedSeatsPerFlight = new Map<string, Set<string>>();
  const bookableFlights = flights.slice(0, Math.ceil(flights.length * 0.8));

  for (let i = 0; i < bookingCount; i++) {
    const user = pick(passengers);
    const flight = pick(bookableFlights);

    const hasFirst = aircraftHasClass(flight.aircraftTypeIataCode, TicketClass.FIRST_CLASS);
    const hasBiz = aircraftHasClass(flight.aircraftTypeIataCode, TicketClass.BUSINESS);
    
    let cls: TicketClass = TicketClass.ECONOMY;
    const classRoll = Math.random();
    if (hasFirst && classRoll > 0.92) cls = TicketClass.FIRST_CLASS;
    else if (hasBiz && classRoll > 0.7) cls = TicketClass.BUSINESS;

    const pricePerTicket = cls === TicketClass.FIRST_CLASS ? Number(flight.basePriceFirst) : cls === TicketClass.BUSINESS ? Number(flight.basePriceBusiness) : Number(flight.basePriceEconomy);
    const paxCount = randInt(1, 4);

    const statusRoll = Math.random();
    const bookingStatus = statusRoll > 0.92 ? BookingStatus.CANCELLED : statusRoll > 0.05 ? BookingStatus.CONFIRMED : BookingStatus.PENDING;
    const txStatus = bookingStatus === BookingStatus.CANCELLED ? TransactionStatus.REFUNDED : bookingStatus === BookingStatus.CONFIRMED ? TransactionStatus.SUCCESS : TransactionStatus.PENDING;
    const txType = txStatus === TransactionStatus.REFUNDED ? TransactionType.REFUND : TransactionType.PAYMENT;

    const pmType = pick(PAYMENT_METHODS);
    const pmRef = pmType === "CARD" ? `**** **** **** ${randInt(1000, 9999)}` : `***-***-${randInt(1000, 9999)}`;
    const stripeIntentId = txStatus !== TransactionStatus.PENDING ? `pi_${faker.string.alphanumeric(24)}` : null;

    if (!usedSeatsPerFlight.has(flight.id)) usedSeatsPerFlight.set(flight.id, new Set());
    const flightSeats = usedSeatsPerFlight.get(flight.id)!;

    const allValid = allSeatsForCabin(flight.aircraftTypeIataCode, cls);
    const remaining = allValid.filter((s) => !flightSeats.has(s));
    if (remaining.length < paxCount) continue;

    const bookingId = createCuid();
    let ticketsAssigned = 0;

    for (let p = 0; p < paxCount; p++) {
      let seat: string | null = null;
      for (let attempt = 0; attempt < 50; attempt++) {
        const candidate = generateSeatForAircraft(flight.aircraftTypeIataCode, cls);
        if (candidate && !flightSeats.has(candidate)) {
          seat = candidate;
          break;
        }
      }
      if (!seat) {
        const stillFree = allValid.filter((s) => !flightSeats.has(s));
        if (stillFree.length === 0) break;
        seat = pick(stillFree);
      }
      flightSeats.add(seat);

      const checkedIn = bookingStatus === BookingStatus.CONFIRMED && Math.random() > 0.45;

      ticketsData.push({
        id: createCuid(), bookingId, flightId: flight.id, firstName: faker.person.firstName(), lastName: faker.person.lastName(),
        dateOfBirth: faker.date.birthdate({ min: 18, max: 75, mode: "age" }), passportNumber: faker.string.alphanumeric({ length: 9, casing: "upper" }),
        nationality: pick(PASSENGER_NATIONALITIES), gender: pick(["MALE", "FEMALE"]), seatNumber: seat, class: cls, price: pricePerTicket,
        checkedIn, checkedInAt: checkedIn ? faker.date.recent({ days: 2 }) : null, boardingPass: checkedIn ? `BP-${faker.string.alphanumeric({ length: 12, casing: "upper" })}` : null,
      });
      ticketsAssigned++;
    }

    if (ticketsAssigned === 0) continue;

    bookingsData.push({
      id: bookingId, bookingRef: makeBookingRef(), userId: user.id, flightId: flight.id, status: bookingStatus,
      totalPrice: pricePerTicket * ticketsAssigned, currency: "THB", contactEmail: faker.internet.email().toLowerCase(), contactPhone: faker.phone.number(),
    });

    transactionsData.push({
      id: createCuid(), bookingId, amount: pricePerTicket * ticketsAssigned, currency: "THB", status: txStatus, type: txType,
      paymentMethodType: pmType, paymentMethodRef: pmRef, stripePaymentIntentId: stripeIntentId,
      stripeChargeId: stripeIntentId ? `ch_${faker.string.alphanumeric(24)}` : null,
      refundedAt: txType === TransactionType.REFUND ? faker.date.recent({ days: 10 }) : null,
      refundReason: txType === TransactionType.REFUND ? pick(REFUND_REASONS) : null,
    });

    await flushBuffers();
  }

  await flushBuffers(true);
  // OPTIMIZATION: Do NOT clear usedSeatsPerFlight here.

  // ── Phase 2: Top-up only +5% seats per flight ────────────────────────────
  console.log("  📊 Top-up flights by +5% seats...");
  let extraReservedSeatCount = 0;

  for (const flight of flights) {
    const allValidSeats = allSeatsForAircraft(flight.aircraftTypeIataCode);
    if (allValidSeats.length === 0) continue;

    // OPTIMIZATION: Read directly from Phase 1 Map memory cache instead of DB queries
    const takenSeats = usedSeatsPerFlight.get(flight.id) ?? new Set<string>();

    const topUpSeats = Math.round(allValidSeats.length * 0.05);
    const freeSeats = allValidSeats.filter((s) => !takenSeats.has(s));
    const needed = Math.min(topUpSeats, freeSeats.length);
    if (needed === 0 || freeSeats.length === 0) continue;

    // OPTIMIZATION: Partial Fisher-Yates (only loop 'needed' times)
    const shuffleLimit = Math.min(needed, freeSeats.length);
    for (let i = freeSeats.length - 1; i > freeSeats.length - 1 - shuffleLimit; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [freeSeats[i], freeSeats[j]] = [freeSeats[j], freeSeats[i]];
    }
    const seatsToReserve = freeSeats.slice(-shuffleLimit);

    for (const seat of seatsToReserve) {
      const cls = ticketClassForSeat(flight.aircraftTypeIataCode, seat);
      if (!cls) continue;

      const user = pick(passengers);
      const bookingId = createCuid();
      const price = cls === TicketClass.FIRST_CLASS ? Number(flight.basePriceFirst) : cls === TicketClass.BUSINESS ? Number(flight.basePriceBusiness) : Number(flight.basePriceEconomy);

      bookingsData.push({ id: bookingId, bookingRef: makeBookingRef(), userId: user.id, flightId: flight.id, status: BookingStatus.PENDING, totalPrice: price, currency: "THB", contactEmail: faker.internet.email().toLowerCase(), contactPhone: faker.phone.number() });
      ticketsData.push({ id: createCuid(), bookingId, flightId: flight.id, firstName: faker.person.firstName(), lastName: faker.person.lastName(), dateOfBirth: faker.date.birthdate({ min: 18, max: 75, mode: "age" }), passportNumber: faker.string.alphanumeric({ length: 9, casing: "upper" }), nationality: pick(PASSENGER_NATIONALITIES), gender: pick(["MALE", "FEMALE"]), seatNumber: seat, class: cls, price, checkedIn: false, checkedInAt: null, boardingPass: null });
      transactionsData.push({ id: createCuid(), bookingId, amount: price, currency: "THB", status: TransactionStatus.PENDING, type: TransactionType.PAYMENT, paymentMethodType: null, paymentMethodRef: null, stripePaymentIntentId: null, stripeChargeId: null, refundedAt: null, refundReason: null });

      extraReservedSeatCount++;
    }
    await flushBuffers();
  }

  await flushBuffers(true);
  console.log(`  ✅ ${totalBookingsCreated} bookings | ${totalTicketsCreated} tickets | ${totalTransactionsCreated} transactions | ${extraReservedSeatCount} top-up seats`);
}

async function seedMongoData(passengers: any[], staffProfiles: any[], flights: any[]) {
  if (!MONGO_URI) {
    console.log("🟡 Mongo seed skipped (MONGO_USER_DATABASE_URL / MONGODB_URI not set)");
    return;
  }

  console.log("🍃 Seeding Mongo collections...");

  await mongoose.connect(MONGO_URI, { bufferCommands: false });

  try {
    await Promise.all([
      CrewProfile.deleteMany({}),
      FlightOpsLog.deleteMany({}),
      IssueReport.deleteMany({}),
      PaymentLog.deleteMany({}),
    ]);

    // CrewProfile docs for crew roles only
    const crewRoles = new Set([Role.PILOT, Role.CABIN_CREW, Role.GROUND_STAFF, Role.MECHANIC]);
    const crewDocs = staffProfiles
      .filter((s: any) => crewRoles.has(s.role))
      .map((s: any) => ({
        userId: s.userId,
        nickname: faker.person.firstName(),
        languages: faker.helpers.arrayElements(["TH", "EN", "JP", "CN"], randInt(1, 3)),
        certifications: [
          {
            name: faker.helpers.arrayElement(["Safety", "First Aid", "ETOPS", "CRM"]),
            expireDate: faker.date.future({ years: 3 }),
          },
        ],
        flightHours: randInt(0, 12000),
      }));

    if (crewDocs.length) {
      await CrewProfile.insertMany(crewDocs, { ordered: false });
    }

    // FlightOpsLog docs (sample subset)
    const captainUserIds = new Set(
      staffProfiles
        .filter((s: any) => s.role === Role.PILOT && s.rank === Rank.CAPTAIN)
        .map((s: any) => s.userId),
    );

    const captainUsers = await prisma.user.findMany({
      where: { id: { in: Array.from(captainUserIds) } },
      select: { id: true, name: true },
    });
    const captainNameMap = new Map(captainUsers.map((u) => [u.id, u.name]));

    const opsFlights = faker.helpers.arrayElements(flights, Math.min(flights.length, 180));
    const opsDocs = opsFlights.map((f: any) => ({
      flightId: f.id,
      captainName: (f.captainId && captainNameMap.get(f.captainId)) || "Unassigned Captain",
      gateChanges:
        Math.random() > 0.6
          ? [
              {
                from: `${faker.helpers.arrayElement(["A", "B", "C", "D"])}${randInt(1, 20)}`,
                to: `${faker.helpers.arrayElement(["A", "B", "C", "D"])}${randInt(1, 20)}`,
                time: faker.date.recent({ days: 3 }),
                reason: faker.helpers.arrayElement(["Congestion", "Operational", "Weather"]),
              },
            ]
          : [],
      weatherConditions:
        Math.random() > 0.5
          ? {
              origin: faker.helpers.arrayElement(["Clear", "Rain", "Storm", "Cloudy"]),
              destination: faker.helpers.arrayElement(["Clear", "Rain", "Storm", "Cloudy"]),
            }
          : undefined,
      incidents: Math.random() > 0.85 ? ["Minor operational delay"] : [],
      maintenanceChecklist: {
        fuelChecked: true,
        doorsChecked: true,
        tiresChecked: Math.random() > 0.02,
      },
    }));

    if (opsDocs.length) {
      await FlightOpsLog.insertMany(opsDocs, { ordered: false });
    }

    // IssueReport docs from passengers
    const issueUsers = faker.helpers.arrayElements(passengers, Math.min(passengers.length, 120));
    const issueDocs = issueUsers.map((u: any) => ({
      userId: u.id,
      category: faker.helpers.arrayElement(["booking", "payment", "flight", "baggage", "other"]),
      description: faker.lorem.sentence(),
      attachments: Math.random() > 0.8 ? [faker.internet.url()] : [],
      status: faker.helpers.arrayElement(["open", "investigating", "resolved", "closed"]),
    }));

    if (issueDocs.length) {
      await IssueReport.insertMany(issueDocs, { ordered: false });
    }

    // PaymentLog docs from existing Postgres transactions
    const txRows = await prisma.transaction.findMany({
      take: 400,
      orderBy: { createdAt: "desc" },
      select: {
        bookingId: true,
        amount: true,
        currency: true,
        status: true,
        paymentMethodType: true,
        paymentMethodRef: true,
        stripePaymentIntentId: true,
        stripeChargeId: true,
        failureCode: true,
        failureMessage: true,
        refundReason: true,
      },
    });

    const statusMap: Record<string, "pending" | "success" | "failed" | "refunded"> = {
      PENDING: "pending",
      SUCCESS: "success",
      FAILED: "failed",
      REFUNDED: "refunded",
    };

    const paymentDocs = txRows.map((t) => ({
      bookingId: t.bookingId,
      amount: Number(t.amount),
      currency: t.currency,
      status: statusMap[t.status],
      gateway:
        t.paymentMethodType === "PROMPTPAY"
          ? "promptpay"
          : t.paymentMethodType === "TRUEMONEY"
            ? "truemoney"
            : t.paymentMethodType === "CARD"
              ? "stripe"
              : "other",
      rawResponse: {
        paymentMethodRef: t.paymentMethodRef,
        stripePaymentIntentId: t.stripePaymentIntentId,
        stripeChargeId: t.stripeChargeId,
        failureCode: t.failureCode,
        failureMessage: t.failureMessage,
        refundReason: t.refundReason,
      },
    }));

    if (paymentDocs.length) {
      await PaymentLog.insertMany(paymentDocs, { ordered: false });
    }

    console.log(
      `  ✅ Mongo seeded | crewProfiles=${crewDocs.length} | flightOpsLogs=${opsDocs.length} | issues=${issueDocs.length} | paymentLogs=${paymentDocs.length}`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌏  YokAirlines — Database Seed (Optimized)\n" + "─".repeat(50));

  console.log("🧹 Clearing existing data...");
  try {
    await (prisma as any).activeEmergencyTask.deleteMany();
    await (prisma as any).emergencyIncident.deleteMany();
    await (prisma as any).emergencyTaskTemplate.deleteMany();
    await (prisma as any).emergencyType.deleteMany();
  } catch {}

  // Deletions kept sequential because of cascading foreign keys
  await prisma.transaction.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.flight.deleteMany();
  await prisma.route.deleteMany();
  await prisma.aircraft.deleteMany();
  await prisma.seatLayoutCabin.deleteMany();
  await prisma.seatLayoutTemplate.deleteMany();
  await prisma.aircraftType.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.airport.deleteMany();
  console.log("   ✅ Database cleared\n");

  // OPTIMIZATION: Fetch OurAirports and Seed Types simultaneously
  const [airportCoords, aircraftTypes] = await Promise.all([
    fetchOurAirports(),
    seedAircraftTypes()
  ]);

  await seedSeatLayouts(aircraftTypes);
  const aircraft = await seedAircraft(aircraftTypes);
  const dbAirports = await seedAirports(airportCoords);
  const routes = await seedRoutes(airportCoords);

  const { passengers, staffProfiles } = await seedUsers(dbAirports);
  const flights = await seedFlights(routes, aircraft, aircraftTypes, staffProfiles);

  // OPTIMIZATION: Load layouts to build the in-memory cache exactly once
  const loadedLayouts = await loadSeatLayouts();
  buildSeatCache(loadedLayouts);
  console.log(`💺 Loaded and cached ${loadedLayouts.size} seat layouts`);

  await seedBookings(passengers, flights);
  await seedMongoData(passengers, staffProfiles, flights);

  console.log("\n" + "─".repeat(50));
  console.log("✅  Seed complete!\n" + "─".repeat(50) + "\n");
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