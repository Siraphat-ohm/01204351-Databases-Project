import { prisma } from '@/lib/prisma';
import {
  airportPublicSelect,
  type CreateAirportInput,
  type UpdateAirportInput,
} from '@/types/airport.type';
import { Prisma } from '@/generated/prisma/client';

export const airportRepository = {
  findById: (id: string) =>
    prisma.airport.findUnique({
      where: { id },
      select: airportPublicSelect,
    }),

  findByIataCode: (iataCode: string) =>
    prisma.airport.findUnique({
      where: { iataCode },
      select: airportPublicSelect,
    }),

  findAll: (args?: { where?: Prisma.AirportWhereInput; skip?: number; take?: number }) =>
    prisma.airport.findMany({
      ...(args ?? {}),
      select: airportPublicSelect,
      orderBy: { iataCode: 'asc' },
    }),

  create: (data: CreateAirportInput) =>
    prisma.airport.create({
      data,
      select: airportPublicSelect,
    }),

  update: (id: string, data: UpdateAirportInput) =>
    prisma.airport.update({
      where: { id },
      data,
      select: airportPublicSelect,
    }),

  delete: (id: string) =>
    prisma.airport.delete({
      where: { id },
      select: airportPublicSelect,
    }),

  countRoutes: (airportId: string) =>
    prisma.route.count({
      where: {
        OR: [{ originAirportId: airportId }, { destAirportId: airportId }],
      },
    }),

  countStaffAssignments: (airportId: string) =>
    prisma.staffProfile.count({
      where: {
        OR: [{ baseAirportId: airportId }, { stationId: airportId }],
      },
    }),
};
