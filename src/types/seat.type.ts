import { Prisma } from "@/generated/prisma/client";

export type CabinClass = "FIRST" | "BUSINESS" | "ECONOMY";

export interface SeatAvailability {
  FIRST: { total: number; available: number; occupied: number };
  BUSINESS: { total: number; available: number; occupied: number };
  ECONOMY: { total: number; available: number; occupied: number };
  total: number;
  available: number;
  occupied: number;
}

export const seatLayoutInclude = {
  cabins: { orderBy: { sortOrder: "asc" as const } },
  aircraftType: { select: { iataCode: true, model: true } },
} satisfies Prisma.SeatLayoutTemplateInclude;

export type SeatLayoutWithCabins = Prisma.SeatLayoutTemplateGetPayload<{
  include: typeof seatLayoutInclude;
}>;

export function computeCabinTotals(cabins: SeatLayoutWithCabins["cabins"]) {
  const totals: Record<CabinClass, number> = {
    FIRST: 0,
    BUSINESS: 0,
    ECONOMY: 0,
  };

  for (const cabin of cabins) {
    const rows = cabin.rowEnd - cabin.rowStart + 1;
    const cols = cabin.columns.length;
    const blocked = cabin.blockedSeats.length;
    totals[cabin.cabin] += rows * cols - blocked;
  }

  return totals;
}

export function buildAvailability(
  totals: Record<CabinClass, number>,
  occupied: Partial<Record<CabinClass, number>>,
): SeatAvailability {
  const result: SeatAvailability = {
    FIRST: {
      total: totals.FIRST,
      available: totals.FIRST - (occupied.FIRST ?? 0),
      occupied: occupied.FIRST ?? 0,
    },
    BUSINESS: {
      total: totals.BUSINESS,
      available: totals.BUSINESS - (occupied.BUSINESS ?? 0),
      occupied: occupied.BUSINESS ?? 0,
    },
    ECONOMY: {
      total: totals.ECONOMY,
      available: totals.ECONOMY - (occupied.ECONOMY ?? 0),
      occupied: occupied.ECONOMY ?? 0,
    },
    total: 0,
    available: 0,
    occupied: 0,
  };

  for (const cabin of ["FIRST", "BUSINESS", "ECONOMY"] as const) {
    result.total += result[cabin].total;
    result.available += result[cabin].available;
    result.occupied += result[cabin].occupied;
  }

  return result;
}

export function classifySeatType(
  col: string,
  columns: string[],
  aisleAfter: string[],
  row: number,
  exitRows: number[],
): string {
  if (exitRows.includes(row)) return "EXIT_ROW";
  const idx = columns.indexOf(col);
  if (idx === 0 || idx === columns.length - 1) return "WINDOW";
  if (aisleAfter.includes(col)) return "AISLE";
  if (idx > 0 && aisleAfter.includes(columns[idx - 1])) return "AISLE";
  return "MIDDLE";
}

export function computeSurcharge(
  seatType: string,
  cabin: string,
  row: number,
  rowStart: number,
): number {
  if (cabin !== "ECONOMY") return 0;
  if (seatType === "EXIT_ROW") return 500;
  if (seatType === "WINDOW") return 150;
  if (row <= rowStart + 1) return 200;
  return 0;
}
