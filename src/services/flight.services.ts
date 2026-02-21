import { flightRepository }    from '@/repositories/flight.repository';
import { canAccessFlight }     from '@/auth/permissions';
import {
  getSeatAvailability,
  getBulkSeatAvailability,
} from '@/services/seat.services';
import {
  createFlightSchema,
  updateFlightSchema,
  flightCodeSchema,
  type CreateFlightInput,
  type UpdateFlightInput,
} from '@/types/flight.type';
import {
  FlightSearchSchema,
  type FlightSearchParams,
  type FlightCodeSearchParams,
} from '@/schema/flight.schema';
import type { ServiceSession as Session } from '@/services/_shared/session';
import { assertPermission } from '@/services/_shared/authorization';


export class FlightNotFoundError extends Error {
  constructor(id: string) { super(`Flight not found: ${id}`); this.name = 'FlightNotFoundError'; }
}
export class FlightConflictError extends Error {
  constructor(code: string) { super(`Flight already exists: ${code}`); this.name = 'FlightConflictError'; }
}
export class FlightInUseError extends Error {
  constructor(id: string) { super(`Cannot delete flight with bookings: ${id}`); this.name = 'FlightInUseError'; }
}
export class UnauthorizedError extends Error {
  constructor(action: string) { super(`Unauthorized: "${action}" on flight`); this.name = 'UnauthorizedError'; }
}

function checkPermission(
  session: Session,
  action: 'create' | 'read' | 'update' | 'delete' | 'manage-status',
) {
  assertPermission(
    session,
    action,
    canAccessFlight,
    'flight',
    (a) => new UnauthorizedError(a),
  );
}

const PUBLIC_SESSION: Session = {
  user: {
    id: 'public',
    role: 'PASSENGER',
  },
};

export const flightService = {

  async findById(id: string, session: Session) {
    checkPermission(session, 'read');
    const flight = await flightRepository.findByIdForRole(id, session.user.role);
    if (!flight) throw new FlightNotFoundError(id);
    return flight;
  },

  async findByCode(code: string, session: Session) {
    checkPermission(session, 'read');
    const flightCode = flightCodeSchema.parse(code);
    const flight = await flightRepository.findByCodeForRole(flightCode, session.user.role);
    if (!flight) throw new FlightNotFoundError(flightCode);
    return flight;
  },

  async findAll(session: Session) {
    checkPermission(session, 'read');
    return flightRepository.findAllForRole(session.user.role);
  },

  async searchWithAvailability(params: FlightSearchParams, session: Session) {
    checkPermission(session, 'read');
    const validated = FlightSearchSchema.parse(params);
    const result    = await flightRepository.searchAvailable(validated);

    const availabilityMap = await getBulkSeatAvailability(
      result.data.map((f) => ({ id: f.id, aircraftTypeIataCode: f.aircraft.type.iataCode })),
    );

    return {
      data: result.data.map((f) => ({ ...f, seatAvailability: availabilityMap.get(f.id) ?? null })),
      meta: { ...result.meta, totalPages: Math.ceil(result.meta.total / result.meta.limit) },
    };
  },

  async findDetailWithAvailability(params: FlightCodeSearchParams, session: Session) {
    checkPermission(session, 'read');
    const flight = await flightRepository.findDetailByCode(params);
    if (!flight) throw new FlightNotFoundError(params.flightCode);

    const seatAvailability = await getSeatAvailability(
      flight.id,
      flight.aircraft.type.iataCode,
    );

    return { ...flight, seatAvailability };
  },

  async findPublicDetailWithAvailability(params: FlightCodeSearchParams) {
    checkPermission(PUBLIC_SESSION, 'read');

    const flight = await flightRepository.findDetailByCode(params);
    if (!flight || flight.status !== 'SCHEDULED') return null;

    const seatAvailability = await getSeatAvailability(
      flight.id,
      flight.aircraft.type.iataCode,
    );

    return { ...flight, seatAvailability };
  },

  async createFlight(input: CreateFlightInput, session: Session) {
    checkPermission(session, 'create');
    const data     = createFlightSchema.parse(input);
    const existing = await flightRepository.findByCode(data.flightCode);
    if (existing) throw new FlightConflictError(data.flightCode);
    return flightRepository.create(data);
  },

  async updateFlight(id: string, input: UpdateFlightInput, session: Session) {
    checkPermission(session, 'update');
    const data     = updateFlightSchema.parse(input);
    const existing = await flightRepository.findById(id);
    if (!existing) throw new FlightNotFoundError(id);
    if (data.flightCode && data.flightCode !== existing.flightCode) {
      const conflict = await flightRepository.findByCode(data.flightCode);
      if (conflict) throw new FlightConflictError(data.flightCode);
    }
    return flightRepository.update(id, data);
  },

  async updateStatus(id: string, status: UpdateFlightInput['status'], session: Session) {
    checkPermission(session, 'manage-status');
    const existing = await flightRepository.findById(id);
    if (!existing) throw new FlightNotFoundError(id);
    return flightRepository.update(id, { status });
  },

  async deleteFlight(id: string, session: Session) {
    checkPermission(session, 'delete');
    const existing = await flightRepository.findById(id);
    if (!existing) throw new FlightNotFoundError(id);
    const bookingCount = await flightRepository.countBookings(id);
    if (bookingCount > 0) throw new FlightInUseError(id);
    return flightRepository.delete(id);
  },
};