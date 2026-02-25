import { z } from 'zod';
import { Prisma, AircraftStatus } from '@/generated/prisma/client';

export const createAircraftSchema = z.object({
  tailNumber: z.string().min(2, { message: 'Tail number is required' }),
  aircraftTypeId: z.cuid({ message: 'Invalid aircraft type ID' }),
  status: z.enum(AircraftStatus).optional(),
});

export const updateAircraftSchema = z
  .object({
    tailNumber: z.string().min(2).optional(),
    aircraftTypeId: z.cuid().optional(),
    status: z.enum(AircraftStatus).optional(),
  })
  .refine(
    (data) => data.tailNumber || data.aircraftTypeId || data.status,
    { message: 'At least one field must be provided for update' },
  );

export type CreateAircraftInput = z.infer<typeof createAircraftSchema>;
export type UpdateAircraftInput = z.infer<typeof updateAircraftSchema>;

export const aircraftAdminInclude = {
  type: true,
} satisfies Prisma.AircraftInclude;

export type AircraftAdmin = Prisma.AircraftGetPayload<{
  include: typeof aircraftAdminInclude;
}>;
