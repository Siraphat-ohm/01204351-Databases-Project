import { crewProfileRepository } from '@/repositories/crew-profile.repository';
import {
  upsertCrewProfileSchema,
  patchCrewProfileSchema,
  type UpsertCrewProfileInput,
  type PatchCrewProfileInput,
} from '@/types/crew-profile.type';
import type { ServiceSession as Session } from '@/services/_shared/session';
import { hasAnyRole } from '@/services/_shared/role';

export class CrewProfileNotFoundError extends Error {
  constructor(userId: string) {
    super(`Crew profile not found for user: ${userId}`);
    this.name = 'CrewProfileNotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(action: string) {
    super(`Unauthorized: cannot perform "${action}" on crew profile`);
    this.name = 'UnauthorizedError';
  }
}

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
  async findByUserId(userId: string, session: Session) {
    assertCanRead(session, userId);

    const profile = await crewProfileRepository.findByUserId(userId);
    if (!profile) throw new CrewProfileNotFoundError(userId);
    return profile;
  },

  async findMyProfile(session: Session) {
    const profile = await crewProfileRepository.findByUserId(session.user.id);
    if (!profile) throw new CrewProfileNotFoundError(session.user.id);
    return profile;
  },

  async upsertMyProfile(input: UpsertCrewProfileInput, session: Session) {
    const data = upsertCrewProfileSchema.parse(input);
    return crewProfileRepository.upsertByUserId(session.user.id, data);
  },

  async patchByUserId(userId: string, input: PatchCrewProfileInput, session: Session) {
    assertCanUpdate(session, userId);

    const data = patchCrewProfileSchema.parse(input);
    const updated = await crewProfileRepository.patchByUserId(userId, data);
    if (!updated) throw new CrewProfileNotFoundError(userId);
    return updated;
  },
};
