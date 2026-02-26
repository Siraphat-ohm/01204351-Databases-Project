import { prisma } from '@/lib/prisma';
import {
  bookingAdminInclude,
  type BookingTicketInput,
  type CreateBookingInput,
} from '@/types/booking.type';
import type { Prisma } from '@/generated/prisma/client';
import { BookingStatus } from '@/generated/prisma/client';

type BookingFindManyArgs = {
  where?: Prisma.BookingWhereInput;
  skip?: number;
  take?: number;
};

export const bookingRepository = {
  findById: (id: string) =>
    prisma.booking.findUnique({
      where: { id },
      include: bookingAdminInclude,
    }),

  findByBookingRef: (bookingRef: string) =>
    prisma.booking.findUnique({
      where: { bookingRef },
      include: bookingAdminInclude,
    }),

  findAll: (args?: BookingFindManyArgs) =>
    prisma.booking.findMany({
      where: args?.where,
      skip: args?.skip,
      take: args?.take,
      include: bookingAdminInclude,
      orderBy: { createdAt: 'desc' },
    }),

  findMany: (args: BookingFindManyArgs) =>
    prisma.booking.findMany({
      where: args.where,
      skip: args.skip,
      take: args.take,
      include: bookingAdminInclude,
      orderBy: { createdAt: 'desc' },
    }),

  count: (where?: Prisma.BookingWhereInput) =>
    prisma.booking.count({ where }),

  findByUserId: (userId: string) =>
    prisma.booking.findMany({
      where: { userId },
      include: bookingAdminInclude,
      orderBy: { createdAt: 'desc' },
    }),

  findByFlightId: (flightId: string) =>
    prisma.booking.findMany({
      where: { flightId },
      include: bookingAdminInclude,
      orderBy: { createdAt: 'desc' },
    }),

  findByFlightCode: (flightCode: string) =>
    prisma.booking.findMany({
      where: {
        flight: {
          flightCode,
        },
      },
      include: bookingAdminInclude,
      orderBy: { createdAt: 'desc' },
    }),

  create: (data: CreateBookingInput & { bookingRef: string }) =>
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
      include: bookingAdminInclude,
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
  }) =>
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
        include: bookingAdminInclude,
      });
    }),

  update: (id: string, data: Partial<CreateBookingInput>) =>
    prisma.booking.update({
      where: { id },
      data,
      include: bookingAdminInclude,
    }),

  delete: (id: string) =>
    prisma.booking.delete({
      where: { id },
      include: bookingAdminInclude,
    }),

  updateStatus: (id: string, status: BookingStatus) =>
    prisma.booking.update({
      where: { id },
      data: { status },
      include: bookingAdminInclude,
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
  }) => {
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
        include: bookingAdminInclude,
      });
    });
  },
};
