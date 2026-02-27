import { airportRepository } from '@/repositories/airport.repository';
import {
  createAirportSchema,
  updateAirportSchema,
  iataCodeSchema,
  type CreateAirportInput,
  type UpdateAirportInput,
} from '@/types/airport.type';
import { canAccessAirport } from '@/auth/permissions';
import type { ServiceSession as Session } from '@/services/_shared/session';
import type { PaginatedResponse } from '@/types/common';
import { assertPermission } from '@/services/_shared/authorization';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

type AirportListItem = Awaited<ReturnType<typeof airportRepository.findAll>>[number];

export class AirportNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Airport not found: ${identifier}`);
    this.name = 'AirportNotFoundError';
  }
}

export class AirportConflictError extends Error {
  constructor(iataCode: string) {
    super(`Airport already exists: ${iataCode}`);
    this.name = 'AirportConflictError';
  }
}

export class AirportInUseError extends Error {
  constructor(airportId: string) {
    super(`Cannot delete airport in use: ${airportId}`);
    this.name = 'AirportInUseError';
  }
}

export class UnauthorizedError extends Error {
  constructor(action: string) {
    super(`Unauthorized: cannot perform "${action}" on airport`);
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
    canAccessAirport,
    'airport',
    (a) => new UnauthorizedError(a),
  );

export const airportService = {
  async findById(id: string, session: Session) {
    checkPermission(session, 'read');

    const airport = await airportRepository.findById(id);
    if (!airport) throw new AirportNotFoundError(id);
    return airport;
  },

  async findByIataCode(iataCode: string, session: Session) {
    checkPermission(session, 'read');

    const code = iataCodeSchema.parse(iataCode);
    const airport = await airportRepository.findByIataCode(code);
    if (!airport) throw new AirportNotFoundError(code);
    return airport;
  },

  async findAll(session: Session) {
    checkPermission(session, 'read');
    return airportRepository.findAll();
  },

  async findAllPaginated(
    session: Session,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<AirportListItem>> {
    checkPermission(session, 'read');

    const { page, limit, skip } = resolvePagination(params);
    const [data, total] = await Promise.all([
      airportRepository.findAll({ skip, take: limit }),
      airportRepository.count(),
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

  async searchPaginated(
    search: string,
    session: Session,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<AirportListItem>> {
    checkPermission(session, 'read');

    const keyword = search.trim();
    const where = keyword
      ? {
          OR: [
            { iataCode: { contains: keyword, mode: 'insensitive' as const } },
            { city: { contains: keyword, mode: 'insensitive' as const } },
            { name: { contains: keyword, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const { page, limit, skip } = resolvePagination(params);
    const [data, total] = await Promise.all([
      airportRepository.findAll({ where, skip, take: limit }),
      airportRepository.count(where),
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

  async createAirport(input: CreateAirportInput, session: Session) {
    checkPermission(session, 'create');

    const data = createAirportSchema.parse(input);
    const existing = await airportRepository.findByIataCode(data.iataCode);
    if (existing) throw new AirportConflictError(data.iataCode);

    return airportRepository.create(data);
  },

  async updateAirport(id: string, input: UpdateAirportInput, session: Session) {
    checkPermission(session, 'update');

    const data = updateAirportSchema.parse(input);
    const existing = await airportRepository.findById(id);
    if (!existing) throw new AirportNotFoundError(id);

    if (data.iataCode && data.iataCode !== existing.iataCode) {
      const conflict = await airportRepository.findByIataCode(data.iataCode);
      if (conflict) throw new AirportConflictError(data.iataCode);
    }

    return airportRepository.update(id, data);
  },

  async deleteAirport(id: string, session: Session) {
    checkPermission(session, 'delete');

    const existing = await airportRepository.findById(id);
    if (!existing) throw new AirportNotFoundError(id);

    const [routeCount, staffCount] = await Promise.all([
      airportRepository.countRoutes(id),
      airportRepository.countStaffAssignments(id),
    ]);

    if (routeCount > 0 || staffCount > 0) {
      throw new AirportInUseError(id);
    }

    return airportRepository.delete(id);
  },
};
