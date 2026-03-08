import { airportRepository } from '@/repositories/airport.repository';
import {
  createAirportSchema,
  updateAirportSchema,
  iataCodeSchema,
  type AirportListItem,
  type AirportServiceAction,
  type CreateAirportInput,
  type UpdateAirportInput,
} from '@/types/airport.type';
import { canAccessAirport } from '@/auth/permissions';
import type { ServiceSession as Session } from '@/services/_shared/session';
import type { PaginatedResponse } from '@/types/common';
import type { Prisma } from '@/generated/prisma/client';
import { makePermissionHelpers } from '@/services/_shared/authorization';
import { ConflictError, NotFoundError, UnauthorizedError } from '@/lib/errors';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

const { checkPermission } = makePermissionHelpers<AirportServiceAction>(
  canAccessAirport,
  'airport',
  (a) => new UnauthorizedError(a),
);

async function getAirportByIdOrThrow(id: string) {
  const airport = await airportRepository.findById(id);
  if (!airport) throw new NotFoundError(`Airport not found: ${id}`);
  return airport;
}

async function assertAirportIataCodeAvailable(iataCode: string) {
  const existing = await airportRepository.findByIataCode(iataCode);
  if (existing) throw new ConflictError(`Airport already exists: ${iataCode}`);
}

async function assertAirportDeletable(id: string) {
  const [routeCount, staffCount] = await Promise.all([
    airportRepository.countRoutes(id),
    airportRepository.countStaffAssignments(id),
  ]);
  if (routeCount > 0 || staffCount > 0) {
    throw new ConflictError(`Cannot delete airport in use: ${id}`);
  }
}

export const airportService = {
  async findById(id: string, session: Session) {
    checkPermission(session, 'read');
    return getAirportByIdOrThrow(id);
  },

  async findByIataCode(iataCode: string, session: Session) {
    checkPermission(session, 'read');

    const code = iataCodeSchema.parse(iataCode);
    const airport = await airportRepository.findByIataCode(code);
    if (!airport) throw new NotFoundError(`Airport not found: ${code}`);
    return airport;
  },

  async findAll(session: Session) {
    checkPermission(session, 'read');
    return airportRepository.findAll();
  },

  async findAllPaginated(
    session: Session,
    params?: PaginationParams<Prisma.AirportWhereInput>,
  ): Promise<PaginatedResponse<AirportListItem>> {
    checkPermission(session, 'read');

    const { page, limit, skip } = resolvePagination(params);
    const where = (params as any)?.where;
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

  async searchPaginated(
    search: string,
    session: Session,
    params?: PaginationParams<Prisma.AirportWhereInput>,
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
    await assertAirportIataCodeAvailable(data.iataCode);
    return airportRepository.create(data);
  },

  async updateAirport(id: string, input: UpdateAirportInput, session: Session) {
    checkPermission(session, 'update');

    const data = updateAirportSchema.parse(input);
    const existing = await getAirportByIdOrThrow(id);

    if (data.iataCode && data.iataCode !== existing.iataCode) {
      await assertAirportIataCodeAvailable(data.iataCode);
    }

    return airportRepository.update(id, data);
  },

  async deleteAirport(id: string, session: Session) {
    checkPermission(session, 'delete');
    await getAirportByIdOrThrow(id);
    await assertAirportDeletable(id);
    return airportRepository.delete(id);
  },
};
