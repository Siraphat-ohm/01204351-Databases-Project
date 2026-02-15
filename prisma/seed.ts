import fs from "fs";
import path from "path";
import {
  PrismaClient,
  AircraftStatus,
  Role,
  Rank,
  FlightStatus,
} from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

const airportsFilePath = path.join(process.cwd(), "prisma/data/airports.json");
const planesFilePath = path.join(process.cwd(), "prisma/data/planes.json");
const routesFilePath = path.join(process.cwd(), "prisma/data/routes.json");
const countriesFilePath = path.join(
  process.cwd(),
  "prisma/data/countries.json",
);
const flightsFilePath = path.join(process.cwd(), "prisma/data/flights.json");

const adminsFilePath = path.join(process.cwd(), "prisma/data/admins.json");
const pilotsFilePath = path.join(process.cwd(), "prisma/data/pilots.json");
const crewsFilePath = path.join(process.cwd(), "prisma/data/crews.json");
const passengersFilePath = path.join(
  process.cwd(),
  "prisma/data/passengers.json",
);

interface CountryData {
  name: string;
  code: string;
}

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
  username: string;
  email: string;
  passwordHash: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone?: string;
  staffProfile?: {
    employeeId: string;
    rank?: Rank;
    licenseNumber?: string;
    flightHours?: number;
    skills?: string[];
  };
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

async function seedCountries() {
  const countries = readJsonFile<CountryData>(countriesFilePath);
  if (!countries.length) return;

  await prisma.country.createMany({
    data: countries.map((c) => ({
      code: c.code,
      name: c.name,
    })),
    skipDuplicates: true,
  });

  console.log(`Processed ${countries.length} countries`);
}

async function seedAirports() {
  const airports = readJsonFile<AirportData>(airportsFilePath);
  if (!airports.length) return;

  const airportData = airports.map((a) => ({
    iataCode: a.iataCode,
    name: a.name,
    city: a.city,
    country: a.country,
  }));

  const chunks = chunkArray(airportData, 500);

  for (const chunk of chunks) {
    await prisma.airport.createMany({
      data: chunk,
      skipDuplicates: true,
    });
  }

  console.log(`Processed ${airports.length} airports`);
}

async function seedAircraft() {
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

  console.log("Aircraft seeded");
}

async function seedRoutes() {
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
    await prisma.route.createMany({
      data: chunk,
      skipDuplicates: true,
    });
  }

  console.log(`Processed ${validRoutes.length} routes`);
}

async function seedUsersFromFile(filePath: string) {
  const users = readJsonFile<UserSeed>(filePath);
  if (!users.length) return;

  const bkk = await prisma.airport.findUnique({
    where: { iataCode: "BKK" },
  });

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        username: u.username,
        email: u.email,
        passwordHash: u.passwordHash,
        role: u.role,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        staffProfile: u.staffProfile
          ? {
              create: {
                employeeId: u.staffProfile.employeeId,
                role: u.role,
                rank: u.staffProfile.rank,
                baseAirportId: bkk?.id,
              },
            }
          : undefined,
      },
    });
  }

  console.log(
    `Processed ${users.length} users from ${path.basename(filePath)}`,
  );
}

async function seedAllUsers() {
  await seedUsersFromFile(adminsFilePath);
  await seedUsersFromFile(pilotsFilePath);
  await seedUsersFromFile(crewsFilePath);
  await seedUsersFromFile(passengersFilePath);
}

async function seedFlights() {
  const flights = readJsonFile<FlightSeed>(flightsFilePath);
  if (!flights.length) return;

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
    where: {
      role: "PILOT",
      rank: { in: ["CAPTAIN", "FIRST_OFFICER"] },
    },
  });

  const batchSize = 100;
  let successCount = 0;
  let skipCount = 0;

  for (let i = 0; i < flights.length; i += batchSize) {
    const batch = flights.slice(i, i + batchSize);

    const flightData = batch
      .map((flight) => {
        const routeId = routeMap.get(`${flight.origin}-${flight.dest}`);
        if (!routeId) {
          skipCount++;
          return null;
        }

        const randomAircraft =
          aircraft[Math.floor(Math.random() * aircraft.length)];

        let captainId = null;
        if (pilots.length > 0 && Math.random() > 0.3) {
          const randomPilot = pilots[Math.floor(Math.random() * pilots.length)];
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
      successCount += flightData.length;
    }
  }

  console.log(`Flights created: ${successCount}, skipped: ${skipCount}`);
}

async function main() {
  console.time("Seeding Duration");

  // await seedCountries();
  // await seedAirports();
  // await seedAircraft();
  // await seedRoutes();
  // await seedAllUsers();
  await seedFlights();

  console.timeEnd("Seeding Duration");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
