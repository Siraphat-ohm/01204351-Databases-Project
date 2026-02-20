import { connectMongo } from "@/lib/mongoose";
import { prisma } from "@/lib/prisma";
import AircraftSeatLayout, { ISeatDef } from "@/models/AircraftSeatLayout";
import FlightSeatMap, { IFlightSeat, SeatStatus } from "@/models/FlightSeatMap";

const HOLD_TTL_MS = 10 * 60 * 1000;

export async function initFlightSeatMap(
  flightId: string,
  aircraftTypeIataCode: string,
): Promise<void> {
  await connectMongo();

  const layout = await AircraftSeatLayout.findOne({ aircraftTypeIataCode });
  if (!layout) {
    throw new Error(
      `No seat layout found for aircraft type: ${aircraftTypeIataCode}`,
    );
  }

  const seats: IFlightSeat[] = layout.seats.map((s: ISeatDef) => ({
    label: s.label,
    cabin: s.cabin,
    row: s.row,
    column: s.column,
    type: s.type,
    status: s.available
      ? ("AVAILABLE" as SeatStatus)
      : ("BLOCKED" as SeatStatus),
    surcharge: s.surcharge,
    ticketId: undefined,
    heldBy: undefined,
    holdExpiry: undefined,
  }));

  const availableSeats = seats.filter((s) => s.status === "AVAILABLE").length;

  await FlightSeatMap.findOneAndUpdate(
    { flightId },
    {
      flightId,
      aircraftTypeIataCode,
      totalSeats: seats.length,
      availableSeats,
      seats,
    },
    { upsert: true, new: true },
  );
}

export async function getFlightSeatMap(flightId: string) {
  await connectMongo();

  const seatMap = await FlightSeatMap.findOne({ flightId }).lean();
  if (!seatMap) return null;

  const now = new Date();
  const seats = seatMap.seats.map((s) => {
    if (s.status === "HELD" && s.holdExpiry && s.holdExpiry < now) {
      return {
        ...s,
        status: "AVAILABLE" as SeatStatus,
        heldBy: undefined,
        holdExpiry: undefined,
      };
    }
    return s;
  });

  return { ...seatMap, seats };
}

export async function holdSeat(
  flightId: string,
  seatLabel: string,
  userId: string,
): Promise<boolean> {
  await connectMongo();

  const holdExpiry = new Date(Date.now() + HOLD_TTL_MS);

  const result = await FlightSeatMap.findOneAndUpdate(
    {
      flightId,
      seats: {
        $elemMatch: {
          label: seatLabel,
          $or: [
            { status: "AVAILABLE" },
            { status: "HELD", holdExpiry: { $lt: new Date() } },
          ],
        },
      },
    },
    {
      $set: {
        "seats.$.status": "HELD",
        "seats.$.heldBy": userId,
        "seats.$.holdExpiry": holdExpiry,
      },
      $inc: { availableSeats: -1 },
    },
    { new: true },
  );

  return result !== null;
}

export async function releaseSeat(
  flightId: string,
  seatLabel: string,
  userId: string,
): Promise<boolean> {
  await connectMongo();

  const result = await FlightSeatMap.findOneAndUpdate(
    {
      flightId,
      seats: {
        $elemMatch: {
          label: seatLabel,
          status: "HELD",
          heldBy: userId,
        },
      },
    },
    {
      $set: {
        "seats.$.status": "AVAILABLE",
        "seats.$.heldBy": null,
        "seats.$.holdExpiry": null,
      },
      $inc: { availableSeats: 1 },
    },
    { new: true },
  );

  return result !== null;
}

export async function confirmSeat(
  flightId: string,
  seatLabel: string,
  ticketId: string,
  userId: string,
): Promise<boolean> {
  await connectMongo();

  const result = await FlightSeatMap.findOneAndUpdate(
    {
      flightId,
      seats: {
        $elemMatch: {
          label: seatLabel,
          status: "HELD",
          heldBy: userId,
        },
      },
    },
    {
      $set: {
        "seats.$.status": "OCCUPIED",
        "seats.$.ticketId": ticketId,
        "seats.$.heldBy": null,
        "seats.$.holdExpiry": null,
      },
    },
    { new: true },
  );

  if (!result) return false;

  const seat = result.seats.find((s) => s.label === seatLabel);
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      seatNumber: seatLabel,
      seatSurcharge: seat?.surcharge ?? 0,
    },
  });

  return true;
}

export async function releaseExpiredHolds(flightId: string): Promise<number> {
  await connectMongo();

  const seatMap = await FlightSeatMap.findOne({ flightId });
  if (!seatMap) return 0;

  let released = 0;
  const now = new Date();

  for (const seat of seatMap.seats) {
    if (seat.status === "HELD" && seat.holdExpiry && seat.holdExpiry < now) {
      seat.status = "AVAILABLE";
      seat.heldBy = undefined;
      seat.holdExpiry = undefined;
      released++;
    }
  }

  if (released > 0) {
    seatMap.availableSeats += released;
    await seatMap.save();
  }

  return released;
}

export async function getAvailabilitySummary(flightId: string) {
  await connectMongo();

  const seatMap = await FlightSeatMap.findOne({ flightId }).lean();
  if (!seatMap) return null;

  const now = new Date();

  const summary = { FIRST: 0, BUSINESS: 0, ECONOMY: 0, total: 0 };

  for (const seat of seatMap.seats) {
    const isAvailable =
      seat.status === "AVAILABLE" ||
      (seat.status === "HELD" && seat.holdExpiry && seat.holdExpiry < now);

    if (isAvailable) {
      summary[seat.cabin]++;
      summary.total++;
    }
  }

  return summary;
}

export async function getAircraftSeatLayout(aircraftTypeIataCode: string) {
  await connectMongo();

  const layout = await AircraftSeatLayout.findOne({
    aircraftTypeIataCode,
  }).lean();

  return layout;
}
