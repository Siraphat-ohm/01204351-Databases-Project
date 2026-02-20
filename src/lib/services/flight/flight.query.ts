import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  FlightSearchParams,
  FlightCodeSearchSchema,
  FlightCodeSearchParams,
  FlightSearchSchema,
} from "@/schema/flight.schema";

export const searchAvailableFlights = async (params: FlightSearchParams) => {
  const { page, limit, originIataCode, destinationIataCode, departureDate } =
    FlightSearchSchema.parse(params);

  const where: Prisma.FlightWhereInput = {
    status: "SCHEDULED",
  };

  if (originIataCode || destinationIataCode) {
    const routeFilter: Prisma.RouteWhereInput = {};

    if (originIataCode) {
      routeFilter.origin = { iataCode: originIataCode };
    }

    if (destinationIataCode) {
      routeFilter.destination = { iataCode: destinationIataCode };
    }

    where.route = routeFilter;
  }

  if (departureDate) {
    const startDate = new Date(departureDate);
    const endDate = new Date(departureDate);
    endDate.setDate(endDate.getDate() + 1);

    where.departureTime = {
      gte: startDate,
      lt: endDate,
    };
  }

  const skip = (page - 1) * limit;

  const [data, total] = await prisma.$transaction([
    prisma.flight.findMany({
      where,
      include: {
        route: {
          include: { origin: true, destination: true },
        },
        aircraft: {
          include: {
            type: {
              select: { model: true, iataCode: true },
            },
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        departureTime: "asc",
      },
    }),
    prisma.flight.count({ where }),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
    },
  };
};

export const searchFlightByCode = async (params: FlightCodeSearchParams) => {
  const { flightCode } = FlightCodeSearchSchema.parse(params);

  const flight = await prisma.flight.findUnique({
    where: { flightCode },
    include: {
      route: {
        include: { origin: true, destination: true },
      },
      aircraft: {
        include: {
          type: {
            select: { model: true, iataCode: true },
          },
        },
      },
    },
  });

  return flight;
};
