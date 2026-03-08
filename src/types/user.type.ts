import { z } from 'zod';
import type { Prisma } from '@/generated/prisma/client';

// Use string arrays for Zod enums to avoid importing Prisma runtime in client bundles
export const ROLES = ['PASSENGER', 'ADMIN', 'PILOT', 'CABIN_CREW', 'GROUND_STAFF', 'MECHANIC'] as const;
export const RANKS = ['CAPTAIN', 'FIRST_OFFICER', 'PURSER', 'CREW', 'MANAGER', 'SUPERVISOR', 'STAFF'] as const;

export const updateMyProfileSchema = z
  .object({
    name: z.string().min(2).optional(),
    phone: z.string().min(7).max(20).optional().nullable(),
    image: z.string().url().optional().nullable(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.phone !== undefined ||
      data.image !== undefined,
    { message: 'At least one field must be provided for update' },
  );

export const updateUserRoleSchema = z.object({
  role: z.enum(ROLES),
});

export const createAdminUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  phone: z.string().min(7).max(20).optional().nullable(),
  role: z.enum(ROLES).default('PASSENGER'),
  staffProfile: z.object({
    employeeId: z.string().min(3),
    rank: z.enum(RANKS).optional().nullable(),
    baseAirportId: z.string().optional().nullable(),
    stationId: z.string().optional().nullable(),
  }).optional().nullable(),
});

export type UpdateMyProfileInput = z.infer<typeof updateMyProfileSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;

export type UserServiceAction =
  | 'read'
  | 'read-all'
  | 'update-role'
  | 'update'
  | 'delete';

export const userAdminSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  image: true,
  role: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
  staffProfile: {
    select: {
      id: true,
      employeeId: true,
      role: true,
      rank: true,
      baseAirport: {
        select: {
          id: true,
          iataCode: true,
          city: true,
        },
      },
      station: {
        select: {
          id: true,
          iataCode: true,
          city: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

export type UserAdmin = Prisma.UserGetPayload<{
  select: typeof userAdminSelect;
}>;

export const userSelfSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  image: true,
  role: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
  staffProfile: {
    select: {
      id: true,
      employeeId: true,
      role: true,
      rank: true,
      baseAirport: {
        select: {
          id: true,
          iataCode: true,
          city: true,
        },
      },
      station: {
        select: {
          id: true,
          iataCode: true,
          city: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

export type UserSelf = Prisma.UserGetPayload<{
  select: typeof userSelfSelect;
}>;
