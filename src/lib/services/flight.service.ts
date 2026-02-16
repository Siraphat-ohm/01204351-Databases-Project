import { prisma } from "@/lib/prisma";
import { Prisma, FlightStatus } from "@/generated/prisma/client";
import {
  FlightSearchParams,
  CreateFlightInput,
  UpdateFlightInput,
} from "@/types/flight";

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

  static async updateFlight(id: number, input: UpdateFlightInput) {
    // Verify flight exists
    const existingFlight = await prisma.flight.findUnique({
      where: { id },
    });

    if (!existingFlight) {
      throw new Error(`Flight with ID ${id} not found`);
    }

    // If updating flight code, check for duplicates
    if (input.flightCode && input.flightCode !== existingFlight.flightCode) {
      const duplicateFlight = await prisma.flight.findUnique({
        where: { flightCode: input.flightCode },
      });

      if (duplicateFlight) {
        throw new Error(`Flight with code ${input.flightCode} already exists`);
      }
    }

    // If updating route, validate it exists
    if (input.routeId !== undefined) {
      const route = await prisma.route.findUnique({
        where: { id: input.routeId },
      });

      if (!route) {
        throw new Error(`Route with ID ${input.routeId} not found`);
      }
    }

    // If updating aircraft, validate it exists and is ACTIVE
    if (input.aircraftId !== undefined) {
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
    }

    // If updating captain, validate they exist and are a pilot
    if (input.captainId !== undefined) {
      if (input.captainId !== null) {
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
    }

    // Validate dates if provided
    const departureTime = input.departureTime || existingFlight.departureTime;
    const arrivalTime = input.arrivalTime || existingFlight.arrivalTime;

    if (new Date(departureTime) >= new Date(arrivalTime)) {
      throw new Error("Departure time must be before arrival time");
    }

    // Build update data (only include fields that were provided)
    const updateData: Prisma.FlightUpdateInput = {};

    if (input.flightCode !== undefined)
      updateData.flightCode = input.flightCode;
    if (input.routeId !== undefined) updateData.routeId = input.routeId;
    if (input.aircraftId !== undefined)
      updateData.aircraftId = input.aircraftId;
    if (input.captainId !== undefined) updateData.captainId = input.captainId;
    if (input.gate !== undefined) updateData.gate = input.gate;
    if (input.departureTime !== undefined)
      updateData.departureTime = new Date(input.departureTime);
    if (input.arrivalTime !== undefined)
      updateData.arrivalTime = new Date(input.arrivalTime);
    if (input.basePrice !== undefined) updateData.basePrice = input.basePrice;
    if (input.status !== undefined) updateData.status = input.status;

    // Update flight
    const updatedFlight = await prisma.flight.update({
      where: { id },
      data: updateData,
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

    return updatedFlight;
  }
}
