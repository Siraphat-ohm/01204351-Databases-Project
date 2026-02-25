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
import { seedMongoData } from "./helpers/mongo-seed.helper";
import { seedSqlData } from "./helpers/sql-seed.helper";
import {
  AIRCRAFT_COUNTS,
  AIRCRAFT_TYPE_DEFS,
  ALLOWED_AIRPORT_TYPES,
  ASIAN_COUNTRIES,
  FALLBACK_AIRPORTS,
  OURAIRPORTS_CSV_URL,
  PASSENGER_NATIONALITIES,
  PAYMENT_METHODS,
  REFUND_REASONS,
  ROUTE_PAIRS,
  SEAT_LAYOUT_DEFS,
  SEED_DEFAULT_PASSWORD,
  STAFF_DEFS,
  TAIL_LETTERS,
  TAIL_PREFIX,
} from "./helpers/seed-config.helper";
import {
  addDays,
  addMinutes,
  chunkArray,
  createCuid,
  durationMins,
  haversineKm,
  makeBookingRef,
  pick,
  randInt,
  uniqueCode,
} from "./helpers/seed-utils.helper";

const pg = require("pg") as typeof import("pg");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌏  YokAirlines — Database Seed (Optimized)\n" + "─".repeat(50));

  const { passengers, staffProfiles, flights } = await seedSqlData(prisma, {
    fetchOurAirports,
    seedAircraftTypes,
    seedSeatLayouts,
    seedAircraft,
    seedAirports,
    seedRoutes,
    seedUsers,
    seedFlights,
    loadSeatLayouts,
    buildSeatCache,
    seedBookings,
  });

  await seedMongoData(prisma, passengers, staffProfiles, flights);

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