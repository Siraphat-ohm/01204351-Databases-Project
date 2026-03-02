import { aircraftTypeRepository } from '@/repositories/aircraft-type.repository';
import {
  aircraftTypeIataCodeSchema,
  createAircraftTypeSchema,
  updateAircraftTypeSchema,
  aircraftTypeAdminInclude,
  type AircraftTypeAdmin,
  type AircraftTypeListItem,
  type AircraftTypeServiceAction,
  type CreateAircraftTypeInput,
  type UpdateAircraftTypeInput,
} from '@/types/aircraft-type.type';
import { canAccessAircraft } from '@/auth/permissions';
import type { ServiceSession as Session } from '@/services/_shared/session';
import type { PaginatedResponse } from '@/types/common';
import type { Prisma } from '@/generated/prisma/client';
import { makePermissionHelpers } from '@/services/_shared/authorization';
import { ConflictError, UnauthorizedError } from '@/lib/errors';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

const { checkPermission } = makePermissionHelpers<AircraftTypeServiceAction>(
  canAccessAircraft,
  'aircraft',
  (a) => new UnauthorizedError(a),
);

async function assertAircraftTypeIataCodeAvailable(iataCode: string) {
  try {
    await aircraftTypeRepository.findByIataCode(iataCode);
    throw new ConflictError(`Aircraft type already exists: ${iataCode}`);
  } catch (e) {
    if (e instanceof ConflictError) throw e;
  }
}

async function assertAircraftTypeDeletable(id: string) {
  const fleetCount = await aircraftTypeRepository.countFleet(id);
  if (fleetCount > 0) throw new ConflictError(`Cannot delete aircraft type in use: ${id}`);
}

export const aircraftTypeService = {
  async findById(id: string, session: Session) {
    checkPermission(session, 'read');
    const aircraftType = await aircraftTypeRepository.findById(id, aircraftTypeAdminInclude);
    return aircraftType as unknown as AircraftTypeAdmin;
  },

  async findByIataCode(iataCode: string, session: Session) {
    checkPermission(session, 'read');
    const code = aircraftTypeIataCodeSchema.parse(iataCode);
    return aircraftTypeRepository.findByIataCode(code, aircraftTypeAdminInclude);
  },

  async findAll(session: Session) {
    checkPermission(session, 'read');
    return aircraftTypeRepository.findAll({ include: aircraftTypeAdminInclude }) as Promise<AircraftTypeAdmin[]>;
  },

  async findAllPaginated(
    session: Session,
    params?: PaginationParams<Prisma.AircraftTypeWhereInput>,
  ): Promise<PaginatedResponse<AircraftTypeListItem>> {
    checkPermission(session, 'read');

    const { page, limit, skip } = resolvePagination(params);
    const [data, total] = await Promise.all([
      aircraftTypeRepository.findAll({ where: params?.where, skip, take: limit, include: aircraftTypeAdminInclude }) as Promise<AircraftTypeAdmin[]>,
      aircraftTypeRepository.count(params?.where),
    ]);

    return {
      data: data as AircraftTypeAdmin[],
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
    await assertAircraftTypeIataCodeAvailable(data.iataCode);
    return aircraftTypeRepository.create(data, aircraftTypeAdminInclude);
  },

  async updateAircraftType(id: string, input: UpdateAircraftTypeInput, session: Session) {
    checkPermission(session, 'update');

    const data = updateAircraftTypeSchema.parse(input);
    const existing = await aircraftTypeRepository.findById(id);

    if (data.iataCode && data.iataCode !== existing.iataCode) {
      await assertAircraftTypeIataCodeAvailable(data.iataCode);
    }

    return aircraftTypeRepository.update(id, data, aircraftTypeAdminInclude);
  },

  async deleteAircraftType(id: string, session: Session) {
    checkPermission(session, 'delete');
    await aircraftTypeRepository.findById(id);
    await assertAircraftTypeDeletable(id);
    return aircraftTypeRepository.delete(id, aircraftTypeAdminInclude);
  },
};
