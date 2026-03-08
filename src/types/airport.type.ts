import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';

export const iataCodeSchema = z
  .string()
  .length(3, { message: 'IATA code must be exactly 3 characters' })
  .toUpperCase();

export const createAirportSchema = z.object({
  iataCode: iataCodeSchema,
  name: z.string().min(2, { message: 'Airport name is required' }),
  city: z.string().min(2, { message: 'City is required' }),
  country: z.string().min(2, { message: 'Country is required' }),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export const updateAirportSchema = z
  .object({
    iataCode: iataCodeSchema.optional(),
    name: z.string().min(2).optional(),
    city: z.string().min(2).optional(),
    country: z.string().min(2).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lon: z.number().min(-180).max(180).optional(),
  })
  .refine(
    (data) =>
      data.iataCode ||
      data.name ||
      data.city ||
      data.country ||
      data.lat !== undefined ||
      data.lon !== undefined,
    { message: 'At least one field must be provided for update' },
  );

export type CreateAirportInput = z.infer<typeof createAirportSchema>;
export type UpdateAirportInput = z.infer<typeof updateAirportSchema>;
export type AirportServiceAction = 'create' | 'read' | 'update' | 'delete';
export type AirportListItem = AirportPublic;

export const airportPublicSelect = {
  id: true,
  iataCode: true,
  name: true,
  city: true,
  country: true,
  lat: true,
  lon: true,
} satisfies Prisma.AirportSelect;

export type AirportPublic = Prisma.AirportGetPayload<{
  select: typeof airportPublicSelect;
}>;
