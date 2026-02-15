import fs from "fs";
import path from "path";
import { PrismaClient, AircraftStatus } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Create PostgreSQL connection pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create adapter
const adapter = new PrismaPg(pool);

// Initialize Prisma with adapter
const prisma = new PrismaClient({
  adapter,
  // log: ["query", "info", "warn", "error"],
});

// Paths to JSON files
const airportsFilePath = path.join(process.cwd(), "prisma/data/airports.json");
const planesFilePath = path.join(process.cwd(), "prisma/data/planes.json");
const routesFilePath = path.join(process.cwd(), "prisma/data/routes.json");
const countriesFilePath = path.join(
  process.cwd(),
  "prisma/data/countries.json",
);

// Interfaces
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

function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function main() {
  console.time("⏱️ Seeding Duration");
  console.log("🌱 Starting optimized seed...");

  // --------------------------------------------------------
  // 1. SEED COUNTRIES (Batch Insert)
  // --------------------------------------------------------
  console.log("🌍 Seeding Countries...");
  if (fs.existsSync(countriesFilePath)) {
    const rawCountries = fs.readFileSync(countriesFilePath, "utf-8");
    const countries: CountryData[] = JSON.parse(rawCountries);

    await prisma.country.createMany({
      data: countries.map((c) => ({
        code: c.code,
        name: c.name,
      })),
      skipDuplicates: true,
    });
    console.log(`   ✅ Processed ${countries.length} countries.`);
  }

  // --------------------------------------------------------
  // 2. SEED AIRPORTS (Batch Insert with Chunking)
  // --------------------------------------------------------
  console.log("✈️ Seeding Airports...");
  if (fs.existsSync(airportsFilePath)) {
    const rawAirports = fs.readFileSync(airportsFilePath, "utf-8");
    const airports: AirportData[] = JSON.parse(rawAirports);

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
    console.log(`   ✅ Processed ${airports.length} airports.`);
  }

  // --------------------------------------------------------
  // 3. SEED AIRCRAFT & TYPES (Hybrid)
  // --------------------------------------------------------
  console.log("🛩️ Seeding Aircraft Types & Fleet...");
  if (fs.existsSync(planesFilePath)) {
    const planeTypes: PlaneTypeData[] = JSON.parse(
      fs.readFileSync(planesFilePath, "utf-8"),
    );
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    for (const [index, typeData] of planeTypes.entries()) {
      // Create Type (จำเป็นต้อง Upsert เพื่อเอา ID)
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

      // Prepare Planes Data
      const fleetLetter = alphabet[index % 26];
      const planesData = [];

      for (let i = 0; i < 3; i++) {
        const sequenceLetter = alphabet[i];
        const tailNumber = `HS-Y${fleetLetter}${sequenceLetter}`;
        planesData.push({
          tailNumber: tailNumber,
          aircraftTypeId: aircraftType.id,
          status: AircraftStatus.ACTIVE,
        });
      }

      // Batch Insert Planes for this type
      await prisma.aircraft.createMany({
        data: planesData,
        skipDuplicates: true,
      });
      console.log(`      -> Created fleet for ${typeData.model}`);
    }
    console.log("   ✅ Seeded aircraft fleet.");
  }

  // --------------------------------------------------------
  // 4. SEED ROUTES (Batch Insert with Map Lookup)
  // --------------------------------------------------------
  console.log("📍 Seeding Routes...");
  if (fs.existsSync(routesFilePath)) {
    const rawRoutes = fs.readFileSync(routesFilePath, "utf-8");
    const routes: RouteData[] = JSON.parse(rawRoutes);

    // Cache Airport IDs
    const dbAirports = await prisma.airport.findMany({
      select: { id: true, iataCode: true },
    });
    const airportMap = new Map(dbAirports.map((a) => [a.iataCode, a.id]));

    const validRoutes = [];

    for (const route of routes) {
      const originId = airportMap.get(route.origin);
      const destId = airportMap.get(route.dest);

      if (originId && destId) {
        validRoutes.push({
          originAirportId: originId,
          destAirportId: destId,
          distanceKm: route.distance,
          durationMins: route.duration,
        });
      }
    }

    // Chunk Insert Routes
    const routeChunks = chunkArray(validRoutes, 500);
    for (const chunk of routeChunks) {
      await prisma.route.createMany({
        data: chunk,
        skipDuplicates: true,
      });
    }
    console.log(`   ✅ Processed ${validRoutes.length} routes.`);
  }

  console.log("✨ Seeding completed successfully.");
  console.timeEnd("⏱️ Seeding Duration");
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
