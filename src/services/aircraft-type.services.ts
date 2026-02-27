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
import type { Prisma } from '@/generated/prisma/client';
import { makeCheckPermission } from '@/services/_shared/authorization';
import { NotFoundError, ConflictError, UnauthorizedError } from '@/lib/errors';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

type AircraftTypeListItem = Awaited<ReturnType<typeof aircraftTypeRepository.findAll>>[number];

const checkPermission = makeCheckPermission(
  canAccessAircraft,
  'aircraft',
  (a) => new UnauthorizedError(a),
);

export const aircraftTypeService = {
  async findById(id: string, session: Session) {
    checkPermission(session, 'read');

    const aircraftType = await aircraftTypeRepository.findById(id);
    if (!aircraftType) throw new NotFoundError(`Aircraft type not found: ${id}`);
    return aircraftType;
  },

  async findByIataCode(iataCode: string, session: Session) {
    checkPermission(session, 'read');

    const code = aircraftTypeIataCodeSchema.parse(iataCode);
    const aircraftType = await aircraftTypeRepository.findByIataCode(code);
    if (!aircraftType) throw new NotFoundError(`Aircraft type not found: ${code}`);
    return aircraftType;
  },

  async findAll(session: Session) {
    checkPermission(session, 'read');
    return aircraftTypeRepository.findAll();
  },

  async findAllPaginated(
    session: Session,
    params?: PaginationParams<Prisma.AircraftTypeWhereInput>,
  ): Promise<PaginatedResponse<AircraftTypeListItem>> {
    checkPermission(session, 'read');

    const { page, limit, skip } = resolvePagination(params);
    const where = (params as any)?.where;
    const [data, total] = await Promise.all([
      aircraftTypeRepository.findAll({ where, skip, take: limit }),
      aircraftTypeRepository.count(where),
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
    if (existing) throw new ConflictError(`Aircraft type already exists: ${data.iataCode}`);

    return aircraftTypeRepository.create(data);
  },

  async updateAircraftType(id: string, input: UpdateAircraftTypeInput, session: Session) {
    checkPermission(session, 'update');

    const data = updateAircraftTypeSchema.parse(input);
    const existing = await aircraftTypeRepository.findById(id);
    if (!existing) throw new NotFoundError(`Aircraft type not found: ${id}`);

    if (data.iataCode && data.iataCode !== existing.iataCode) {
      const conflict = await aircraftTypeRepository.findByIataCode(data.iataCode);
      if (conflict) throw new ConflictError(`Aircraft type already exists: ${data.iataCode}`);
    }

    return aircraftTypeRepository.update(id, data);
  },

  async deleteAircraftType(id: string, session: Session) {
    checkPermission(session, 'delete');

    const existing = await aircraftTypeRepository.findById(id);
    if (!existing) throw new NotFoundError(`Aircraft type not found: ${id}`);

    const fleetCount = await aircraftTypeRepository.countFleet(id);
    if (fleetCount > 0) throw new ConflictError(`Cannot delete aircraft type in use: ${id}`);

    return aircraftTypeRepository.delete(id);
  },
};
