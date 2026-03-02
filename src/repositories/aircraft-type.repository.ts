import { prisma } from '@/lib/prisma';
import {
  aircraftTypeAdminInclude,
  type CreateAircraftTypeInput,
  type UpdateAircraftTypeInput,
} from '@/types/aircraft-type.type';
import { Prisma } from '@/generated/prisma/client';

export const aircraftTypeRepository = {
  findById: (id: string, include?: Prisma.AircraftTypeInclude) =>
    prisma.aircraftType.findUnique({ where: { id }, include }),

  findByIataCode: (iataCode: string, include?: Prisma.AircraftTypeInclude) =>
    prisma.aircraftType.findUnique({ where: { iataCode }, include }),

  findAll: (args?: { where?: Prisma.AircraftTypeWhereInput; skip?: number; take?: number }) =>
    prisma.aircraftType.findMany({
      ...(args ?? {}),
      include: aircraftTypeAdminInclude,
      orderBy: { iataCode: 'asc' },
    }),

  count: (where?: Prisma.AircraftTypeWhereInput) =>
    prisma.aircraftType.count({ where }),

  create: (data: CreateAircraftTypeInput) =>
    prisma.aircraftType.create({
      data: {
        iataCode: data.iataCode,
        model: data.model,
        capacityEco: data.capacityEco,
        capacityBiz: data.capacityBiz,
        capacityFirst: data.capacityFirst ?? 0,
      },
      include: aircraftTypeAdminInclude,
    }),

  update: (id: string, data: UpdateAircraftTypeInput) =>
    prisma.aircraftType.update({
      where: { id },
      data,
      include: aircraftTypeAdminInclude,
    }),

  delete: (id: string) =>
    prisma.aircraftType.delete({
      where: { id },
      include: aircraftTypeAdminInclude,
    }),

  countFleet: (aircraftTypeId: string) =>
    prisma.aircraft.count({
      where: { aircraftTypeId },
    }),
};
