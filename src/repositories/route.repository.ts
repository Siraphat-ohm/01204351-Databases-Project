import { prisma } from '@/lib/prisma';
import {
  routePublicSelect,
  routeAdminInclude,
  type CreateRouteInput,
  type UpdateRouteInput,
} from '@/types/route.type';

export const routeRepository = {
  isAdminRole: (role: string) => role?.trim().toUpperCase() === 'ADMIN',

  findByIdPublic: (id: string) =>
    prisma.route.findUnique({
      where: { id },
      select: routePublicSelect,
    }),

  findByIdAdmin: (id: string) =>
    prisma.route.findUnique({
      where: { id },
      include: routeAdminInclude,
    }),

  findByIdForRole: (id: string, role: string) => {
    if (routeRepository.isAdminRole(role)) return routeRepository.findByIdAdmin(id);
    return routeRepository.findByIdPublic(id);
  },

  findByIataCodes: (originCode: string, destCode: string) =>
    prisma.route.findFirst({
      where: {
        origin:      { iataCode: originCode },
        destination: { iataCode: destCode },
      },
      select: routePublicSelect,
    }),

  findByAirportIds: (originAirportId: string, destAirportId: string) =>
    prisma.route.findUnique({
      where: {
        originAirportId_destAirportId: { originAirportId, destAirportId },
      },
    }),

  findByAirportIdsEitherDirection: (airportAId: string, airportBId: string) =>
    prisma.route.findFirst({
      where: {
        OR: [
          {
            originAirportId: airportAId,
            destAirportId: airportBId,
          },
          {
            originAirportId: airportBId,
            destAirportId: airportAId,
          },
        ],
      },
    }),

  findDistinctOrigins: () =>
    prisma.airport.findMany({
      where: { origins: { some: {} } },
      select: {
        id:       true,
        iataCode: true,
        name:     true,
        city:     true,
        country:  true,
      },
      orderBy: { iataCode: 'asc' },
    }),

  findDestinationsByOrigin: (originCode: string) =>
    prisma.airport.findMany({
      where: {
        destinations: {
          some: { origin: { iataCode: originCode } },
        },
      },
      select: {
        id:       true,
        iataCode: true,
        name:     true,
        city:     true,
        country:  true,
      },
      orderBy: { iataCode: 'asc' },
    }),

  findAll: () =>
    prisma.route.findMany({
      include: routeAdminInclude,
      orderBy: [
        { origin:      { iataCode: 'asc' } },
        { destination: { iataCode: 'asc' } },
      ],
    }),

  create: (data: Omit<CreateRouteInput, 'createReturn'>) =>
    prisma.route.create({
      data: {
        originAirportId: data.originAirportId,
        destAirportId:   data.destAirportId,
        distanceKm:      data.distanceKm,
        durationMins:    data.durationMins,
      },
      include: routeAdminInclude,
    }),

  createWithReturn: (data: Omit<CreateRouteInput, 'createReturn'>) =>
    prisma.$transaction([
      prisma.route.create({
        data: {
          originAirportId: data.originAirportId,
          destAirportId:   data.destAirportId,
          distanceKm:      data.distanceKm,
          durationMins:    data.durationMins,
        },
        include: routeAdminInclude,
      }),
      prisma.route.create({
        data: {
          originAirportId: data.destAirportId,
          destAirportId:   data.originAirportId,
          distanceKm:      data.distanceKm,
          durationMins:    data.durationMins,
        },
        include: routeAdminInclude,
      }),
    ]),

  update: (id: string, data: UpdateRouteInput) =>
    prisma.route.update({
      where: { id },
      data,
      include: routeAdminInclude,
    }),

  delete: (id: string) =>
    prisma.route.delete({ where: { id } }),

  countActiveFlights: (routeId: string) =>
    prisma.flight.count({
      where: {
        routeId,
        status: { in: ['SCHEDULED', 'BOARDING', 'DEPARTED'] },
      },
    }),
};