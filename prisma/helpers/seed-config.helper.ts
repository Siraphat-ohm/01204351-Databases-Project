import { Rank, Role } from "@/generated/prisma/client";

export const OURAIRPORTS_CSV_URL =
  "https://davidmegginson.github.io/ourairports-data/airports.csv";

export const ASIAN_COUNTRIES = new Set([
  "TH", "SG", "MY", "ID", "PH", "VN", "KH", "LA", "MM",
  "JP", "KR", "CN", "HK", "TW", "IN", "AE", "QA",
]);

export const ALLOWED_AIRPORT_TYPES = new Set(["large_airport", "medium_airport"]);

export const ROUTE_PAIRS: [string, string][] = [
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

export const AIRCRAFT_TYPE_DEFS = [
  { iataCode: "320", model: "Airbus A320-200", capacityEco: 150, capacityBiz: 12, capacityFirst: 0 },
  { iataCode: "321", model: "Airbus A321-200", capacityEco: 180, capacityBiz: 16, capacityFirst: 0 },
  { iataCode: "333", model: "Airbus A330-300", capacityEco: 252, capacityBiz: 36, capacityFirst: 8 },
  { iataCode: "359", model: "Airbus A350-900", capacityEco: 270, capacityBiz: 42, capacityFirst: 10 },
  { iataCode: "738", model: "Boeing 737-800", capacityEco: 162, capacityBiz: 12, capacityFirst: 0 },
  { iataCode: "789", model: "Boeing 787-9", capacityEco: 252, capacityBiz: 28, capacityFirst: 0 },
  { iataCode: "77W", model: "Boeing 777-300ER", capacityEco: 300, capacityBiz: 42, capacityFirst: 8 },
  { iataCode: "AT7", model: "ATR 72-600", capacityEco: 72, capacityBiz: 0, capacityFirst: 0 },
];

export const AIRCRAFT_COUNTS: Record<string, number> = {
  "320": 6, "321": 4, "333": 3, "359": 2, "738": 5, "789": 3, "77W": 2, AT7: 4,
};

export const SEED_DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "Passw0rd123!";

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

export const SEAT_LAYOUT_DEFS: {
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

export const TAIL_PREFIX = "HS-YK";
export const TAIL_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ".split("");

export const STAFF_DEFS: { role: Role; rank: Rank; count: number }[] = [
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

export const FALLBACK_AIRPORTS = [
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

export const PAYMENT_METHODS = ["CARD", "PROMPTPAY", "TRUEMONEY", "RABBIT_LINE_PAY"] as const;
export const PASSENGER_NATIONALITIES = ["TH", "SG", "JP", "US", "GB", "CN", "KR", "AU", "DE", "FR"];
export const REFUND_REASONS = ["Passenger request", "Flight cancelled by airline", "Schedule change", "Medical reason", "Visa denied"];