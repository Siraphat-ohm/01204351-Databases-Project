import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import {
  type CreateTicketInput,
  type UpdateTicketInput,
} from '@/types/ticket.type';

type TicketFindManyArgs = {
  where?: Prisma.TicketWhereInput;
  skip?: number;
  take?: number;
  include?: Prisma.TicketInclude;
};

export const ticketRepository = {
  findById: (id: string, include?: Prisma.TicketInclude) =>
    prisma.ticket.findUniqueOrThrow({ where: { id }, include }),

  findAll: (args?: TicketFindManyArgs) =>
    prisma.ticket.findMany({
      where: args?.where,
      skip: args?.skip,
      take: args?.take,
      include: args?.include,
      orderBy: { id: 'asc' },
    }),

  findMany: (args: TicketFindManyArgs) =>
    prisma.ticket.findMany({
      where: args.where,
      skip: args.skip,
      take: args.take,
      include: args.include,
      orderBy: { id: 'asc' },
    }),

  count: (where?: Prisma.TicketWhereInput) =>
    prisma.ticket.count({ where }),

  findByUserId: (userId: string, include?: Prisma.TicketInclude) =>
    prisma.ticket.findMany({
      where: { booking: { userId } },
      include,
      orderBy: { id: 'asc' },
    }),

  findByBookingId: (bookingId: string, include?: Prisma.TicketInclude) =>
    prisma.ticket.findMany({
      where: { bookingId },
      include,
      orderBy: { id: 'asc' },
    }),

  findByFlightId: (flightId: string, include?: Prisma.TicketInclude) =>
    prisma.ticket.findMany({
      where: { flightId },
      include,
      orderBy: { id: 'asc' },
    }),

  findByFlightCode: (flightCode: string, include?: Prisma.TicketInclude) =>
    prisma.ticket.findMany({
      where: { flight: { flightCode } },
      include,
      orderBy: { id: 'asc' },
    }),

  findSeatAssignment: (flightId: string, seatNumber: string) =>
    prisma.ticket.findFirst({
      where: { flightId, seatNumber },
    }),

  create: (data: CreateTicketInput, include?: Prisma.TicketInclude) =>
    prisma.ticket.create({ data, include }),

  update: (id: string, data: UpdateTicketInput, include?: Prisma.TicketInclude) =>
    prisma.ticket.update({ where: { id }, data, include }),

  delete: (id: string, include?: Prisma.TicketInclude) =>
    prisma.ticket.delete({ where: { id }, include }),

  checkIn: (id: string, data: { seatNumber?: string; boardingPass?: string }, include?: Prisma.TicketInclude) =>
    prisma.ticket.update({
      where: { id },
      data: {
        checkedIn: true,
        checkedInAt: new Date(),
        ...(data.seatNumber ? { seatNumber: data.seatNumber } : {}),
        ...(data.boardingPass ? { boardingPass: data.boardingPass } : {}),
      },
      include,
    }),
};
