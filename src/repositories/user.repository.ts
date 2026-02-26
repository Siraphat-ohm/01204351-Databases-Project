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
      orderBy: [{ createdAt: 'desc' },{ id: 'asc' }],
      
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

  createGuestUser: (data: { email: string; name: string; phone?: string | null }) =>
    prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        phone: data.phone ?? null,
        role: Role.PASSENGER,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    }),

  delete: (id: string) =>
    prisma.user.delete({
      where: { id },
      select: userAdminSelect,
    }),
};
