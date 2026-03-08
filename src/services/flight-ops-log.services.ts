import { flightRepository } from '@/repositories/flight.repository';
import { flightOpsLogRepository } from '@/repositories/flight-ops-log.repository';
import {
  upsertFlightOpsLogSchema,
  patchFlightOpsLogSchema,
  type UpsertFlightOpsLogInput,
  type PatchFlightOpsLogInput,
} from '@/types/flight-ops-log.type';
import type { PaginatedResponse } from '@/types/common';
import type { ServiceSession as Session } from '@/services/_shared/session';
import { hasAnyRole } from '@/services/_shared/role';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

import { NotFoundError, UnauthorizedError } from '@/lib/errors';

function canRead(session: Session) {
  return hasAnyRole(session, ['ADMIN', 'PILOT', 'CABIN_CREW', 'GROUND_STAFF', 'MECHANIC']);
}

function canWrite(session: Session) {
  return hasAnyRole(session, ['ADMIN', 'GROUND_STAFF']);
}

export const flightOpsLogService = {
  async findById(id: string, session: Session) {
    if (!canRead(session)) throw new UnauthorizedError('read');

    const row = await flightOpsLogRepository.findById(id);
    if (!row) throw new NotFoundError(`Flight ops log not found: ${id}`);
    return row;
  },

  async findByFlightId(flightId: string, session: Session) {
    if (!canRead(session)) throw new UnauthorizedError('read');

    const flight = await flightRepository.findById(flightId);
    if (!flight) throw new NotFoundError(`Flight not found: ${flightId}`);

    const row = await flightOpsLogRepository.findByFlightId(flightId);
    if (!row) throw new NotFoundError(`Flight ops log not found: ${flightId}`);
    return row;
  },

  async findAll(session: Session) {
    if (!canRead(session)) throw new UnauthorizedError('read-all');
    return flightOpsLogRepository.findAll();
  },

  async findAllPaginated(
    session: Session,
    params?: PaginationParams<Record<string, unknown>>,
  ): Promise<PaginatedResponse<Awaited<ReturnType<typeof flightOpsLogRepository.findAll>>[number]>> {
    if (!canRead(session)) throw new UnauthorizedError('read-all');

    const { page, limit, skip } = resolvePagination(params);
    const where = (params as any)?.where;
    const [data, total] = await Promise.all([
      flightOpsLogRepository.findMany({ where, skip, take: limit }),
      flightOpsLogRepository.count(where),
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

  async upsertByFlightId(flightId: string, input: UpsertFlightOpsLogInput, session: Session) {
    if (!canWrite(session)) throw new UnauthorizedError('upsert');

    const flight = await flightRepository.findById(flightId);
    if (!flight) throw new NotFoundError(`Flight not found: ${flightId}`);

    const data = upsertFlightOpsLogSchema.parse(input);
    return flightOpsLogRepository.upsertByFlightId(flightId, data);
  },

  async patchById(id: string, input: PatchFlightOpsLogInput, session: Session) {
    if (!canWrite(session)) throw new UnauthorizedError('update');

    const data = patchFlightOpsLogSchema.parse(input);
    const row = await flightOpsLogRepository.patchById(id, data);
    if (!row) throw new NotFoundError(`Flight ops log not found: ${id}`);

    return row;
  },

  async deleteById(id: string, session: Session) {
    if (!canWrite(session)) throw new UnauthorizedError('delete');

    const row = await flightOpsLogRepository.deleteById(id);
    if (!row) throw new NotFoundError(`Flight ops log not found: ${id}`);

    return row;
  },
};
