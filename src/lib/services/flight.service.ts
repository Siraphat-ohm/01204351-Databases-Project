import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { FlightSearchParams } from "@/types/flight";

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
}
