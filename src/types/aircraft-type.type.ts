import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';

export const aircraftTypeIataCodeSchema = z
  .string()
  .length(3, { message: 'Aircraft type IATA code must be exactly 3 characters' })
  .toUpperCase();

export const createAircraftTypeSchema = z.object({
  iataCode: aircraftTypeIataCodeSchema,
  model: z.string().min(2, { message: 'Model is required' }),
  capacityEco: z.number().int().min(0),
  capacityBiz: z.number().int().min(0),
  capacityFirst: z.number().int().min(0).optional(),
});

export const updateAircraftTypeSchema = z
  .object({
    iataCode: aircraftTypeIataCodeSchema.optional(),
    model: z.string().min(2).optional(),
    capacityEco: z.number().int().min(0).optional(),
    capacityBiz: z.number().int().min(0).optional(),
    capacityFirst: z.number().int().min(0).optional(),
  })
  .refine(
    (data) =>
      data.iataCode ||
      data.model ||
      data.capacityEco !== undefined ||
      data.capacityBiz !== undefined ||
      data.capacityFirst !== undefined,
    { message: 'At least one field must be provided for update' },
  );

export type CreateAircraftTypeInput = z.infer<typeof createAircraftTypeSchema>;
export type UpdateAircraftTypeInput = z.infer<typeof updateAircraftTypeSchema>;

export const aircraftTypeAdminInclude = {
  seatLayout: {
    include: {
      cabins: {
        orderBy: { sortOrder: 'asc' as const },
      },
    },
  },
} satisfies Prisma.AircraftTypeInclude;

export type AircraftTypeAdmin = Prisma.AircraftTypeGetPayload<{
  include: typeof aircraftTypeAdminInclude;
}>;
