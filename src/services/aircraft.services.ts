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
import { assertPermission } from '@/services/_shared/authorization';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

type AircraftListItem = Awaited<ReturnType<typeof aircraftRepository.findAll>>[number];

export class AircraftNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Aircraft not found: ${identifier}`);
    this.name = 'AircraftNotFoundError';
  }
}

export class AircraftConflictError extends Error {
  constructor(tailNumber: string) {
    super(`Aircraft already exists: ${tailNumber}`);
    this.name = 'AircraftConflictError';
  }
}

export class AircraftInUseError extends Error {
  constructor(aircraftId: string) {
    super(`Cannot delete aircraft in use: ${aircraftId}`);
    this.name = 'AircraftInUseError';
  }
}

export class UnauthorizedError extends Error {
  constructor(action: string) {
    super(`Unauthorized: cannot perform "${action}" on aircraft`);
    this.name = 'UnauthorizedError';
  }
}

function checkPermission(
  session: Session,
  action: 'create' | 'read' | 'update' | 'delete' | 'manage-status',
) {
  assertPermission(
    session,
    action,
    canAccessAircraft,
    'aircraft',
    (a) => new UnauthorizedError(a),
  );
}

export const aircraftService = {
  async findById(id: string, session: Session) {
    checkPermission(session, 'read');

    const aircraft = await aircraftRepository.findById(id);
    if (!aircraft) throw new AircraftNotFoundError(id);
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
    if (existing) throw new AircraftConflictError(data.tailNumber);

    return aircraftRepository.create(data);
  },

  async updateAircraft(id: string, input: UpdateAircraftInput, session: Session) {
    checkPermission(session, 'update');

    const data = updateAircraftSchema.parse(input);
    const existing = await aircraftRepository.findById(id);
    if (!existing) throw new AircraftNotFoundError(id);

    if (data.tailNumber && data.tailNumber !== existing.tailNumber) {
      const conflict = await aircraftRepository.findByTailNumber(data.tailNumber);
      if (conflict) throw new AircraftConflictError(data.tailNumber);
    }

    return aircraftRepository.update(id, data);
  },

  async updateStatus(id: string, status: UpdateAircraftInput['status'], session: Session) {
    checkPermission(session, 'manage-status');

    const existing = await aircraftRepository.findById(id);
    if (!existing) throw new AircraftNotFoundError(id);

    return aircraftRepository.update(id, { status });
  },

  async deleteAircraft(id: string, session: Session) {
    checkPermission(session, 'delete');

    const existing = await aircraftRepository.findById(id);
    if (!existing) throw new AircraftNotFoundError(id);

    const flightCount = await aircraftRepository.countFlights(id);
    if (flightCount > 0) throw new AircraftInUseError(id);

    return aircraftRepository.delete(id);
  },
};
