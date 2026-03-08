import { prisma } from '@/lib/prisma';
import {
  type BookingTicketInput,
  type CreateBookingInput,
} from '@/types/booking.type';
import type { Prisma } from '@/generated/prisma/client';
import { BookingStatus } from '@/generated/prisma/client';

type BookingFindManyArgs = {
  where?: Prisma.BookingWhereInput;
  skip?: number;
  take?: number;
  include?: Prisma.BookingInclude;
};

export const bookingRepository = {
  findById: (id: string, include?: Prisma.BookingInclude) =>
    prisma.booking.findUniqueOrThrow({ where: { id }, include }),

  findByBookingRef: (bookingRef: string, include?: Prisma.BookingInclude) =>
    prisma.booking.findUniqueOrThrow({ where: { bookingRef }, include }),

  findAll: (args?: BookingFindManyArgs) =>
    prisma.booking.findMany({
      where: args?.where,
      skip: args?.skip,
      take: args?.take,
      include: args?.include,
      orderBy: { createdAt: 'desc' },
    }),

  findMany: (args: BookingFindManyArgs) =>
    prisma.booking.findMany({
      where: args.where,
      skip: args.skip,
      take: args.take,
      include: args.include,
      orderBy: { createdAt: 'desc' },
    }),

  count: (where?: Prisma.BookingWhereInput) =>
    prisma.booking.count({ where }),

  findByUserId: (userId: string, include?: Prisma.BookingInclude) =>
    prisma.booking.findMany({
      where: { userId },
      include,
      orderBy: { createdAt: 'desc' },
    }),

  findByFlightId: (flightId: string, include?: Prisma.BookingInclude) =>
    prisma.booking.findMany({
      where: { flightId },
      include,
      orderBy: { createdAt: 'desc' },
    }),

  findByFlightCode: (flightCode: string, include?: Prisma.BookingInclude) =>
    prisma.booking.findMany({
      where: {
        flight: {
          flightCode,
        },
      },
      include,
      orderBy: { createdAt: 'desc' },
    }),

  create: (data: CreateBookingInput & { bookingRef: string }, include?: Prisma.BookingInclude) =>
    prisma.booking.create({
      data: {
        bookingRef: data.bookingRef,
        userId: data.userId,
        flightId: data.flightId,
        totalPrice: data.totalPrice,
        currency: data.currency,
        contactEmail: data.contactEmail ?? null,
        contactPhone: data.contactPhone ?? null,
      },
      include,
    }),

  findOccupiedSeats: (flightId: string, seatNumbers: string[]) =>
    prisma.ticket.findMany({
      where: {
        flightId,
        seatNumber: { in: seatNumbers },
      },
      select: { seatNumber: true },
    }),

  createWithTickets: (params: {
    booking: CreateBookingInput & { bookingRef: string };
    tickets: BookingTicketInput[];
  }, include?: Prisma.BookingInclude) =>
    prisma.$transaction(async (tx) => {
      const createdBooking = await tx.booking.create({
        data: {
          bookingRef: params.booking.bookingRef,
          userId: params.booking.userId,
          flightId: params.booking.flightId,
          totalPrice: params.booking.totalPrice,
          currency: params.booking.currency,
          contactEmail: params.booking.contactEmail ?? null,
          contactPhone: params.booking.contactPhone ?? null,
        },
      });

      await tx.ticket.createMany({
        data: params.tickets.map((t) => ({
          bookingId: createdBooking.id,
          flightId: params.booking.flightId,
          class: t.class,
          seatNumber: t.seatNumber,
          price: t.price,
          firstName: t.firstName,
          lastName: t.lastName,
          dateOfBirth: t.dateOfBirth,
          passportNumber: t.passportNumber,
          nationality: t.nationality,
          gender: t.gender,
          seatSurcharge: t.seatSurcharge,
        })),
      });

      return tx.booking.findUnique({
        where: { id: createdBooking.id },
        include,
      });
    }),

  update: (id: string, data: Partial<CreateBookingInput>, include?: Prisma.BookingInclude) =>
    prisma.booking.update({
      where: { id },
      data,
      include,
    }),

  delete: (id: string, include?: Prisma.BookingInclude) =>
    prisma.booking.delete({
      where: { id },
      include,
    }),

  updateStatus: (id: string, status: BookingStatus, include?: Prisma.BookingInclude) =>
    prisma.booking.update({
      where: { id },
      data: { status },
      include,
    }),

  markReaccommodationPendingByTicketIds: async (ticketIds: string[]) => {
    if (ticketIds.length === 0) return [] as string[];

    const ticketRows = await prisma.ticket.findMany({
      where: { id: { in: ticketIds } },
      select: { bookingId: true },
    });

    const bookingIds = Array.from(new Set(ticketRows.map((t) => t.bookingId)));
    if (bookingIds.length === 0) return [] as string[];

    await prisma.booking.updateMany({
      where: {
        id: { in: bookingIds },
        status: { not: BookingStatus.CANCELLED },
      },
      data: {
        status: BookingStatus.REACCOMMODATION_PENDING,
      },
    });

    return bookingIds;
  },

  changeFlight: async (params: {
    bookingId: string;
    newFlightId: string;
    newBookingRef: string;
    totalPrice?: number;
    currency?: string;
    keepSeatAssignments?: boolean;
  }, include?: Prisma.BookingInclude) => {
    const oldBooking = await prisma.booking.findUnique({
      where: { id: params.bookingId },
      include: {
        tickets: true,
      },
    });

    if (!oldBooking) return null;

    return prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: params.bookingId },
        data: { status: BookingStatus.CANCELLED },
      });

      const created = await tx.booking.create({
        data: {
          bookingRef: params.newBookingRef,
          userId: oldBooking.userId,
          flightId: params.newFlightId,
          status: BookingStatus.CONFIRMED,
          totalPrice: params.totalPrice ?? oldBooking.totalPrice,
          currency: params.currency ?? oldBooking.currency,
          contactEmail: oldBooking.contactEmail,
          contactPhone: oldBooking.contactPhone,
        },
      });

      if (oldBooking.tickets.length > 0) {
        await tx.ticket.createMany({
          data: oldBooking.tickets.map((t) => ({
            bookingId: created.id,
            flightId: params.newFlightId,
            class: t.class,
            seatNumber: params.keepSeatAssignments ? t.seatNumber : null,
            price: t.price,
            firstName: t.firstName,
            lastName: t.lastName,
            dateOfBirth: t.dateOfBirth,
            passportNumber: t.passportNumber,
            nationality: t.nationality,
            gender: t.gender,
            checkedIn: false,
            checkedInAt: null,
            boardingPass: null,
            seatSurcharge: t.seatSurcharge,
          })),
        });
      }

      return tx.booking.findUnique({
        where: { id: created.id },
        include,
      });
    });
  },
};
