import fs from "fs";
import { randomUUID } from "crypto";
import path from "path";
import {
  PrismaClient,
  AircraftStatus,
  Role,
  Rank,
  FlightStatus,
  BookingStatus,
  TicketClass,
  EmergencyStatus,
} from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// --- File Paths ---
const dataDir = path.join(process.cwd(), "prisma/data");
const airportsFilePath = path.join(dataDir, "airports.json");
const planesFilePath = path.join(dataDir, "planes.json");
const routesFilePath = path.join(dataDir, "routes.json");
const bookingsFilePath = path.join(dataDir, "bookings.json");
const emergencyTypesFilePath = path.join(dataDir, "emergency-types.json");

const adminsFilePath = path.join(dataDir, "admins.json");
const pilotsFilePath = path.join(dataDir, "pilots.json");
const crewsFilePath = path.join(dataDir, "crews.json");
const passengersFilePath = path.join(dataDir, "passengers.json");

// --- Interfaces ---
interface AirportData {
  name: string;
  city: string;
  country: string;
  iataCode: string;
}

interface PlaneTypeData {
  model: string;
  code: string;
  capacityEco: number;
  capacityBiz: number;
}

interface RouteData {
  origin: string;
  dest: string;
  distance: number;
  duration: number;
}

interface UserSeed {
  email: string;
  password: string;
  passwordPlaintext?: string;
  role: Role;
  name: string;
  firstName: string;
  lastName: string;
  phone?: string;
  staffProfile?: {
    employeeId: string;
    role: Role;
    rank?: Rank;
  };
  mongoProfileData?: Record<string, any>;
}

interface FlightSeed {
  flightCode: string;
  origin: string;
  dest: string;
  departureTime: string;
  arrivalTime: string;
  status: string;
  gate: string;
  basePrice: number;
}

interface TicketSeed {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  passportNumber: string | null;
  gender: string;
  seatNumber: string;
  class: string;
  price: number;
}

interface BookingSeed {
  bookingRef: string;
  flightCode: string;
  status: string;
  totalPrice: number;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
  tickets: TicketSeed[];
}

interface EmergencyTaskTemplateSeed {
  role: Role;
  description: string;
  priority: number;
}

interface EmergencyTypeSeed {
  code: string;
  name: string;
  description: string;
  templates: EmergencyTaskTemplateSeed[];
}

// --- Utility Functions ---
function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

function readJsonFile<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

// --- Seeding Functions ---

async function seedAirports() {
  console.log("✈️ Seeding Airports...");
  const airports = readJsonFile<AirportData>(airportsFilePath);
  if (!airports.length) return;

  const airportData = airports
    .filter(
      (a) => a.iataCode && a.iataCode !== "\\N" && a.iataCode.length === 3,
    )
    .map((a) => ({
      iataCode: a.iataCode,
      name: a.name || "Unknown Airport",
      city: a.city || "Unknown City",
      country: a.country || "Unknown Country",
    }));

  const chunks = chunkArray(airportData, 500);
  for (const chunk of chunks) {
    await prisma.airport.createMany({ data: chunk, skipDuplicates: true });
  }
  console.log(`   ✅ Processed ${airportData.length} valid airports`);
}

async function seedAircraft() {
  console.log("🛩️ Seeding Aircraft...");
  const planeTypes = readJsonFile<PlaneTypeData>(planesFilePath);
  if (!planeTypes.length) return;

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  for (const [index, typeData] of planeTypes.entries()) {
    const aircraftType = await prisma.aircraftType.upsert({
      where: { iataCode: typeData.code },
      update: {
        model: typeData.model,
        capacityEco: typeData.capacityEco,
        capacityBiz: typeData.capacityBiz,
      },
      create: {
        iataCode: typeData.code,
        model: typeData.model,
        capacityEco: typeData.capacityEco,
        capacityBiz: typeData.capacityBiz,
      },
    });

    const fleetLetter = alphabet[index % 26];
    const planesData = [];

    for (let i = 0; i < 3; i++) {
      const sequenceLetter = alphabet[i];
      const tailNumber = `HS-Y${fleetLetter}${sequenceLetter}`;
      planesData.push({
        tailNumber,
        aircraftTypeId: aircraftType.id,
        status: AircraftStatus.ACTIVE,
      });
    }

    await prisma.aircraft.createMany({
      data: planesData,
      skipDuplicates: true,
    });
  }
  console.log("   ✅ Aircraft seeded");
}

