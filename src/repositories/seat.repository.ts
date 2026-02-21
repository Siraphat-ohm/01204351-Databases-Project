import { prisma } from "@/lib/prisma";
import { seatLayoutInclude } from "@/types/seat.type";

export const seatRepository = {
  findLayoutByAircraftTypeIataCode: (aircraftTypeIataCode: string) =>
    prisma.seatLayoutTemplate.findFirst({
      where: { aircraftType: { iataCode: aircraftTypeIataCode } },
      include: seatLayoutInclude,
    }),

  findLayoutsByAircraftTypeIataCodes: (aircraftTypeIataCodes: string[]) =>
    prisma.seatLayoutTemplate.findMany({
      where: { aircraftType: { iataCode: { in: aircraftTypeIataCodes } } },
      include: seatLayoutInclude,
    }),

  countOccupiedByFlight: (flightId: string) =>
    prisma.ticket.groupBy({
      by: ["class"],
      where: { flightId, seatNumber: { not: null } },
      _count: { id: true },
    }),

  countOccupiedByFlights: (flightIds: string[]) =>
    prisma.ticket.groupBy({
      by: ["flightId", "class"],
      where: { flightId: { in: flightIds }, seatNumber: { not: null } },
      _count: { id: true },
    }),

  findOccupiedTicketsByFlight: (flightId: string) =>
    prisma.ticket.findMany({
      where: { flightId, seatNumber: { not: null } },
      select: {
        seatNumber: true,
        class: true,
        firstName: true,
        lastName: true,
        nationality: true,
        booking: {
          select: {
            bookingRef: true,
          },
        },
      },
    }),
};
