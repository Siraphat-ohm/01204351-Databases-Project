import { z } from 'zod';
import { Prisma, Role } from '@/generated/prisma/client';

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
  role: z.enum(Role),
});

export type UpdateMyProfileInput = z.infer<typeof updateMyProfileSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
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
} satisfies Prisma.UserSelect;

export type UserSelf = Prisma.UserGetPayload<{
  select: typeof userSelfSelect;
}>;