async function seedRoutes() {
  console.log("🗺️ Seeding Routes...");
  const routes = readJsonFile<RouteData>(routesFilePath);
  if (!routes.length) return;

  const dbAirports = await prisma.airport.findMany({
    select: { id: true, iataCode: true },
  });
  const airportMap = new Map(dbAirports.map((a) => [a.iataCode, a.id]));

  const validRoutes = routes
    .map((route) => {
      const originId = airportMap.get(route.origin);
      const destId = airportMap.get(route.dest);
      if (!originId || !destId) return null;

      return {
        originAirportId: originId,
        destAirportId: destId,
        distanceKm: route.distance,
        durationMins: route.duration,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const chunks = chunkArray(validRoutes, 500);
  for (const chunk of chunks) {
    await prisma.route.createMany({ data: chunk, skipDuplicates: true });
  }
  console.log(`   ✅ Processed ${validRoutes.length} routes`);
}

async function seedUsersFromFile(filePath: string) {
  const fileName = path.basename(filePath);
  const users = readJsonFile<UserSeed>(filePath);
  if (!users.length) {
    console.log(`   ⚠️  No users found in ${fileName}`);
    return;
  }

  const bkk = await prisma.airport.findUnique({
    where: { iataCode: "BKK" },
  });

  let successCount = 0;

  for (const u of users) {
    try {
      await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          // username: u.username,
          email: u.email,
          password: u.passwordHash,
          role: u.role,
          name: u.name,
          firstName: u.firstName,
          lastName: u.lastName,
          phone: u.phone,
          ...(u.staffProfile && {
            staffProfile: {
              create: {
                employeeId: u.staffProfile.employeeId,
                role: u.role,
                rank: u.staffProfile.rank,
                baseAirportId: bkk?.id,
              },
            },
          }),
        },
      });
      successCount++;
    } catch (e: any) {
      if (e?.code === "P2002") {
        console.log(
          `   ⚠️  Skipping duplicate user: ${u.email} (${e.meta?.target})`,
        );
      } else {
        throw e; // re-throw anything unexpected
      }
    }
  }
}

async function seedAllUsers() {
  console.log("👥 Seeding Users...");
  await seedUsersFromFile(adminsFilePath);
  await seedUsersFromFile(pilotsFilePath);
  await seedUsersFromFile(crewsFilePath);
  await seedUsersFromFile(passengersFilePath);
}

async function seedFlights() {
  console.log("🛫 Seeding Flights...");

  const flightFiles = fs
    .readdirSync(dataDir)
    .filter((f) => f.startsWith("flights") && f.endsWith(".json"))
    .sort();

  if (flightFiles.length === 0) {
    console.log("   ⚠️  No flight JSON files found");
    return;
  }

  const routes = await prisma.route.findMany({
    include: {
      origin: { select: { iataCode: true } },
      destination: { select: { iataCode: true } },
    },
  });

  const routeMap = new Map(
    routes.map((r) => [`${r.origin.iataCode}-${r.destination.iataCode}`, r.id]),
  );

  const aircraft = await prisma.aircraft.findMany({
    where: { status: "ACTIVE" },
  });
  const pilots = await prisma.staffProfile.findMany({
    where: { role: "PILOT", rank: { in: ["CAPTAIN", "FIRST_OFFICER"] } },
  });

  let totalSuccessCount = 0;
  let totalSkipCount = 0;

  for (const fileName of flightFiles) {
    console.log(`   📂 Processing ${fileName}...`);
    const flights = readJsonFile<FlightSeed>(path.join(dataDir, fileName));

    const batchSize = 5000;
    let fileSuccessCount = 0;

    for (let i = 0; i < flights.length; i += batchSize) {
      const batch = flights.slice(i, i + batchSize);

      const flightData = batch
        .map((flight) => {
          const routeId = routeMap.get(`${flight.origin}-${flight.dest}`);
          if (!routeId) {
            totalSkipCount++;
            return null;
          }

          const randomAircraft =
            aircraft[Math.floor(Math.random() * aircraft.length)];
          let captainId = null;
          if (pilots.length > 0 && Math.random() > 0.3) {
            const randomPilot =
              pilots[Math.floor(Math.random() * pilots.length)];
            captainId = randomPilot.id;
          }

          return {
            flightCode: flight.flightCode,
            routeId,
            aircraftId: randomAircraft?.id,
            captainId,
            gate: flight.gate,
            departureTime: new Date(flight.departureTime),
            arrivalTime: new Date(flight.arrivalTime),
            status: flight.status as FlightStatus,
            basePrice: flight.basePrice,
          };
        })
        .filter((f): f is NonNullable<typeof f> => f !== null);

      if (flightData.length) {
        await prisma.flight.createMany({
          data: flightData,
          skipDuplicates: true,
        });
        fileSuccessCount += flightData.length;
        totalSuccessCount += flightData.length;
      }
    }
    console.log(
      `      ↳ Inserted ${fileSuccessCount} records from ${fileName}`,
    );
  }

  console.log(`   ✅ Total flights created: ${totalSuccessCount}`);
  if (totalSkipCount > 0)
    console.log(`   ⚠️ Skipped ${totalSkipCount} unmapped routes`);
}

