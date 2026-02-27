import { crewProfileRepository } from '@/repositories/crew-profile.repository';
import {
  createCrewProfileSchema,
  upsertCrewProfileSchema,
  updateCrewProfileSchema,
  patchCrewProfileSchema,
  type CreateCrewProfileInput,
  type UpsertCrewProfileInput,
  type UpdateCrewProfileInput,
  type PatchCrewProfileInput,
} from '@/types/crew-profile.type';
import type { PaginatedResponse } from '@/types/common';
import type { ServiceSession as Session } from '@/services/_shared/session';
import { hasAnyRole } from '@/services/_shared/role';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

type CrewProfileListItem = Awaited<ReturnType<typeof crewProfileRepository.findAll>>[number];

import { NotFoundError, ConflictError, UnauthorizedError } from '@/lib/errors';

function isAdmin(session: Session) {
  return hasAnyRole(session, ['ADMIN']);
}

function assertCanRead(session: Session, userId: string) {
  if (isAdmin(session)) return;
  if (session.user.id === userId) return;
  throw new UnauthorizedError('read');
}

function assertCanUpdate(session: Session, userId: string) {
  if (isAdmin(session)) return;
  if (session.user.id === userId) return;
  throw new UnauthorizedError('update');
}

export const crewProfileService = {
  async findAll(session: Session) {
    if (!isAdmin(session)) throw new UnauthorizedError('read-all');
    return crewProfileRepository.findAll();
  },

  async findAllPaginated(
    session: Session,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<CrewProfileListItem>> {
    if (!isAdmin(session)) throw new UnauthorizedError('read-all');

    const { page, limit, skip } = resolvePagination(params);
    const [data, total] = await Promise.all([
      crewProfileRepository.findMany({
        skip,
        take: limit,
      }),
      crewProfileRepository.count(),
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

  async findByUserId(userId: string, session: Session) {
    assertCanRead(session, userId);

    const profile = await crewProfileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError(`Crew profile not found for user: ${userId}`);
    return profile;
  },

  async findMyProfile(session: Session) {
    const profile = await crewProfileRepository.findByUserId(session.user.id);
    if (!profile) throw new NotFoundError(`Crew profile not found for user: ${session.user.id}`);
    return profile;
  },

  async upsertMyProfile(input: UpsertCrewProfileInput, session: Session) {
    const data = upsertCrewProfileSchema.parse(input);
    return crewProfileRepository.upsertByUserId(session.user.id, data);
  },

  async create(input: CreateCrewProfileInput, session: Session) {
    if (!isAdmin(session)) throw new UnauthorizedError('create');

    const data = createCrewProfileSchema.parse(input);
    const existing = await crewProfileRepository.findByUserId(data.userId);
    if (existing) {
      throw new ConflictError('Crew profile already exists for this user');
    }

    return crewProfileRepository.create(data);
  },

  async patchByUserId(userId: string, input: PatchCrewProfileInput, session: Session) {
    assertCanUpdate(session, userId);

    const data = patchCrewProfileSchema.parse(input);
    const updated = await crewProfileRepository.patchByUserId(userId, data);
    if (!updated) throw new NotFoundError(`Crew profile not found for user: ${userId}`);
    return updated;
  },

  async updateByUserId(userId: string, input: UpdateCrewProfileInput, session: Session) {
    if (!isAdmin(session)) throw new UnauthorizedError('update');

    const data = updateCrewProfileSchema.parse(input);
    const updated = await crewProfileRepository.updateByUserId(userId, data);
    if (!updated) throw new NotFoundError(`Crew profile not found for user: ${userId}`);
    return updated;
  },

  async deleteByUserId(userId: string, session: Session) {
    if (!isAdmin(session)) throw new UnauthorizedError('delete');

    const deleted = await crewProfileRepository.deleteByUserId(userId);
    if (!deleted) throw new NotFoundError(`Crew profile not found for user: ${userId}`);
    return deleted;
  },
};
