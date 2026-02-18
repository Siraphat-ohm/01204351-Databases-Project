import { prisma } from "@/lib/prisma";
import {
  defaultFlightInclude,
  FlightPaginatedResponse,
  FlightSearchParams,
  FlightWithDetails,
} from "@/types/flight";
import { Prisma } from "@/generated/prisma/client";

export class FlightService {
  static async getAvailableFlights(
    params: FlightSearchParams,
  ): Promise<FlightPaginatedResponse> {
    const { date, destination, limit, origin, page } = params;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.FlightWhereInput = {
      status: "SCHEDULED",
    };

    if (origin || destination) {
      const routeFilter: Prisma.RouteWhereInput = {};

      if (origin) {
        routeFilter.origin = { iataCode: origin };
      }

      if (destination) {
        routeFilter.destination = { iataCode: destination };
      }

      where.route = routeFilter;
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);

      endDate.setDate(startDate.getDate() + 1);

      where.departureTime = {
        gte: startDate,
        lt: endDate,
      };
    }

    const [total, flights] = await Promise.all([
      prisma.flight.count({ where }),
      prisma.flight.findMany({
        where,
        include: defaultFlightInclude,
        skip,
        take: limitNum,
        orderBy: { departureTime: "asc" },
      }),
    ]);

    return {
      data: flights as FlightWithDetails[],
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }
}
