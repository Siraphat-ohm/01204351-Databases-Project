import { z } from 'zod';
import { Prisma, BookingStatus } from '@/generated/prisma/client';

export const bookingRefSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^BK[A-Z0-9]{6,14}$/, 'Booking ref must match format BKXXXXXX');

export const createBookingSchema = z.object({
  bookingRef: bookingRefSchema.optional(),
  userId: z.cuid({ message: 'Invalid user ID' }),
  flightId: z.cuid({ message: 'Invalid flight ID' }),
  totalPrice: z.number().positive({ message: 'Total price must be positive' }),
  currency: z.string().trim().min(3).max(3).default('THB'),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().trim().min(6).max(30).optional().nullable(),
});

export const updateBookingStatusSchema = z.object({
  status: z.nativeEnum(BookingStatus),
});

export const changeFlightSchema = z.object({
  newFlightId: z.cuid({ message: 'Invalid new flight ID' }),
  reason: z
    .enum(['FLIGHT_CANCELLED', 'MAJOR_DELAY', 'ROUTE_DISRUPTION', 'AIRCRAFT_DOWNSIZE'])
    .default('MAJOR_DELAY'),
  keepSeatAssignments: z.boolean().default(false),
  totalPrice: z.number().positive().optional(),
  currency: z.string().trim().min(3).max(3).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type ChangeFlightInput = z.infer<typeof changeFlightSchema>;

export const bookingAdminInclude = {
  user: true,
  flight: {
    include: {
      route: { include: { origin: true, destination: true } },
      aircraft: { include: { type: true } },
    },
  },
  tickets: true,
  transactions: true,
} satisfies Prisma.BookingInclude;

export type BookingAdmin = Prisma.BookingGetPayload<{
  include: typeof bookingAdminInclude;
}>;
