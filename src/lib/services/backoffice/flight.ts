import { prisma } from "@/lib/prisma";
import {
  CreateFlightInput,
  defaultFlightInclude,
  FlightPaginatedResponse,
  FlightSearchParams,
  FlightWithDetails,
  UpdateFlightInput,
} from "@/types/flight";
import { Prisma } from "@/generated/prisma/client";

interface BackofficeFlightSearchParams extends FlightSearchParams {
  flightCode?: string;
}

const adminFlightInclude = defaultFlightInclude;

export class FlightService {
  static async getAllFlights(
    params: BackofficeFlightSearchParams,
  ): Promise<FlightPaginatedResponse> {
    const { date, destination, limit, origin, page, flightCode, status } =
      params;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.FlightWhereInput = {};

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

    if (flightCode) {
      where.flightCode = { contains: flightCode, mode: "insensitive" };
    }

    if (status) {
      where.status = status;
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
        include: adminFlightInclude,
        skip,
        take: limitNum,
        orderBy: { departureTime: "asc" },
      }),
    ]);

    return {
      data: flights as FlightWithDetails[],
      meta: {
        total,
        limit: limitNum,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  static async getFlightByFlightCode(
    flightCode: string,
  ): Promise<FlightWithDetails | null> {
    if (!flightCode.trim()) {
      throw new Error("flightCode is required");
    }

    return prisma.flight.findUnique({
      where: { flightCode },
      include: {
        ...adminFlightInclude,
        bookings: true,
        captain: true,
        incidents: true,
      },
    });
  }

  static async createFlight(
    input: CreateFlightInput,
  ): Promise<FlightWithDetails> {
    if (!input.flightCode?.trim()) {
      throw new Error("flightCode is required");
    }

    if (!Number.isInteger(input.routeId) || input.routeId <= 0) {
      throw new Error("routeId must be a positive integer");
    }

    if (!Number.isInteger(input.aircraftId) || input.aircraftId <= 0) {
      throw new Error("aircraftId must be a positive integer");
    }

    if (
      !(input.departureTime instanceof Date) ||
      isNaN(input.departureTime.getTime())
    ) {
      throw new Error("departureTime must be a valid Date");
    }

    if (
      !(input.arrivalTime instanceof Date) ||
      isNaN(input.arrivalTime.getTime())
    ) {
      throw new Error("arrivalTime must be a valid Date");
    }

    if (typeof input.basePrice !== "number" || input.basePrice <= 0) {
      throw new Error("basePrice must be a positive number");
    }

    return prisma.flight.create({
      data: {
        flightCode: input.flightCode.toUpperCase(),
        routeId: input.routeId,
        aircraftId: input.aircraftId,
        captainId: input.captainId ?? undefined,
        gate: input.gate ?? undefined,
        departureTime: input.departureTime,
        arrivalTime: input.arrivalTime,
        basePrice: input.basePrice,
        status: input.status,
      },
      include: adminFlightInclude,
    });
  }

  static async updateFlight(
    input: UpdateFlightInput,
  ): Promise<FlightWithDetails> {
    if (!Number.isInteger(input.id) || input.id <= 0) {
      throw new Error("id must be a positive integer");
    }

    const data: Prisma.FlightUncheckedUpdateInput = {};

    if (typeof input.flightCode === "string") {
      data.flightCode = input.flightCode.toUpperCase();
    }

    if (typeof input.routeId === "number") {
      data.routeId = input.routeId;
    }

    if (typeof input.aircraftId === "number") {
      data.aircraftId = input.aircraftId;
    }

    if (input.captainId !== undefined) {
      data.captainId = input.captainId;
    }

    if (input.gate !== undefined) {
      data.gate = input.gate;
    }

    if (input.departureTime) {
      data.departureTime = input.departureTime;
    }

    if (input.arrivalTime) {
      data.arrivalTime = input.arrivalTime;
    }

    if (typeof input.basePrice === "number") {
      data.basePrice = input.basePrice;
    }

    if (input.status) {
      data.status = input.status;
    }

    if (Object.keys(data).length === 0) {
      throw new Error("No fields provided to update");
    }

    return prisma.flight.update({
      where: { id: input.id },
      data,
      include: adminFlightInclude,
    });
  }

  static async deleteFlight(id: number): Promise<FlightWithDetails> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("id must be a positive integer");
    }

    return prisma.flight.delete({
      where: { id },
      include: adminFlightInclude,
    });
  }
}
