import { z } from 'zod';
import { Prisma, TicketClass } from '@/generated/prisma/client';

export const seatNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^\d{1,2}[A-Z]$/, 'Seat number must match format like 12A');

export const checkInTicketSchema = z.object({
  seatNumber: seatNumberSchema.optional(),
  boardingPass: z.string().trim().min(4).optional(),
});

export type CheckInTicketInput = z.infer<typeof checkInTicketSchema>;

export const ticketAdminInclude = {
  booking: {
    include: {
      user: true,
    },
  },
  flight: {
    include: {
      route: { include: { origin: true, destination: true } },
      aircraft: { include: { type: true } },
    },
  },
} satisfies Prisma.TicketInclude;

export type TicketAdmin = Prisma.TicketGetPayload<{
  include: typeof ticketAdminInclude;
}>;

export const ticketCreateSchema = z.object({
  bookingId: z.cuid({ message: 'Invalid booking ID' }),
  flightId: z.cuid({ message: 'Invalid flight ID' }),
  class: z.nativeEnum(TicketClass).default(TicketClass.ECONOMY),
  seatNumber: seatNumberSchema.optional(),
  price: z.number().positive(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.coerce.date().optional(),
  passportNumber: z.string().optional(),
  nationality: z.string().optional(),
  gender: z.string().optional(),
});

export type CreateTicketInput = z.infer<typeof ticketCreateSchema>;
