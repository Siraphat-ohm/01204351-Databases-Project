import { prisma } from '@/lib/prisma';
import {
  type CreateAircraftTypeInput,
  type UpdateAircraftTypeInput,
} from '@/types/aircraft-type.type';
import { Prisma } from '@/generated/prisma/client';

export const aircraftTypeRepository = {
  findById: (id: string, include?: Prisma.AircraftTypeInclude) =>
    prisma.aircraftType.findUniqueOrThrow({ where: { id }, include }),

  findByIataCode: (iataCode: string, include?: Prisma.AircraftTypeInclude) =>
    prisma.aircraftType.findUniqueOrThrow({ where: { iataCode }, include }),

  findAll: (args?: { where?: Prisma.AircraftTypeWhereInput; skip?: number; take?: number; include?: Prisma.AircraftTypeInclude }) =>
    prisma.aircraftType.findMany({
      ...(args ?? {}),
      orderBy: { iataCode: 'asc' },
    }),

  count: (where?: Prisma.AircraftTypeWhereInput) =>
    prisma.aircraftType.count({ where }),

  create: (data: CreateAircraftTypeInput, include?: Prisma.AircraftTypeInclude) =>
    prisma.aircraftType.create({
      data: {
        iataCode: data.iataCode,
        model: data.model,
        capacityEco: data.capacityEco,
        capacityBiz: data.capacityBiz,
        capacityFirst: data.capacityFirst ?? 0,
      },
      include,
    }),

  update: (id: string, data: UpdateAircraftTypeInput, include?: Prisma.AircraftTypeInclude) =>
    prisma.aircraftType.update({
      where: { id },
      data,
      include,
    }),

  delete: (id: string, include?: Prisma.AircraftTypeInclude) =>
    prisma.aircraftType.delete({
      where: { id },
      include,
    }),

  countFleet: (aircraftTypeId: string) =>
    prisma.aircraft.count({
      where: { aircraftTypeId },
    }),
};
