import { flightRepository } from "@/repositories/flight.repository";
import { seatRepository } from "@/repositories/seat.repository";
import {
  buildAvailability,
  classifySeatType,
  computeCabinTotals,
  computeSurcharge,
  type CabinClass,
  type SeatAvailability,
} from "@/types/seat.type";

export async function getSeatAvailability(
  flightId: string,
  aircraftTypeIataCode: string,
): Promise<SeatAvailability | null> {
  const layout = await seatRepository.findLayoutByAircraftTypeIataCode(
    aircraftTypeIataCode,
  );

  if (!layout) return null;

  const bookedCounts = await seatRepository.countOccupiedByFlight(flightId);

  const occupiedMap: Partial<Record<CabinClass, number>> = {};
  for (const row of bookedCounts) {
    const cabin =
      row.class === "FIRST_CLASS"
        ? "FIRST"
        : row.class === "BUSINESS"
          ? "BUSINESS"
          : "ECONOMY";
    occupiedMap[cabin] = (occupiedMap[cabin] ?? 0) + row._count.id;
  }

  return buildAvailability(computeCabinTotals(layout.cabins), occupiedMap);
}

export async function getBulkSeatAvailability(
  flights: { id: string; aircraftTypeIataCode: string }[],
): Promise<Map<string, SeatAvailability>> {
  if (flights.length === 0) return new Map();

  const uniqueTypes = [...new Set(flights.map((f) => f.aircraftTypeIataCode))];

  const layouts = await seatRepository.findLayoutsByAircraftTypeIataCodes(
    uniqueTypes,
  );

  const layoutMap = new Map(layouts.map((l) => [l.aircraftType.iataCode, l]));

  const flightIds = flights.map((f) => f.id);
  const bookedCounts = await seatRepository.countOccupiedByFlights(flightIds);

  const occupiedByFlight = new Map<string, Partial<Record<CabinClass, number>>>();
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

    const totals = computeCabinTotals(layout.cabins);
    const occupied = occupiedByFlight.get(flight.id) ?? {};
    results.set(flight.id, buildAvailability(totals, occupied));
  }

  return results;
}

export async function getFlightSeatLayout(
  flightCode: string,
  options?: { includeOccupants?: boolean },
) {
  const flight = await flightRepository.findByCode(flightCode);
  if (!flight) return null;

  const aircraftTypeCode = flight.aircraft.type.iataCode;

  const layout = await seatRepository.findLayoutByAircraftTypeIataCode(
    aircraftTypeCode,
  );

  if (!layout) return null;

  const bookedTickets = await seatRepository.findOccupiedTicketsByFlight(
    flight.id,
  );
  const occupiedSeats = new Set(bookedTickets.map((t) => t.seatNumber).filter(Boolean));

  const occupantsBySeat = options?.includeOccupants
    ? Object.fromEntries(
        bookedTickets
          .filter((t) => Boolean(t.seatNumber))
          .map((t) => [
            t.seatNumber as string,
            {
              firstName: t.firstName,
              lastName: t.lastName,
              nationality: t.nationality,
              ticketClass: t.class,
              bookingRef: t.booking.bookingRef,
            },
          ]),
      )
    : undefined;

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

        const type = classifySeatType(col, cabin.columns, cabin.aisleAfter, row, cabin.exitRows);
        const surcharge = isBlocked ? 0 : computeSurcharge(type, cabin.cabin, row, cabin.rowStart);

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
      occupantsBySeat,
    },
  };
}

