import fs from "fs";
import path from "path";
import { PrismaClient } from "@/generated/prisma/client";
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

interface AirportData {
  name: string;
  city: string;
  country: string;
  iataCode: string;
}

async function main() {
  console.log("🌱 Starting seed...");
  const rawData = fs.readFileSync(airportsFilePath, "utf-8");
  const airports: AirportData[] = JSON.parse(rawData);

  console.log(`✈️  Found ${airports.length} airports to process.`);

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