async function seedBookings() {
  console.log("🎫 Seeding Bookings...");

  const bookings = readJsonFile<BookingSeed>(bookingsFilePath);
  if (!bookings.length) {
    console.log("   ⚠️  No bookings found");
    return;
  }

  const flights = await prisma.flight.findMany({
    select: { id: true, flightCode: true },
  });
  const flightMap = new Map(flights.map((f) => [f.flightCode, f.id]));

  const passengers = await prisma.user.findMany({
    where: { role: "PASSENGER" },
    select: { id: true },
  });

  if (passengers.length === 0) {
    console.log("   ⚠️  No passengers found");
    return;
  }

  let successCount = 0;
  let skipCount = 0;
  let ticketCount = 0;

  for (const booking of bookings) {
    const flightId = flightMap.get(booking.flightCode);

    if (!flightId) {
      skipCount++;
      continue;
    }

    const randomPassenger =
      passengers[Math.floor(Math.random() * passengers.length)];

    try {
      await prisma.booking.create({
        data: {
          bookingRef: booking.bookingRef,
          userId: randomPassenger.id,
          flightId: flightId,
          status: booking.status as BookingStatus,
          totalPrice: booking.totalPrice,
          contactEmail: booking.contactEmail,
          contactPhone: booking.contactPhone,
          createdAt: new Date(booking.createdAt),
          tickets: {
            create: booking.tickets.map((ticket) => ({
              firstName: ticket.firstName,
              lastName: ticket.lastName,
              dateOfBirth: ticket.dateOfBirth
                ? new Date(ticket.dateOfBirth)
                : null,
              passportNumber: ticket.passportNumber,
              gender: ticket.gender,
              seatNumber: ticket.seatNumber,
              class: ticket.class as TicketClass,
              price: ticket.price,
            })),
          },
        },
      });

      successCount++;
      ticketCount += booking.tickets.length;
    } catch (error) {
      skipCount++;
    }

    if (successCount % 50 === 0 && successCount > 0) {
      console.log(`   📊 Progress: ${successCount} bookings processed`);
    }
  }

  console.log(
    `   ✅ Created ${successCount} bookings with ${ticketCount} tickets`,
  );
  if (skipCount > 0) console.log(`   ⚠️ Skipped ${skipCount} bookings`);
}

async function seedEmergencyTypes() {
  console.log("🚨 Seeding Emergency Types...");
  const emergencyTypes = readJsonFile<EmergencyTypeSeed>(
    emergencyTypesFilePath,
  );

  if (!emergencyTypes.length) {
    console.log("   ⚠️  No emergency types found");
    return;
  }

  let typesCreated = 0;
  let templatesCreated = 0;

  for (const emergencyType of emergencyTypes) {
    const created = await prisma.emergencyType.upsert({
      where: { code: emergencyType.code },
      update: {
        name: emergencyType.name,
        description: emergencyType.description,
      },
      create: {
        code: emergencyType.code,
        name: emergencyType.name,
        description: emergencyType.description,
        templates: {
          create: emergencyType.templates.map((template) => ({
            role: template.role,
            description: template.description,
            priority: template.priority,
          })),
        },
      },
      include: { templates: true },
    });

    typesCreated++;

    if (created.templates.length === 0) {
      await prisma.emergencyTaskTemplate.deleteMany({
        where: { emergencyTypeId: created.id },
      });

      await prisma.emergencyTaskTemplate.createMany({
        data: emergencyType.templates.map((template) => ({
          emergencyTypeId: created.id,
          role: template.role,
          description: template.description,
          priority: template.priority,
        })),
      });
      templatesCreated += emergencyType.templates.length;
    } else {
      templatesCreated += created.templates.length;
    }
  }

  console.log(
    `   ✅ Processed ${typesCreated} emergency types with ${templatesCreated} templates`,
  );
}

