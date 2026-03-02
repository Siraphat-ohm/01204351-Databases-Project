import { prisma } from '@/lib/prisma';
import {
  type CreateStaffInput,
  type UpdateStaffInput,
} from '@/types/staff.type';
import { Prisma } from '@/generated/prisma/client';

export const staffRepository = {
  findById: (id: string, include?: Prisma.StaffProfileInclude) =>
    prisma.staffProfile.findUniqueOrThrow({ where: { id }, include }),

  findByUserId: (userId: string, include?: Prisma.StaffProfileInclude) =>
    prisma.staffProfile.findUniqueOrThrow({ where: { userId }, include }),

  findByEmployeeId: (employeeId: string, include?: Prisma.StaffProfileInclude) =>
    prisma.staffProfile.findUniqueOrThrow({ where: { employeeId }, include }),

  findAll: (args?: { where?: Prisma.StaffProfileWhereInput; skip?: number; take?: number; include?: Prisma.StaffProfileInclude }) =>
    prisma.staffProfile.findMany({
      where: args?.where,
      skip: args?.skip,
      take: args?.take,
      include: args?.include,
      orderBy: { employeeId: 'asc' },
    }),

  count: (where?: Prisma.StaffProfileWhereInput) =>
    prisma.staffProfile.count({ where }),

  create: (data: CreateStaffInput, include?: Prisma.StaffProfileInclude) =>
    prisma.staffProfile.create({ data, include }),

  update: (id: string, data: UpdateStaffInput, include?: Prisma.StaffProfileInclude) =>
    prisma.staffProfile.update({ where: { id }, data, include }),

  delete: (id: string, include?: Prisma.StaffProfileInclude) =>
    prisma.staffProfile.delete({ where: { id }, include }),

  countPilotedFlights: (staffId: string) =>
    prisma.flight.count({
      where: { captainId: staffId },
    }),
};
