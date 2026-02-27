import { aircraftTypeRepository } from '@/repositories/aircraft-type.repository';
import {
  aircraftTypeIataCodeSchema,
  createAircraftTypeSchema,
  updateAircraftTypeSchema,
  type CreateAircraftTypeInput,
  type UpdateAircraftTypeInput,
} from '@/types/aircraft-type.type';
import { canAccessAircraft } from '@/auth/permissions';
import type { ServiceSession as Session } from '@/services/_shared/session';
import type { PaginatedResponse } from '@/types/common';
import { assertPermission } from '@/services/_shared/authorization';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

type AircraftTypeListItem = Awaited<ReturnType<typeof aircraftTypeRepository.findAll>>[number];

export class AircraftTypeNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Aircraft type not found: ${identifier}`);
    this.name = 'AircraftTypeNotFoundError';
  }
}

export class AircraftTypeConflictError extends Error {
  constructor(iataCode: string) {
    super(`Aircraft type already exists: ${iataCode}`);
    this.name = 'AircraftTypeConflictError';
  }
}

export class AircraftTypeInUseError extends Error {
  constructor(aircraftTypeId: string) {
    super(`Cannot delete aircraft type in use: ${aircraftTypeId}`);
    this.name = 'AircraftTypeInUseError';
  }
}

export class UnauthorizedError extends Error {
  constructor(action: string) {
    super(`Unauthorized: cannot perform "${action}" on aircraft type`);
    this.name = 'UnauthorizedError';
  }
}

const checkPermission = (
  session: Session,
  action: 'create' | 'read' | 'update' | 'delete',
) =>
  assertPermission(
    session,
    action,
    canAccessAircraft,
    'aircraft',
    (a) => new UnauthorizedError(a),
  );

export const aircraftTypeService = {
  async findById(id: string, session: Session) {
    checkPermission(session, 'read');

    const aircraftType = await aircraftTypeRepository.findById(id);
    if (!aircraftType) throw new AircraftTypeNotFoundError(id);
    return aircraftType;
  },

  async findByIataCode(iataCode: string, session: Session) {
    checkPermission(session, 'read');

    const code = aircraftTypeIataCodeSchema.parse(iataCode);
    const aircraftType = await aircraftTypeRepository.findByIataCode(code);
    if (!aircraftType) throw new AircraftTypeNotFoundError(code);
    return aircraftType;
  },

  async findAll(session: Session) {
    checkPermission(session, 'read');
    return aircraftTypeRepository.findAll();
  },

  async findAllPaginated(
    session: Session,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<AircraftTypeListItem>> {
    checkPermission(session, 'read');

    const { page, limit, skip } = resolvePagination(params);
    const [data, total] = await Promise.all([
      aircraftTypeRepository.findAll({ skip, take: limit }),
      aircraftTypeRepository.count(),
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

  async createAircraftType(input: CreateAircraftTypeInput, session: Session) {
    checkPermission(session, 'create');

    const data = createAircraftTypeSchema.parse(input);
    const existing = await aircraftTypeRepository.findByIataCode(data.iataCode);
    if (existing) throw new AircraftTypeConflictError(data.iataCode);

    return aircraftTypeRepository.create(data);
  },

  async updateAircraftType(id: string, input: UpdateAircraftTypeInput, session: Session) {
    checkPermission(session, 'update');

    const data = updateAircraftTypeSchema.parse(input);
    const existing = await aircraftTypeRepository.findById(id);
    if (!existing) throw new AircraftTypeNotFoundError(id);

    if (data.iataCode && data.iataCode !== existing.iataCode) {
      const conflict = await aircraftTypeRepository.findByIataCode(data.iataCode);
      if (conflict) throw new AircraftTypeConflictError(data.iataCode);
    }

    return aircraftTypeRepository.update(id, data);
  },

  async deleteAircraftType(id: string, session: Session) {
    checkPermission(session, 'delete');

    const existing = await aircraftTypeRepository.findById(id);
    if (!existing) throw new AircraftTypeNotFoundError(id);

    const fleetCount = await aircraftTypeRepository.countFleet(id);
    if (fleetCount > 0) throw new AircraftTypeInUseError(id);

    return aircraftTypeRepository.delete(id);
  },
};
