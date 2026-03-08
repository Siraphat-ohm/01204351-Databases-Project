import { Prisma } from "@/generated/prisma/client";
import { AircraftStatus } from "@/generated/prisma/enums";

export interface AircraftSearchParams {
  page?: number;
  limit?: number;
  status?: AircraftStatus;
  query?: string;
  aircraftTypeId?: number;
}

export interface CreateAircraftInput {
  tailNumber: string;
  aircraftTypeId: number;
  status?: AircraftStatus;
}

export interface UpdateAircraftInput {
  id: number;
  tailNumber?: string;
  aircraftTypeId?: number;
  status?: AircraftStatus;
}

export const defaultAircraftInclude = {
  type: true,
} satisfies Prisma.AircraftInclude;
