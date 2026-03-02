import { prisma } from '@/lib/prisma';
import {
  aircraftAdminInclude,
  type CreateAircraftInput,
  type UpdateAircraftInput,
} from '@/types/aircraft.type';
import { Prisma } from '@/generated/prisma/client';

export const aircraftRepository = {
  findById: (id: string, include?: Prisma.AircraftInclude) =>
    prisma.aircraft.findUnique({ where: { id }, include }),

  findByTailNumber: (tailNumber: string, include?: Prisma.AircraftInclude) =>
    prisma.aircraft.findUnique({ where: { tailNumber }, include }),

  findAll: (args?: { where?: Prisma.AircraftWhereInput; skip?: number; take?: number }) =>
    prisma.aircraft.findMany({
      ...(args ?? {}),
      include: aircraftAdminInclude,
      orderBy: { tailNumber: 'asc' },
    }),

  count: (where?: Prisma.AircraftWhereInput) =>
    prisma.aircraft.count({ where }),

  create: (data: CreateAircraftInput) =>
    prisma.aircraft.create({
      data: {
        tailNumber: data.tailNumber,
        aircraftTypeId: data.aircraftTypeId,
        status: data.status,
      },
      include: aircraftAdminInclude,
    }),

  update: (id: string, data: UpdateAircraftInput) =>
    prisma.aircraft.update({
      where: { id },
      data,
      include: aircraftAdminInclude,
    }),

  delete: (id: string) =>
    prisma.aircraft.delete({
      where: { id },
      include: aircraftAdminInclude,
    }),

  countFlights: (aircraftId: string) =>
    prisma.flight.count({
      where: { aircraftId },
    }),
};
