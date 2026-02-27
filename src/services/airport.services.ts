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
import type { Prisma } from '@/generated/prisma/client';
import { makeCheckPermission } from '@/services/_shared/authorization';
import { NotFoundError, ConflictError, UnauthorizedError } from '@/lib/errors';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

type AirportListItem = Awaited<ReturnType<typeof airportRepository.findAll>>[number];

const checkPermission = makeCheckPermission(
  canAccessAirport,
  'airport',
  (a) => new UnauthorizedError(a),
);

export const airportService = {
  async findById(id: string, session: Session) {
    checkPermission(session, 'read');

    const airport = await airportRepository.findById(id);
    if (!airport) throw new NotFoundError(`Airport not found: ${id}`);
    return airport;
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
    const existing = await airportRepository.findByIataCode(data.iataCode);
    if (existing) throw new ConflictError(`Airport already exists: ${data.iataCode}`);

    return airportRepository.create(data);
  },

  async updateAirport(id: string, input: UpdateAirportInput, session: Session) {
    checkPermission(session, 'update');

    const data = updateAirportSchema.parse(input);
    const existing = await airportRepository.findById(id);
    if (!existing) throw new NotFoundError(`Airport not found: ${id}`);

    if (data.iataCode && data.iataCode !== existing.iataCode) {
      const conflict = await airportRepository.findByIataCode(data.iataCode);
      if (conflict) throw new ConflictError(`Airport already exists: ${data.iataCode}`);
    }

    return airportRepository.update(id, data);
  },

  async deleteAirport(id: string, session: Session) {
    checkPermission(session, 'delete');

    const existing = await airportRepository.findById(id);
    if (!existing) throw new NotFoundError(`Airport not found: ${id}`);

    const [routeCount, staffCount] = await Promise.all([
      airportRepository.countRoutes(id),
      airportRepository.countStaffAssignments(id),
    ]);

    if (routeCount > 0 || staffCount > 0) {
      throw new ConflictError(`Cannot delete airport in use: ${id}`);
    }

    return airportRepository.delete(id);
  },
};
