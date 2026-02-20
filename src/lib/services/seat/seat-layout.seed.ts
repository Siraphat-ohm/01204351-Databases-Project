import { connectMongo } from "@/lib/mongoose";
import { prisma } from "@/lib/prisma";
import AircraftSeatLayout, {
  ICabinSection,
  ISeatDef,
} from "@/models/AircraftSeatLayout";

// ─────────────────────────────────────────────────────────────
// Seat layout seeder — reads from Postgres, writes to MongoDB
//
// Postgres (SeatLayoutTemplate + SeatLayoutCabin) is the source
// of truth. This script stamps those definitions into MongoDB
// AircraftSeatLayout documents with expanded per-seat records.
// ─────────────────────────────────────────────────────────────

// ── Surcharges in THB (Thai Baht) ────────────────────────────
const SURCHARGE = {
  EXIT_ROW: 500,
  WINDOW: 150,
  EXTRA_LEGROOM: 350,
  FRONT_ECO: 200, // rows closest to business
} as const;

// ─────────────────────────────────────────────────────────────
// Classify seat position from column + aisle info
// ─────────────────────────────────────────────────────────────

function classifySeatType(
  column: string,
  columns: string[],
  aisleAfter: string[],
  row: number,
  exitRows: number[],
): ISeatDef["type"] {
  if (exitRows.includes(row)) return "EXIT_ROW";

  const idx = columns.indexOf(column);
  const isFirst = idx === 0;
  const isLast = idx === columns.length - 1;
  const isBeforeAisle = aisleAfter.includes(column);
  const isAfterAisle = idx > 0 && aisleAfter.includes(columns[idx - 1]);

  if (isFirst || isLast) return "WINDOW";
  if (isBeforeAisle || isAfterAisle) return "AISLE";
  return "MIDDLE";
}

// ─────────────────────────────────────────────────────────────
// Compute surcharge based on seat type + position
// ─────────────────────────────────────────────────────────────

function computeSurcharge(
  seatType: ISeatDef["type"],
  cabin: string,
  row: number,
  rowStart: number,
): number {
  if (cabin !== "ECONOMY") return 0;

  if (seatType === "EXIT_ROW") return SURCHARGE.EXIT_ROW;
  if (seatType === "WINDOW") return SURCHARGE.WINDOW;
  if (row <= rowStart + 1) return SURCHARGE.FRONT_ECO;

  return 0;
}

// ─────────────────────────────────────────────────────────────
// Read from Postgres → expand to per-seat → write to MongoDB
// ─────────────────────────────────────────────────────────────

export async function seedAircraftSeatLayouts(): Promise<void> {
  await connectMongo();

  // Read all seat layout templates from Postgres
  const templates = await prisma.seatLayoutTemplate.findMany({
    include: {
      cabins: { orderBy: { sortOrder: "asc" } },
      aircraftType: { select: { iataCode: true, model: true } },
    },
  });

  if (templates.length === 0) {
    console.warn(
      "   ⚠️  No seat layouts found in Postgres. Run db:seed first.",
    );
    return;
  }

  console.log(
    `💺 Seeding MongoDB seat layouts from Postgres (${templates.length} aircraft types)...`,
  );

  for (const template of templates) {
    const seats: ISeatDef[] = [];
    const cabinSections: ICabinSection[] = [];

    for (const cabin of template.cabins) {
      cabinSections.push({
        cabin: cabin.cabin as ICabinSection["cabin"],
        rowStart: cabin.rowStart,
        rowEnd: cabin.rowEnd,
        columns: cabin.columns,
        aisleAfter: cabin.aisleAfter,
      });

      const blockedSet = new Set(cabin.blockedSeats);

      for (let row = cabin.rowStart; row <= cabin.rowEnd; row++) {
        for (const col of cabin.columns) {
          const label = `${row}${col}`;
          const isBlocked = blockedSet.has(label);

          const seatType = classifySeatType(
            col,
            cabin.columns,
            cabin.aisleAfter,
            row,
            cabin.exitRows,
          );

          const surcharge = isBlocked
            ? 0
            : computeSurcharge(seatType, cabin.cabin, row, cabin.rowStart);

          seats.push({
            label,
            cabin: cabin.cabin as ISeatDef["cabin"],
            row,
            column: col,
            type: seatType,
            available: !isBlocked,
            surcharge,
          });
        }
      }
    }

    await AircraftSeatLayout.findOneAndUpdate(
      { aircraftTypeIataCode: template.aircraftType.iataCode },
      {
        aircraftTypeIataCode: template.aircraftType.iataCode,
        model: template.aircraftType.model,
        totalCapacity: seats.filter((s) => s.available).length,
        cabins: cabinSections,
        seats,
      },
      { upsert: true, new: true },
    );

    const summary = template.cabins
      .map((c) => {
        const count = seats.filter(
          (s) => s.cabin === c.cabin && s.available,
        ).length;
        return `${c.cabin[0]}:${count}`;
      })
      .join(" ");

    console.log(
      `   ✅ ${template.aircraftType.model} (${template.aircraftType.iataCode}) — ${seats.filter((s) => s.available).length} seats [${summary}]`,
    );
  }
}
