import { prisma } from '@/lib/prisma';
import {
  bookingAdminInclude,
  type CreateBookingInput,
} from '@/types/booking.type';
import { BookingStatus } from '@/generated/prisma/client';

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

  findAll: () =>
    prisma.booking.findMany({
      include: bookingAdminInclude,
      orderBy: { createdAt: 'desc' },
    }),

  findByUserId: (userId: string) =>
    prisma.booking.findMany({
      where: { userId },
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
