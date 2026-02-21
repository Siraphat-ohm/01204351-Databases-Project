import { z } from 'zod';
import { Prisma, Role, Rank } from '@/generated/prisma/client';

export const createStaffSchema = z.object({
  userId: z.cuid({ message: 'Invalid user ID' }),
  employeeId: z.string().min(3, { message: 'Employee ID is required' }),
  role: z.nativeEnum(Role),
  rank: z.nativeEnum(Rank).optional(),
  baseAirportId: z.cuid().optional(),
  stationId: z.cuid().optional(),
});

export const updateStaffSchema = z
  .object({
    employeeId: z.string().min(3).optional(),
    role: z.nativeEnum(Role).optional(),
    rank: z.nativeEnum(Rank).optional(),
    baseAirportId: z.cuid().optional(),
    stationId: z.cuid().optional(),
  })
  .refine(
    (data) =>
      data.employeeId ||
      data.role ||
      data.rank ||
      data.baseAirportId ||
      data.stationId,
    { message: 'At least one field must be provided for update' },
  );

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

export const staffAdminInclude = {
  user: true,
  baseAirport: true,
  station: true,
} satisfies Prisma.StaffProfileInclude;

export type StaffAdmin = Prisma.StaffProfileGetPayload<{
  include: typeof staffAdminInclude;
}>;
