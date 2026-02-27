import { aircraftRepository } from '@/repositories/aircraft.repository';
import {
  createAircraftSchema,
  updateAircraftSchema,
  type CreateAircraftInput,
  type UpdateAircraftInput,
} from '@/types/aircraft.type';
import { canAccessAircraft } from '@/auth/permissions';
import type { ServiceSession as Session } from '@/services/_shared/session';
import type { PaginatedResponse } from '@/types/common';
import { makeCheckPermission } from '@/services/_shared/authorization';
import { NotFoundError, ConflictError, UnauthorizedError } from '@/lib/errors';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

type AircraftListItem = Awaited<ReturnType<typeof aircraftRepository.findAll>>[number];



const checkPermission = makeCheckPermission(
  canAccessAircraft,
  'aircraft',
  (a) => new UnauthorizedError(a),
);

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
    params?: PaginationParams,
  ): Promise<PaginatedResponse<AircraftListItem>> {
    checkPermission(session, 'read');

    const { page, limit, skip } = resolvePagination(params);
    const [data, total] = await Promise.all([
      aircraftRepository.findAll({ skip, take: limit }),
      aircraftRepository.count(),
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
    const existing = await aircraftRepository.findByTailNumber(data.tailNumber);
    if (existing) throw new ConflictError(`Aircraft already exists: ${data.tailNumber}`);

    return aircraftRepository.create(data);
  },

  async updateAircraft(id: string, input: UpdateAircraftInput, session: Session) {
    checkPermission(session, 'update');

    const data = updateAircraftSchema.parse(input);
    const existing = await aircraftRepository.findById(id);
    if (!existing) throw new NotFoundError(`Aircraft not found: ${id}`);

    if (data.tailNumber && data.tailNumber !== existing.tailNumber) {
      const conflict = await aircraftRepository.findByTailNumber(data.tailNumber);
      if (conflict) throw new ConflictError(data.tailNumber);
    }

    return aircraftRepository.update(id, data);
  },

  async updateStatus(id: string, status: UpdateAircraftInput['status'], session: Session) {
    checkPermission(session, 'manage-status');

    const existing = await aircraftRepository.findById(id);
    if (!existing) throw new NotFoundError(`Aircraft not found: ${id}`);

    return aircraftRepository.update(id, { status });
  },

  async deleteAircraft(id: string, session: Session) {
    checkPermission(session, 'delete');

    const existing = await aircraftRepository.findById(id);
    if (!existing) throw new NotFoundError(`Aircraft not found: ${id}`);

    const flightCount = await aircraftRepository.countFlights(id);
    if (flightCount > 0) throw new ConflictError(`Cannot delete aircraft in use: ${id}`);

    return aircraftRepository.delete(id);
  },
};
