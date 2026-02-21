import { prisma } from '@/lib/prisma';
import {
  flightAdminInclude,
  type CreateFlightInput,
  type UpdateFlightInput,
} from '@/types/flight.type';
import { Prisma, TicketClass } from '@/generated/prisma/client';
import {
  FlightCodeSearchSchema,
  type FlightCodeSearchParams,
  FlightSearchSchema,
  type FlightSearchParams,
} from '@/schema/flight.schema';

export const flightRepository = {
  findByIdForRole: (id: string, role: string) => {
    if (role === 'ADMIN') return flightRepository.findById(id);
    return flightRepository.findById(id);
  },

  findByCodeForRole: (flightCode: string, role: string) => {
    if (role === 'ADMIN') return flightRepository.findByCode(flightCode);
    return flightRepository.findByCode(flightCode);
  },

  findAllForRole: (role: string) => {
    if (role === 'ADMIN') return flightRepository.findAll();
    return flightRepository.findAll();
  },

  findById: (id: string) =>
    prisma.flight.findUnique({
      where: { id },
      include: flightAdminInclude,
    }),

  findByCode: (flightCode: string) =>
    prisma.flight.findUnique({
      where: { flightCode },
      include: flightAdminInclude,
    }),

  findDetailByCode: (params: FlightCodeSearchParams) => {
    const { flightCode } = FlightCodeSearchSchema.parse(params);
    return prisma.flight.findUnique({
      where: { flightCode },
      include: flightAdminInclude,
    });
  },

  findAll: (args?: { where?: Prisma.FlightWhereInput; skip?: number; take?: number }) =>
    prisma.flight.findMany({
      ...(args ?? {}),
      include: flightAdminInclude,
      orderBy: { departureTime: 'asc' },
    }),

  findMany: (args: { where?: Prisma.FlightWhereInput; skip?: number; take?: number }) =>
    prisma.flight.findMany({
      ...args,
      include: flightAdminInclude,
      orderBy: { departureTime: 'asc' },
    }),

  count: (where?: Prisma.FlightWhereInput) =>
    prisma.flight.count({ where }),

  searchAvailable: async (params: FlightSearchParams) => {
    const { page, limit, originIataCode, destinationIataCode, departureDate } =
      FlightSearchSchema.parse(params);

    const where: Prisma.FlightWhereInput = {
      status: 'SCHEDULED',
    };

    if (originIataCode || destinationIataCode) {
      const routeFilter: Prisma.RouteWhereInput = {};

      if (originIataCode) {
        routeFilter.origin = { iataCode: originIataCode };
      }

      if (destinationIataCode) {
        routeFilter.destination = { iataCode: destinationIataCode };
      }

      where.route = routeFilter;
    }

    if (departureDate) {
      const startDate = new Date(departureDate);
      const endDate = new Date(departureDate);
      endDate.setDate(endDate.getDate() + 1);

      where.departureTime = {
        gte: startDate,
        lt: endDate,
      };
    }

    const skip = (page - 1) * limit;

    const [data, total] = await prisma.$transaction([
      prisma.flight.findMany({
        where,
        include: flightAdminInclude,
        skip,
        take: limit,
        orderBy: {
          departureTime: 'asc',
        },
      }),
      prisma.flight.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
      },
    };
  },

  create: (data: CreateFlightInput) =>
    prisma.flight.create({
      data: {
        flightCode: data.flightCode,
        routeId: data.routeId,
        aircraftId: data.aircraftId,
        captainId: data.captainId ?? null,
        gate: data.gate ?? null,
        status: data.status,
        departureTime: data.departureTime,
        arrivalTime: data.arrivalTime,
        basePriceEconomy: data.basePriceEconomy,
        basePriceBusiness: data.basePriceBusiness,
        basePriceFirst: data.basePriceFirst,
      },
      include: flightAdminInclude,
    }),

  update: (id: string, data: UpdateFlightInput) =>
    prisma.flight.update({
      where: { id },
      data,
      include: flightAdminInclude,
    }),

  delete: (id: string) =>
    prisma.flight.delete({
      where: { id },
      include: flightAdminInclude,
    }),

  countBookings: (flightId: string) =>
    prisma.booking.count({
      where: { flightId },
    }),

  findSeatedTickets: (flightId: string) =>
    prisma.ticket.findMany({
      where: {
        flightId,
        seatNumber: { not: null },
      },
      select: {
        id: true,
        class: true,
        seatNumber: true,
      },
      orderBy: { id: 'asc' },
    }) as Promise<Array<{ id: string; class: TicketClass; seatNumber: string | null }>>,

  changeAircraftAndSeats: async (params: {
    flightId: string;
    newAircraftId: string;
    seatAssignments: Array<{ ticketId: string; seatNumber: string }>;
  }) =>
    prisma.$transaction(async (tx) => {
      await tx.flight.update({
        where: { id: params.flightId },
        data: { aircraftId: params.newAircraftId },
      });

      const ticketIds = params.seatAssignments.map((a) => a.ticketId);

      if (ticketIds.length > 0) {
        await tx.ticket.updateMany({
          where: {
            id: { in: ticketIds },
            flightId: params.flightId,
          },
          data: {
            seatNumber: null,
            checkedIn: false,
            checkedInAt: null,
            boardingPass: null,
          },
        });

        for (const assignment of params.seatAssignments) {
          await tx.ticket.update({
            where: { id: assignment.ticketId },
            data: { seatNumber: assignment.seatNumber },
          });
        }
      }

      return tx.flight.findUnique({
        where: { id: params.flightId },
        include: flightAdminInclude,
      });
    }),
};
