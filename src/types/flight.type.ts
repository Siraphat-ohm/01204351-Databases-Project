import { z } from 'zod';
import { Prisma, FlightStatus } from '@/generated/prisma/client';

export const flightCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^YK\d{5}$/, 'Flight code must match format YK00000');

export const createFlightSchema = z.object({
  flightCode: flightCodeSchema,
  routeId: z.cuid({ message: 'Invalid route ID' }),
  aircraftId: z.cuid({ message: 'Invalid aircraft ID' }),
  captainId: z.cuid().optional().nullable(),
  gate: z.string().min(1).optional().nullable(),
  status: z.enum(FlightStatus).optional(),
  departureTime: z.coerce.date(),
  arrivalTime: z.coerce.date(),
  basePriceEconomy: z.number().positive(),
  basePriceBusiness: z.number().positive(),
  basePriceFirst: z.number().positive(),
});

export const updateFlightSchema = z
  .object({
    flightCode: flightCodeSchema.optional(),
    routeId: z.cuid().optional(),
    aircraftId: z.cuid().optional(),
    captainId: z.cuid().optional().nullable(),
    gate: z.string().min(1).optional().nullable(),
    status: z.enum(FlightStatus).optional(),
    departureTime: z.coerce.date().optional(),
    arrivalTime: z.coerce.date().optional(),
    basePriceEconomy: z.number().positive().optional(),
    basePriceBusiness: z.number().positive().optional(),
    basePriceFirst: z.number().positive().optional(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    { message: 'At least one field must be provided for update' },
  );

export const changeFlightAircraftSchema = z.object({
  aircraftId: z.cuid({ message: 'Invalid aircraft ID' }),
});

export type CreateFlightInput = z.infer<typeof createFlightSchema>;
export type UpdateFlightInput = z.infer<typeof updateFlightSchema>;
export type ChangeFlightAircraftInput = z.infer<typeof changeFlightAircraftSchema>;

export const flightAdminInclude = {
  route: {
    include: { origin: true, destination: true },
  },
  aircraft: {
    include: {
      type: { select: { model: true, iataCode: true } },
    },
  },
  captain: true,
} satisfies Prisma.FlightInclude;

export type FlightAdmin = Prisma.FlightGetPayload<{
  include: typeof flightAdminInclude;
}>;
