import fs from "fs";
import path from "path";
import { AircraftStatus, PrismaClient } from "@/generated/prisma/client";
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
  log: ["query", "info", "warn", "error"],
});

const airportsFilePath = "prisma/data/airports.json";
const planesFilePath = "prisma/data/planes.json";
const routesFilePath = "prisma/data/routes.json";

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

async function main() {
  console.log("🌱 Starting seed...");
  const rawData = fs.readFileSync(airportsFilePath, "utf-8");
  const airports: AirportData[] = JSON.parse(rawData);

  for (const airport of airports) {
    await prisma.airport.upsert({
      where: { iataCode: airport.iataCode },
      update: {
        name: airport.name,
        city: airport.city,
        country: airport.country,
      },
      create: {
        iataCode: airport.iataCode,
        name: airport.name,
        city: airport.city,
        country: airport.country,
      },
    });
  }

  const rawPlanes = fs.readFileSync(planesFilePath, "utf-8");
  const planeTypes: PlaneTypeData[] = JSON.parse(rawPlanes);

  for (const typeData of planeTypes) {
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

    for (let i = 1; i <= 2; i++) {
      const mockTailNumber = `HS-${typeData.code}-${i}`;

      await prisma.aircraft.upsert({
        where: { tailNumber: mockTailNumber },
        update: {
          aircraftTypeId: aircraftType.id,
        },
        create: {
          tailNumber: mockTailNumber,
          aircraftTypeId: aircraftType.id,
          status: AircraftStatus.ACTIVE,
        },
      });
    }
  }

  const rawRoutes = fs.readFileSync(routesFilePath, "utf-8");
  const routes: RouteData[] = JSON.parse(rawRoutes);

  const dbAirports = await prisma.airport.findMany({
    select: { id: true, iataCode: true },
  });
  const airportMap = new Map(dbAirports.map((a) => [a.iataCode, a.id]));

  let routeCount = 0;

  for (const route of routes) {
    const originId = airportMap.get(route.origin);
    const destId = airportMap.get(route.dest);

    if (!originId || !destId) continue;

    await prisma.route.upsert({
      where: {
        originAirportId_destAirportId: {
          originAirportId: originId,
          destAirportId: destId,
        },
      },
      update: {
        distanceKm: route.distance,
        durationMins: route.duration,
      },
      create: {
        originAirportId: originId,
        destAirportId: destId,
        distanceKm: route.distance,
        durationMins: route.duration,
      },
    });
    routeCount++;
  }

  console.log("Seeding completed successfully.");
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
