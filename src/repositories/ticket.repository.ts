import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import {
  ticketAdminInclude,
  type CreateTicketInput,
  type UpdateTicketInput,
} from '@/types/ticket.type';

type TicketFindManyArgs = {
  where?: Prisma.TicketWhereInput;
  skip?: number;
  take?: number;
};

export const ticketRepository = {
  findById: (id: string) =>
    prisma.ticket.findUnique({
      where: { id },
      include: ticketAdminInclude,
    }),

  findAll: (args?: TicketFindManyArgs) =>
    prisma.ticket.findMany({
      where: args?.where,
      skip: args?.skip,
      take: args?.take,
      include: ticketAdminInclude,
      orderBy: { id: 'asc' },
    }),

  findMany: (args: TicketFindManyArgs) =>
    prisma.ticket.findMany({
      where: args.where,
      skip: args.skip,
      take: args.take,
      include: ticketAdminInclude,
      orderBy: { id: 'asc' },
    }),

  count: (where?: Prisma.TicketWhereInput) =>
    prisma.ticket.count({ where }),

  findByUserId: (userId: string) =>
    prisma.ticket.findMany({
      where: {
        booking: { userId },
      },
      include: ticketAdminInclude,
      orderBy: { id: 'asc' },
    }),

  findByBookingId: (bookingId: string) =>
    prisma.ticket.findMany({
      where: { bookingId },
      include: ticketAdminInclude,
      orderBy: { id: 'asc' },
    }),

  findByFlightId: (flightId: string) =>
    prisma.ticket.findMany({
      where: { flightId },
      include: ticketAdminInclude,
      orderBy: { id: 'asc' },
    }),

  findByFlightCode: (flightCode: string) =>
    prisma.ticket.findMany({
      where: {
        flight: {
          flightCode,
        },
      },
      include: ticketAdminInclude,
      orderBy: { id: 'asc' },
    }),

  findSeatAssignment: (flightId: string, seatNumber: string) =>
    prisma.ticket.findFirst({
      where: {
        flightId,
        seatNumber,
      },
    }),

  create: (data: CreateTicketInput) =>
    prisma.ticket.create({
      data,
      include: ticketAdminInclude,
    }),

  update: (id: string, data: UpdateTicketInput) =>
    prisma.ticket.update({
      where: { id },
      data,
      include: ticketAdminInclude,
    }),

  delete: (id: string) =>
    prisma.ticket.delete({
      where: { id },
      include: ticketAdminInclude,
    }),

  checkIn: (id: string, data: { seatNumber?: string; boardingPass?: string }) =>
    prisma.ticket.update({
      where: { id },
      data: {
        checkedIn: true,
        checkedInAt: new Date(),
        ...(data.seatNumber ? { seatNumber: data.seatNumber } : {}),
        ...(data.boardingPass ? { boardingPass: data.boardingPass } : {}),
      },
      include: ticketAdminInclude,
    }),
};
