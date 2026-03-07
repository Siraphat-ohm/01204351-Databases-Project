import { z } from 'zod';
import { Prisma, BookingStatus, TicketClass } from '@/generated/prisma/client';

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

export const bookingTicketInputSchema = z.object({
  class: z.enum(TicketClass).default(TicketClass.ECONOMY),
  seatNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[\d]{1,2}[A-Z]$/, 'Seat number must match format like 12A')
    .optional(),
  price: z.number().positive({ message: 'Ticket price must be positive' }),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  dateOfBirth: z.coerce.date().optional(),
  passportNumber: z.string().trim().min(1).optional(),
  nationality: z.string().trim().min(1).optional(),
  gender: z.string().trim().min(1).optional(),
  seatSurcharge: z.number().min(0).optional(),
});

export const createBookingWithTicketsSchema = createBookingSchema.extend({
  tickets: z.array(bookingTicketInputSchema).min(1, 'At least one ticket is required'),
});

export const createGuestBookingSchema = z.object({
  bookingRef: bookingRefSchema.optional(),
  flightId: z.cuid({ message: 'Invalid flight ID' }),
  totalPrice: z.number().positive({ message: 'Total price must be positive' }),
  currency: z.string().trim().min(3).max(3).default('THB'),
  contactEmail: z.string().email(),
  contactPhone: z.string().trim().min(6).max(30).optional().nullable(),
  guestName: z.string().trim().min(2).max(120).optional(),
});

export const createGuestBookingWithTicketsSchema = createGuestBookingSchema.extend({
  tickets: z.array(bookingTicketInputSchema).min(1, 'At least one ticket is required'),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(BookingStatus),
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

export const acceptReaccommodationSchema = z.object({
  newFlightId: z.cuid({ message: 'Invalid new flight ID' }),
  totalPrice: z.number().positive().optional(),
  currency: z.string().trim().min(3).max(3).optional(),
});

export const cancelReaccommodationSchema = z.object({
  reason: z.string().trim().min(2).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type BookingTicketInput = z.infer<typeof bookingTicketInputSchema>;
export type CreateBookingWithTicketsInput = z.infer<typeof createBookingWithTicketsSchema>;
export type CreateGuestBookingInput = z.infer<typeof createGuestBookingSchema>;
export type CreateGuestBookingWithTicketsInput = z.infer<
  typeof createGuestBookingWithTicketsSchema
>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type ChangeFlightInput = z.infer<typeof changeFlightSchema>;
export type AcceptReaccommodationInput = z.infer<typeof acceptReaccommodationSchema>;
export type CancelReaccommodationInput = z.infer<typeof cancelReaccommodationSchema>;
export type BookingServiceAction =
  | 'create'
  | 'read'
  | 'cancel'
  | 'read-all'
  | 'update';
export type BookingListItem = BookingAdmin;

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
