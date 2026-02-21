import { prisma } from '@/lib/prisma';
import {
  userAdminSelect,
  userSelfSelect,
  type UpdateMyProfileInput,
} from '@/types/user.type';
import { Prisma, Role } from '@/generated/prisma/client';

export const userRepository = {
  findByIdAdmin: (id: string) =>
    prisma.user.findUnique({
      where: { id },
      select: userAdminSelect,
    }),

  findByIdSelf: (id: string) =>
    prisma.user.findUnique({
      where: { id },
      select: userSelfSelect,
    }),

  findAllAdmin: (args?: { where?: Prisma.UserWhereInput; skip?: number; take?: number }) =>
    prisma.user.findMany({
      ...(args ?? {}),
      select: userAdminSelect,
      orderBy: { createdAt: 'desc' },
    }),

  count: (where?: Prisma.UserWhereInput) =>
    prisma.user.count({ where }),

  updateMyProfile: (id: string, data: UpdateMyProfileInput) =>
    prisma.user.update({
      where: { id },
      data,
      select: userSelfSelect,
    }),

  updateRole: (id: string, role: Role) =>
    prisma.user.update({
      where: { id },
      data: { role },
      select: userAdminSelect,
    }),
};
