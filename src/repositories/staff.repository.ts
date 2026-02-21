import { prisma } from '@/lib/prisma';
import {
  staffAdminInclude,
  type CreateStaffInput,
  type UpdateStaffInput,
} from '@/types/staff.type';
import { Prisma } from '@/generated/prisma/client';

export const staffRepository = {
  findById: (id: string) =>
    prisma.staffProfile.findUnique({
      where: { id },
      include: staffAdminInclude,
    }),

  findByUserId: (userId: string) =>
    prisma.staffProfile.findUnique({
      where: { userId },
      include: staffAdminInclude,
    }),

  findByEmployeeId: (employeeId: string) =>
    prisma.staffProfile.findUnique({
      where: { employeeId },
      include: staffAdminInclude,
    }),

  findAll: (args?: { where?: Prisma.StaffProfileWhereInput; skip?: number; take?: number }) =>
    prisma.staffProfile.findMany({
      ...(args ?? {}),
      include: staffAdminInclude,
      orderBy: { employeeId: 'asc' },
    }),

  count: (where?: Prisma.StaffProfileWhereInput) =>
    prisma.staffProfile.count({ where }),

  create: (data: CreateStaffInput) =>
    prisma.staffProfile.create({
      data,
      include: staffAdminInclude,
    }),

  update: (id: string, data: UpdateStaffInput) =>
    prisma.staffProfile.update({
      where: { id },
      data,
      include: staffAdminInclude,
    }),

  delete: (id: string) =>
    prisma.staffProfile.delete({
      where: { id },
      include: staffAdminInclude,
    }),

  countPilotedFlights: (staffId: string) =>
    prisma.flight.count({
      where: { captainId: staffId },
    }),
};
