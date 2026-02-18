import { Prisma } from "@/generated/prisma/client";
import { FlightStatus } from "@/generated/prisma/client";
import { PaginatedResponse } from "@/types/common";

export const defaultFlightInclude = {
  route: {
    include: { origin: true, destination: true },
  },
  aircraft: {
    include: {
      type: {
        select: {
          model: true,
        },
      },
    },
  },
} satisfies Prisma.FlightInclude;

export type FlightWithDetails = Prisma.FlightGetPayload<{
  include: typeof defaultFlightInclude;
}>;

export type FlightPaginatedResponse = PaginatedResponse<FlightWithDetails>;

export interface FlightSearchParams {
  page?: string | number;
  limit?: string | number;
  origin?: string;
  destination?: string;
  date?: string;
  status?: FlightStatus;
}

export interface CreateFlightInput {
  flightCode: string;
  routeId: number;
  aircraftId: number;
  captainId?: number | null;
  gate?: string | null;
  departureTime: Date;
  arrivalTime: Date;
  basePrice: number;
  status?: FlightStatus;
}

export interface UpdateFlightInput {
  id: number;
  flightCode?: string;
  routeId?: number;
  aircraftId?: number;
  captainId?: number | null;
  gate?: string | null;
  departureTime?: Date;
  arrivalTime?: Date;
  basePrice?: number;
  status?: FlightStatus;
}
