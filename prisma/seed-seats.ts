import "dotenv/config";
import { seedAircraftSeatLayouts } from "../src/lib/services/seat/seat-layout.seed";

async function main() {
  console.log("\n💺 YokAirlines — MongoDB Seat Layout Seed\n" + "─".repeat(50));
  await seedAircraftSeatLayouts();
  console.log("\n" + "─".repeat(50));
  console.log("✅  Seat layouts seeded!\n");
  process.exit(0);
}

main().catch((e) => {
  console.error("\n❌ Seed failed:", e);
  process.exit(1);
});
