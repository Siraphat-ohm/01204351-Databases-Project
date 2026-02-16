import { prisma } from "@/lib/prisma";
import { Prisma, FlightStatus } from "@/generated/prisma/client";
import { FlightSearchParams, CreateFlightInput } from "@/types/flight";

export class FlightService {
  static async getFlights(params: FlightSearchParams) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.FlightWhereInput = {};

    if (params.status) {
      where.status = params.status;
    }

    if (params.origin) {
      where.route = { ...where.route, origin: { iataCode: params.origin } };
    }

    if (params.destination) {
      where.route = {
        ...where.route,
        destination: { iataCode: params.destination },
      };
    }

    if (params.date) {
      const startDate = new Date(params.date);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);

      where.departureTime = {
        gte: startDate,
        lt: endDate,
      };
    }

    const [flights, total] = await Promise.all([
      prisma.flight.findMany({
        where,
        skip,
        take: limit,
        orderBy: { departureTime: "asc" },
        include: {
          route: {
            include: { origin: true, destination: true },
          },
          aircraft: {
            include: { type: true },
          },
          captain: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
      prisma.flight.count({ where }),
    ]);

    return {
      data: flights,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getFlightById(id: number) {
    return await prisma.flight.findUnique({
      where: { id },
      include: {
        route: {
          include: {
            origin: true,
            destination: true,
          },
        },
        aircraft: {
          include: { type: true },
        },
        captain: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        bookings: {
          select: {
            id: true,
            bookingRef: true,
            status: true,
            tickets: {
              select: {
                id: true,
                seatNumber: true,
                class: true,
              },
            },
          },
        },
        incidents: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            status: true,
            declaredAt: true,
            type: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  static async getFlightByCode(flightCode: string) {
    return await prisma.flight.findUnique({
      where: { flightCode },
      include: {
        route: {
          include: { origin: true, destination: true },
        },
        aircraft: { include: { type: true } },
        captain: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  static async createFlight(input: CreateFlightInput) {
    const existingFlight = await prisma.flight.findUnique({
      where: { flightCode: input.flightCode },
    });

    if (existingFlight) {
      throw new Error(`Flight with code ${input.flightCode} already exists`);
    }

    const route = await prisma.route.findUnique({
      where: { id: input.routeId },
    });

    if (!route) {
      throw new Error(`Route with ID ${input.routeId} not found`);
    }

    const aircraft = await prisma.aircraft.findUnique({
      where: { id: input.aircraftId },
    });

    if (!aircraft) {
      throw new Error(`Aircraft with ID ${input.aircraftId} not found`);
    }

    if (aircraft.status !== "ACTIVE") {
      throw new Error(
        `Aircraft ${aircraft.tailNumber} is not active (status: ${aircraft.status})`,
      );
    }

    if (input.captainId) {
      const captain = await prisma.staffProfile.findUnique({
        where: { id: input.captainId },
      });

      if (!captain) {
        throw new Error(`Captain with ID ${input.captainId} not found`);
      }

      if (captain.role !== "PILOT") {
        throw new Error(`Staff member ${input.captainId} is not a pilot`);
      }
    }

    if (new Date(input.departureTime) >= new Date(input.arrivalTime)) {
      throw new Error("Departure time must be before arrival time");
    }

    const flight = await prisma.flight.create({
      data: {
        flightCode: input.flightCode,
        routeId: input.routeId,
        aircraftId: input.aircraftId,
        captainId: input.captainId,
        gate: input.gate,
        departureTime: new Date(input.departureTime),
        arrivalTime: new Date(input.arrivalTime),
        basePrice: input.basePrice,
        status: input.status || FlightStatus.SCHEDULED,
      },
      include: {
        route: {
          include: {
            origin: true,
            destination: true,
          },
        },
        aircraft: {
          include: { type: true },
        },
        captain: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return flight;
  }
}
