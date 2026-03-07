import { userRepository } from '@/repositories/user.repository';
import {
  updateMyProfileSchema,
  updateUserRoleSchema,
  type UpdateMyProfileInput,
  type UpdateUserRoleInput,
  type UserServiceAction,
} from '@/types/user.type';
import type { ServiceSession as Session } from '@/services/_shared/session';
import type { Prisma } from '@/generated/prisma/client';
import type { PaginatedResponse } from '@/types/common';
import { makePermissionHelpers } from '@/services/_shared/authorization';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

type UserListItem = Awaited<ReturnType<typeof userRepository.findAllAdmin>>[number];

import { NotFoundError, UnauthorizedError } from '@/lib/errors';

const {
  checkPermission,
} = makePermissionHelpers<UserServiceAction>(
  (roleName, _action) => roleName === 'ADMIN',
  'user',
  (action) => new UnauthorizedError(action),
);

export const userService = {
  async findMe(session: Session) {
    return userRepository.findByIdSelf(session.user.id);
  },

  async findById(id: string, session: Session) {
    checkPermission(session, 'read');
    return userRepository.findByIdAdmin(id);
  },

  async findAll(session: Session) {
    checkPermission(session, 'read-all');
    return userRepository.findAllAdmin();
  },

  async findAllPaginated(
    session: Session,
    params?: PaginationParams<Prisma.UserWhereInput>,
  ): Promise<PaginatedResponse<UserListItem>> {
    checkPermission(session, 'read-all');

    const { page, limit, skip } = resolvePagination(params);
    const where = (params as any)?.where;
    const [data, total] = await Promise.all([
      userRepository.findAllAdmin({ where, skip, take: limit }),
      userRepository.count(where),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async updateMyProfile(input: UpdateMyProfileInput, session: Session) {
    const data = updateMyProfileSchema.parse(input);
    await userRepository.findByIdSelf(session.user.id);
    return userRepository.updateMyProfile(session.user.id, data);
  },

  async updateRole(id: string, input: UpdateUserRoleInput, session: Session) {
    checkPermission(session, 'update-role');

    const data = updateUserRoleSchema.parse(input);
    await userRepository.findByIdAdmin(id);
    return userRepository.updateRole(id, data.role);
  },

  async updateUser(id: string, input: UpdateMyProfileInput, session: Session) {
    checkPermission(session, 'update');

    const data = updateMyProfileSchema.parse(input);
    await userRepository.findByIdAdmin(id);
    return userRepository.update(id, data);
  },

  async deleteUser(id: string, session: Session) {
    checkPermission(session, 'delete');
    await userRepository.findByIdAdmin(id);
    return userRepository.delete(id);
  },
};