async function seedEmergencyIncidents() {
  console.log("🚨 Seeding Emergency Incidents (testing)...");

  const flights = await prisma.flight.findMany({
    where: { status: { in: ["DEPARTED", "BOARDING", "ARRIVED"] } },
    take: 20,
  });

  if (flights.length === 0) {
    console.log("   ⚠️  No suitable flights found");
    return;
  }

  const emergencyTypes = await prisma.emergencyType.findMany({
    include: { templates: true },
  });

  if (emergencyTypes.length === 0) {
    console.log("   ⚠️  No emergency types found");
    return;
  }

  let incidentsCreated = 0;
  let tasksCreated = 0;
  const numIncidents = Math.floor(Math.random() * 6) + 5;

  for (let i = 0; i < numIncidents && i < flights.length; i++) {
    const flight = flights[i];

    const weights = emergencyTypes.map((type) => {
      if (type.code.startsWith("MED-002")) return 30;
      if (type.code.startsWith("MED-001")) return 10;
      if (type.code.startsWith("SEC-001")) return 15;
      if (type.code.startsWith("WX-001")) return 20;
      if (type.code.startsWith("TECH")) return 5;
      return 1;
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    let selectedType = emergencyTypes[0];

    for (let j = 0; j < emergencyTypes.length; j++) {
      random -= weights[j];
      if (random <= 0) {
        selectedType = emergencyTypes[j];
        break;
      }
    }

    const status: EmergencyStatus = Math.random() < 0.8 ? "RESOLVED" : "ACTIVE";
    const declaredAt = new Date(
      flight.departureTime.getTime() + Math.random() * 3600000,
    );
    const resolvedAt =
      status === "RESOLVED"
        ? new Date(declaredAt.getTime() + Math.random() * 1800000)
        : null;

    const incident = await prisma.emergencyIncident.create({
      data: {
        flightId: flight.id,
        emergencyTypeId: selectedType.id,
        status: status,
        declaredAt: declaredAt,
        resolvedAt: resolvedAt,
        tasks: {
          create: selectedType.templates.map((template) => ({
            description: template.description,
            assignedRole: template.role,
            isCompleted: status === "RESOLVED" ? Math.random() > 0.1 : false,
            completedAt:
              status === "RESOLVED" && Math.random() > 0.1
                ? new Date(declaredAt.getTime() + Math.random() * 1200000)
                : null,
          })),
        },
      },
      include: { tasks: true },
    });

    incidentsCreated++;
    tasksCreated += incident.tasks.length;
  }

  console.log(
    `   ✅ Created ${incidentsCreated} incidents with ${tasksCreated} tasks`,
  );
}

async function seedAccounts() {
  console.log("🔐 Seeding credential accounts for seeded users...");

  const allUsers = await prisma.user.findMany();
  const users = allUsers.filter((u) => u.password !== null);

  if (!users.length) {
    console.log("   ⚠️  No users with password found");
    return;
  }

  let successCount = 0;

  for (const user of users) {
    console.log(user);
    const existingAccount = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });

    if (existingAccount) continue;

    await prisma.account.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: user.password!,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    successCount++;
  }

  console.log(`   ✅ Created ${successCount} credential accounts`);
}

async function main() {
  await seedAirports();
  await seedAircraft();
  await seedRoutes();
  await seedAllUsers();
  await seedFlights();
  await seedBookings();
  await seedEmergencyTypes();
  await seedEmergencyIncidents();
  await seedAccounts();
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

// --- END OF FILE ---
