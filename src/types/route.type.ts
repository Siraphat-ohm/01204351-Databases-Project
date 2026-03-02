import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';


export const createRouteSchema = z.object({
  originAirportId: z.cuid({ message: 'Invalid origin airport ID' }),
  destAirportId:   z.cuid({ message: 'Invalid destination airport ID' }),
  distanceKm:      z.number().int().positive({ message: 'Distance must be a positive integer' }),
  durationMins:    z.number().int().positive({ message: 'Duration must be a positive integer' }).optional(),
  createReturn:    z.boolean().default(false),
}).refine(
  (data) => data.originAirportId !== data.destAirportId,
  { message: 'Origin and destination airports must be different', path: ['destAirportId'] },
);

export const updateRouteSchema = z.object({
  distanceKm:   z.number().int().positive().optional(),
  durationMins: z.number().int().positive().optional(),
}).refine(
  (data) => data.distanceKm !== undefined || data.durationMins !== undefined,
  { message: 'At least one field must be provided for update' },
);

export const iataCodeSchema = z
  .string()
  .length(3, { message: 'IATA code must be exactly 3 characters' })
  .toUpperCase();


export type CreateRouteInput = z.infer<typeof createRouteSchema>;
export type UpdateRouteInput = z.infer<typeof updateRouteSchema>;
export type RouteServiceAction = 'create' | 'read' | 'update' | 'delete';
export type RouteListItem = RouteAdmin;


export const routePublicSelect = {
  id:           true,
  distanceKm:   true,
  durationMins: true,
  origin: {
    select: {
      iataCode: true,
      name:     true,
      city:     true,
      country:  true,
    },
  },
  destination: {
    select: {
      iataCode: true,
      name:     true,
      city:     true,
      country:  true,
    },
  },
} satisfies Prisma.RouteSelect;

export const routeAdminInclude = {
  origin:      true,
  destination: true,
  flights: {
    select: {
      id:            true,
      flightCode:    true,
      status:        true,
      departureTime: true,
      arrivalTime:   true,
    },
    orderBy: { departureTime: 'asc' as const },
    take: 10,
  },
} satisfies Prisma.RouteInclude;


export type RoutePublic = Prisma.RouteGetPayload<{
  select: typeof routePublicSelect;
}>;

export type RouteAdmin = Prisma.RouteGetPayload<{
  include: typeof routeAdminInclude;
}>;