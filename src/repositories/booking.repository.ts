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
};
