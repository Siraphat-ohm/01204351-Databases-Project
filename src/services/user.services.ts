import { userRepository } from '@/repositories/user.repository';
import {
  updateMyProfileSchema,
  updateUserRoleSchema,
  type UpdateMyProfileInput,
  type UpdateUserRoleInput,
} from '@/types/user.type';
import type { ServiceSession as Session } from '@/services/_shared/session';
import type { PaginatedResponse } from '@/types/common';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

type UserListItem = Awaited<ReturnType<typeof userRepository.findAllAdmin>>[number];

export class UserNotFoundError extends Error {
  constructor(identifier: string) {
    super(`User not found: ${identifier}`);
    this.name = 'UserNotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(action: string) {
    super(`Unauthorized: cannot perform "${action}" on user`);
    this.name = 'UnauthorizedError';
  }
}

function assertAdmin(session: Session, action: string) {
  if (session.user.role !== 'ADMIN') {
    throw new UnauthorizedError(action);
  }
}

export const userService = {
  async findMe(session: Session) {
    const user = await userRepository.findByIdSelf(session.user.id);
    if (!user) throw new UserNotFoundError(session.user.id);
    return user;
  },

  async findById(id: string, session: Session) {
    assertAdmin(session, 'read');

    const user = await userRepository.findByIdAdmin(id);
    if (!user) throw new UserNotFoundError(id);
    return user;
  },

  async findAll(session: Session) {
    assertAdmin(session, 'read-all');
    return userRepository.findAllAdmin();
  },

  async findAllPaginated(
    session: Session,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<UserListItem>> {
    assertAdmin(session, 'read-all');

    const { page, limit, skip } = resolvePagination(params);
    const [data, total] = await Promise.all([
      userRepository.findAllAdmin({ skip, take: limit }),
      userRepository.count(),
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
    const existing = await userRepository.findByIdSelf(session.user.id);
    if (!existing) throw new UserNotFoundError(session.user.id);

    return userRepository.updateMyProfile(session.user.id, data);
  },

  async updateRole(id: string, input: UpdateUserRoleInput, session: Session) {
    assertAdmin(session, 'update-role');

    const data = updateUserRoleSchema.parse(input);
    const existing = await userRepository.findByIdAdmin(id);
    if (!existing) throw new UserNotFoundError(id);

    return userRepository.updateRole(id, data.role);
  },
};
