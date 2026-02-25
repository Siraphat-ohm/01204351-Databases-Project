import type { PrismaClient } from "@/generated/prisma/client";

type SeedDeps = {
  fetchOurAirports: () => Promise<any[]>;
  seedAircraftTypes: () => Promise<any[]>;
  seedSeatLayouts: (aircraftTypes: any[]) => Promise<void>;
  seedAircraft: (aircraftTypes: any[]) => Promise<any[]>;
  seedAirports: (airportCoords: any[]) => Promise<any[]>;
  seedRoutes: (airportCoords: any[]) => Promise<any[]>;
  seedUsers: (dbAirports: any[]) => Promise<{ passengers: any[]; staffProfiles: any[] }>;
  seedFlights: (routes: any[], aircraft: any[], aircraftTypes: any[], staffProfiles: any[]) => Promise<any[]>;
  loadSeatLayouts: () => Promise<Map<string, any>>;
  buildSeatCache: (layouts: Map<string, any>) => void;
  seedBookings: (passengers: any[], flights: any[]) => Promise<void>;
};

export async function seedSqlData(prisma: PrismaClient, deps: SeedDeps) {
  console.log("🧹 Clearing existing data...");
  try {
    await (prisma as any).activeEmergencyTask.deleteMany();
    await (prisma as any).emergencyIncident.deleteMany();
    await (prisma as any).emergencyTaskTemplate.deleteMany();
    await (prisma as any).emergencyType.deleteMany();
  } catch {}

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

  const [airportCoords, aircraftTypes] = await Promise.all([
    deps.fetchOurAirports(),
    deps.seedAircraftTypes(),
  ]);

  await deps.seedSeatLayouts(aircraftTypes);
  const aircraft = await deps.seedAircraft(aircraftTypes);
  const dbAirports = await deps.seedAirports(airportCoords);
  const routes = await deps.seedRoutes(airportCoords);

  const { passengers, staffProfiles } = await deps.seedUsers(dbAirports);
  const flights = await deps.seedFlights(routes, aircraft, aircraftTypes, staffProfiles);

  const loadedLayouts = await deps.loadSeatLayouts();
  deps.buildSeatCache(loadedLayouts);
  console.log(`💺 Loaded and cached ${loadedLayouts.size} seat layouts`);

  await deps.seedBookings(passengers, flights);

  return { passengers, staffProfiles, flights };
}
