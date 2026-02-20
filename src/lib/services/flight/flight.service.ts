import { prisma } from "@/lib/prisma";
import { searchAvailableFlights, searchFlightByCode } from "./flight.query";
import type {
  FlightSearchParams,
  FlightCodeSearchParams,
} from "@/schema/flight.schema";

interface SeatAvailability {
  FIRST: { total: number; available: number; occupied: number };
  BUSINESS: { total: number; available: number; occupied: number };
  ECONOMY: { total: number; available: number; occupied: number };
  total: number;
  available: number;
  occupied: number;
}

async function getSeatAvailability(
  flightId: string,
  aircraftTypeIataCode: string,
): Promise<SeatAvailability | null> {
  const layout = await prisma.seatLayoutTemplate.findFirst({
    where: { aircraftType: { iataCode: aircraftTypeIataCode } },
    include: { cabins: { orderBy: { sortOrder: "asc" } } },
  });

  if (!layout) return null;

  const cabinTotals: Record<string, number> = {
    FIRST: 0,
    BUSINESS: 0,
    ECONOMY: 0,
  };
  for (const cabin of layout.cabins) {
    const rows = cabin.rowEnd - cabin.rowStart + 1;
    const cols = cabin.columns.length;
    const blocked = cabin.blockedSeats.length;
    cabinTotals[cabin.cabin] += rows * cols - blocked;
  }

  const bookedCounts = await prisma.ticket.groupBy({
    by: ["class"],
    where: { flightId, seatNumber: { not: null } },
    _count: { id: true },
  });

  const occupiedMap: Record<string, number> = {};
  for (const row of bookedCounts) {
    const cabin =
      row.class === "FIRST_CLASS"
        ? "FIRST"
        : row.class === "BUSINESS"
          ? "BUSINESS"
          : "ECONOMY";
    occupiedMap[cabin] = (occupiedMap[cabin] ?? 0) + row._count.id;
  }

  const result: SeatAvailability = {
    FIRST: {
      total: cabinTotals.FIRST,
      available: cabinTotals.FIRST - (occupiedMap.FIRST ?? 0),
      occupied: occupiedMap.FIRST ?? 0,
    },
    BUSINESS: {
      total: cabinTotals.BUSINESS,
      available: cabinTotals.BUSINESS - (occupiedMap.BUSINESS ?? 0),
      occupied: occupiedMap.BUSINESS ?? 0,
    },
    ECONOMY: {
      total: cabinTotals.ECONOMY,
      available: cabinTotals.ECONOMY - (occupiedMap.ECONOMY ?? 0),
      occupied: occupiedMap.ECONOMY ?? 0,
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

async function getBulkSeatAvailability(
  flights: { id: string; aircraftTypeIataCode: string }[],
): Promise<Map<string, SeatAvailability>> {
  if (flights.length === 0) return new Map();

  const uniqueTypes = [...new Set(flights.map((f) => f.aircraftTypeIataCode))];

  const layouts = await prisma.seatLayoutTemplate.findMany({
    where: { aircraftType: { iataCode: { in: uniqueTypes } } },
    include: {
      cabins: { orderBy: { sortOrder: "asc" } },
      aircraftType: { select: { iataCode: true } },
    },
  });

  const layoutMap = new Map(layouts.map((l) => [l.aircraftType.iataCode, l]));

  const flightIds = flights.map((f) => f.id);
  const bookedCounts = await prisma.ticket.groupBy({
    by: ["flightId", "class"],
    where: { flightId: { in: flightIds }, seatNumber: { not: null } },
    _count: { id: true },
  });

  const occupiedByFlight = new Map<string, Record<string, number>>();
  for (const row of bookedCounts) {
    if (!occupiedByFlight.has(row.flightId)) {
      occupiedByFlight.set(row.flightId, {});
    }
    const cabin =
      row.class === "FIRST_CLASS"
        ? "FIRST"
        : row.class === "BUSINESS"
          ? "BUSINESS"
          : "ECONOMY";
    occupiedByFlight.get(row.flightId)![cabin] =
      (occupiedByFlight.get(row.flightId)![cabin] ?? 0) + row._count.id;
  }

  const results = new Map<string, SeatAvailability>();

  for (const flight of flights) {
    const layout = layoutMap.get(flight.aircraftTypeIataCode);
    if (!layout) continue;

    const cabinTotals: Record<string, number> = {
      FIRST: 0,
      BUSINESS: 0,
      ECONOMY: 0,
    };
    for (const cabin of layout.cabins) {
      const rows = cabin.rowEnd - cabin.rowStart + 1;
      const cols = cabin.columns.length;
      const blocked = cabin.blockedSeats.length;
      cabinTotals[cabin.cabin] += rows * cols - blocked;
    }

    const occupied = occupiedByFlight.get(flight.id) ?? {};

    const availability: SeatAvailability = {
      FIRST: {
        total: cabinTotals.FIRST,
        available: cabinTotals.FIRST - (occupied.FIRST ?? 0),
        occupied: occupied.FIRST ?? 0,
      },
      BUSINESS: {
        total: cabinTotals.BUSINESS,
        available: cabinTotals.BUSINESS - (occupied.BUSINESS ?? 0),
        occupied: occupied.BUSINESS ?? 0,
      },
      ECONOMY: {
        total: cabinTotals.ECONOMY,
        available: cabinTotals.ECONOMY - (occupied.ECONOMY ?? 0),
        occupied: occupied.ECONOMY ?? 0,
      },
      total: 0,
      available: 0,
      occupied: 0,
    };

    for (const cabin of ["FIRST", "BUSINESS", "ECONOMY"] as const) {
      availability.total += availability[cabin].total;
      availability.available += availability[cabin].available;
      availability.occupied += availability[cabin].occupied;
    }

    results.set(flight.id, availability);
  }

  return results;
}

export async function getFlightsWithAvailability(params: FlightSearchParams) {
  const result = await searchAvailableFlights(params);

  const flightLookups = result.data.map((f) => ({
    id: f.id,
    aircraftTypeIataCode: f.aircraft.type.iataCode,
  }));

  const availabilityMap = await getBulkSeatAvailability(flightLookups);

  const data = result.data.map((flight) => ({
    ...flight,
    seatAvailability: availabilityMap.get(flight.id) ?? null,
  }));

  return {
    data,
    meta: {
      ...result.meta,
      totalPages: Math.ceil(result.meta.total / result.meta.limit),
    },
  };
}

export async function getFlightDetail(params: FlightCodeSearchParams) {
  const flight = await searchFlightByCode(params);
  if (!flight) return null;

  const seatAvailability = await getSeatAvailability(
    flight.id,
    flight.aircraft.type.iataCode,
  );

  return {
    ...flight,
    seatAvailability,
  };
}

export async function getFlightSeatLayout(flightCode: string) {
  const flight = await searchFlightByCode({ flightCode });
  if (!flight) return null;

  const aircraftTypeCode = flight.aircraft.type.iataCode;

  const layout = await prisma.seatLayoutTemplate.findFirst({
    where: { aircraftType: { iataCode: aircraftTypeCode } },
    include: {
      cabins: { orderBy: { sortOrder: "asc" } },
      aircraftType: { select: { iataCode: true, model: true } },
    },
  });

  if (!layout) return null;

  const bookedTickets = await prisma.ticket.findMany({
    where: { flightId: flight.id, seatNumber: { not: null } },
    select: { seatNumber: true, class: true },
  });
  const occupiedSeats = new Set(
    bookedTickets.map((t) => t.seatNumber).filter(Boolean),
  );

  const cabins = layout.cabins.map((c) => ({
    cabin: c.cabin,
    rowStart: c.rowStart,
    rowEnd: c.rowEnd,
    columns: c.columns,
    aisleAfter: c.aisleAfter,
    exitRows: c.exitRows,
    blockedSeats: c.blockedSeats,
  }));

  const seats: {
    label: string;
    cabin: string;
    row: number;
    column: string;
    type: string;
    status: string;
    surcharge: number;
  }[] = [];

  for (const cabin of cabins) {
    const blockedSet = new Set(cabin.blockedSeats);
    for (let row = cabin.rowStart; row <= cabin.rowEnd; row++) {
      for (const col of cabin.columns) {
        const label = `${row}${col}`;
        const isBlocked = blockedSet.has(label);
        const isOccupied = occupiedSeats.has(label);

        const type = classifySeatType(
          col,
          cabin.columns,
          cabin.aisleAfter,
          row,
          cabin.exitRows,
        );
        const surcharge = isBlocked
          ? 0
          : computeSurcharge(type, cabin.cabin, row, cabin.rowStart);

        seats.push({
          label,
          cabin: cabin.cabin,
          row,
          column: col,
          type,
          status: isBlocked ? "BLOCKED" : isOccupied ? "OCCUPIED" : "AVAILABLE",
          surcharge,
        });
      }
    }
  }

  const totalSeats = seats.filter((s) => s.status !== "BLOCKED").length;
  const availableSeats = seats.filter((s) => s.status === "AVAILABLE").length;
  const occupiedCount = seats.filter((s) => s.status === "OCCUPIED").length;

  return {
    flight: {
      id: flight.id,
      flightCode: flight.flightCode,
      status: flight.status,
      departureTime: flight.departureTime,
      arrivalTime: flight.arrivalTime,
      gate: flight.gate,
      route: flight.route,
    },
    aircraft: {
      model: layout.aircraftType.model,
      iataCode: layout.aircraftType.iataCode,
      tailNumber: flight.aircraft.tailNumber,
    },
    layout: {
      cabins,
      seats,
      totalSeats,
      availableSeats,
      occupiedSeats: occupiedCount,
    },
  };
}

function classifySeatType(
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

function computeSurcharge(
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
