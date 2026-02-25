import { flightRepository } from '@/repositories/flight.repository';
import { flightOpsLogRepository } from '@/repositories/flight-ops-log.repository';
import {
  upsertFlightOpsLogSchema,
  patchFlightOpsLogSchema,
  type UpsertFlightOpsLogInput,
  type PatchFlightOpsLogInput,
} from '@/types/flight-ops-log.type';
import type { ServiceSession as Session } from '@/services/_shared/session';

export class FlightOpsLogNotFoundError extends Error {
  constructor(id: string) {
    super(`Flight ops log not found: ${id}`);
    this.name = 'FlightOpsLogNotFoundError';
  }
}

export class FlightNotFoundError extends Error {
  constructor(id: string) {
    super(`Flight not found: ${id}`);
    this.name = 'FlightNotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(action: string) {
    super(`Unauthorized: cannot perform "${action}" on flight ops log`);
    this.name = 'UnauthorizedError';
  }
}

function canRead(session: Session) {
  return ['ADMIN', 'PILOT', 'CABIN_CREW', 'GROUND_STAFF', 'MECHANIC'].includes(
    session.user.role,
  );
}

function canWrite(session: Session) {
  return ['ADMIN', 'GROUND_STAFF'].includes(session.user.role);
}

export const flightOpsLogService = {
  async findById(id: string, session: Session) {
    if (!canRead(session)) throw new UnauthorizedError('read');

    const row = await flightOpsLogRepository.findById(id);
    if (!row) throw new FlightOpsLogNotFoundError(id);
    return row;
  },

  async findByFlightId(flightId: string, session: Session) {
    if (!canRead(session)) throw new UnauthorizedError('read');

    const flight = await flightRepository.findById(flightId);
    if (!flight) throw new FlightNotFoundError(flightId);

    const row = await flightOpsLogRepository.findByFlightId(flightId);
    if (!row) throw new FlightOpsLogNotFoundError(flightId);
    return row;
  },

  async findAll(session: Session) {
    if (!canRead(session)) throw new UnauthorizedError('read-all');
    return flightOpsLogRepository.findAll();
  },

  async upsertByFlightId(flightId: string, input: UpsertFlightOpsLogInput, session: Session) {
    if (!canWrite(session)) throw new UnauthorizedError('upsert');

    const flight = await flightRepository.findById(flightId);
    if (!flight) throw new FlightNotFoundError(flightId);

    const data = upsertFlightOpsLogSchema.parse(input);
    return flightOpsLogRepository.upsertByFlightId(flightId, data);
  },

  async patchById(id: string, input: PatchFlightOpsLogInput, session: Session) {
    if (!canWrite(session)) throw new UnauthorizedError('update');

    const data = patchFlightOpsLogSchema.parse(input);
    const row = await flightOpsLogRepository.patchById(id, data);
    if (!row) throw new FlightOpsLogNotFoundError(id);

    return row;
  },
};
