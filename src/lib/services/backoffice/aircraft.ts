import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  CreateAircraftInput,
  defaultAircraftInclude,
  AircraftSearchParams,
  UpdateAircraftInput,
} from "@/types/aircraft";

const normalizeTailNumber = (tailNumber: string) =>
  tailNumber.trim().toUpperCase();

export class AircraftService {
  static async getAllAircraft(params: AircraftSearchParams = {}): Promise<{
    data: Prisma.AircraftGetPayload<{
      include: typeof defaultAircraftInclude;
    }>[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const pageNum = Math.max(1, Number(params.page) || 1);
    const limitNum = Math.max(1, Number(params.limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.AircraftWhereInput = {};

    if (params.status) {
      where.status = params.status;
    }

    if (params.aircraftTypeId) {
      where.aircraftTypeId = params.aircraftTypeId;
    }

    if (params.query?.trim()) {
      const query = params.query.trim();
      where.OR = [
        { tailNumber: { contains: query, mode: "insensitive" } },
        { type: { model: { contains: query, mode: "insensitive" } } },
      ];
    }

    const [total, aircraft] = await Promise.all([
      prisma.aircraft.count({ where }),
      prisma.aircraft.findMany({
        where,
        include: defaultAircraftInclude,
        skip,
        take: limitNum,
        orderBy: { tailNumber: "asc" },
      }),
    ]);

    return {
      data: aircraft,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  static async getAircraftById(id: number) {
    if (!Number.isInteger(id) || id <= 0) {
      return null;
    }

    return prisma.aircraft.findUnique({
      where: { id },
      include: defaultAircraftInclude,
    });
  }

  static async getAircraftTypes() {
    return prisma.aircraftType.findMany({
      orderBy: { model: "asc" },
    });
  }

  static async createAircraft(input: CreateAircraftInput) {
    if (!input.tailNumber?.trim()) {
      throw new Error("tailNumber is required");
    }

    if (!Number.isInteger(input.aircraftTypeId) || input.aircraftTypeId <= 0) {
      throw new Error("aircraftTypeId must be a positive integer");
    }

    return prisma.aircraft.create({
      data: {
        tailNumber: normalizeTailNumber(input.tailNumber),
        aircraftTypeId: input.aircraftTypeId,
        status: input.status ?? undefined,
      },
      include: defaultAircraftInclude,
    });
  }

  static async updateAircraft(input: UpdateAircraftInput) {
    if (!Number.isInteger(input.id) || input.id <= 0) {
      throw new Error("id must be a positive integer");
    }

    const data: Prisma.AircraftUncheckedUpdateInput = {};

    if (typeof input.tailNumber === "string") {
      data.tailNumber = normalizeTailNumber(input.tailNumber);
    }

    if (typeof input.aircraftTypeId === "number") {
      data.aircraftTypeId = input.aircraftTypeId;
    }

    if (input.status) {
      data.status = input.status;
    }

    if (Object.keys(data).length === 0) {
      throw new Error("No fields provided to update");
    }

    return prisma.aircraft.update({
      where: { id: input.id },
      data,
      include: defaultAircraftInclude,
    });
  }

  static async deleteAircraft(id: number) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("id must be a positive integer");
    }

    return prisma.aircraft.delete({
      where: { id },
      include: defaultAircraftInclude,
    });
  }
}
