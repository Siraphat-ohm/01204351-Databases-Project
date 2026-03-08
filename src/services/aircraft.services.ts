import { aircraftRepository } from '@/repositories/aircraft.repository';
import {
  createAircraftSchema,
  updateAircraftSchema,
  type AircraftListItem,
  type AircraftServiceAction,
  type CreateAircraftInput,
  type UpdateAircraftInput,
} from '@/types/aircraft.type';
import { canAccessAircraft } from '@/auth/permissions';
import type { ServiceSession as Session } from '@/services/_shared/session';
import type { PaginatedResponse } from '@/types/common';
import type { Prisma } from '@/generated/prisma/client';
import { makePermissionHelpers } from '@/services/_shared/authorization';
import { ConflictError, NotFoundError, UnauthorizedError } from '@/lib/errors';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

const { checkPermission } = makePermissionHelpers<AircraftServiceAction>(
  canAccessAircraft,
  'aircraft',
  (a) => new UnauthorizedError(a),
);

async function assertTailNumberAvailable(tailNumber: string) {
  const existing = await aircraftRepository.findByTailNumber(tailNumber).catch(() => null);
  if (existing) throw new ConflictError(`Aircraft already exists: ${tailNumber}`);
}

async function assertAircraftDeletable(id: string) {
  const flightCount = await aircraftRepository.countFlights(id);
  if (flightCount > 0) throw new ConflictError(`Cannot delete aircraft in use: ${id}`);
}

export const aircraftService = {
  async findById(id: string, session: Session) {
    checkPermission(session, 'read');
    const aircraft = await aircraftRepository.findById(id);
    if (!aircraft) throw new NotFoundError(`Aircraft not found: ${id}`);
    return aircraft;
  },

  async findAll(session: Session) {
    checkPermission(session, 'read');
    return aircraftRepository.findAll();
  },

  async findAllPaginated(
    session: Session,
    params?: PaginationParams<Prisma.AircraftWhereInput>,
  ): Promise<PaginatedResponse<AircraftListItem>> {
    checkPermission(session, 'read');

    const { page, limit, skip } = resolvePagination(params);
    const where = (params as any)?.where;
    const [data, total] = await Promise.all([
      aircraftRepository.findAll({ where, skip, take: limit }),
      aircraftRepository.count(where),
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

  async createAircraft(input: CreateAircraftInput, session: Session) {
    checkPermission(session, 'create');

    const data = createAircraftSchema.parse(input);
    await assertTailNumberAvailable(data.tailNumber);
    return aircraftRepository.create(data);
  },

  async updateAircraft(id: string, input: UpdateAircraftInput, session: Session) {
    checkPermission(session, 'update');

    const data = updateAircraftSchema.parse(input);
    const existing = await aircraftRepository.findById(id);

    if (data.tailNumber && data.tailNumber !== existing.tailNumber) {
      await assertTailNumberAvailable(data.tailNumber);
    }

    return aircraftRepository.update(id, data);
  },

  async updateStatus(id: string, status: UpdateAircraftInput['status'], session: Session) {
    checkPermission(session, 'manage-status');
    await aircraftRepository.findById(id);
    return aircraftRepository.update(id, { status });
  },

  async deleteAircraft(id: string, session: Session) {
    checkPermission(session, 'delete');
    await aircraftRepository.findById(id);
    await assertAircraftDeletable(id);
    return aircraftRepository.delete(id);
  },
};
