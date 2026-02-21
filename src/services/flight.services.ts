import { flightRepository }    from '@/repositories/flight.repository';
import { aircraftRepository } from '@/repositories/aircraft.repository';
import { seatRepository } from '@/repositories/seat.repository';
import { canAccessFlight }     from '@/auth/permissions';
import {
  getSeatAvailability,
  getBulkSeatAvailability,
} from '@/services/seat.services';
import {
  changeFlightAircraftSchema,
  createFlightSchema,
  updateFlightSchema,
  flightCodeSchema,
  type ChangeFlightAircraftInput,
  type CreateFlightInput,
  type UpdateFlightInput,
} from '@/types/flight.type';
import {
  FlightSearchSchema,
  type FlightSearchParams,
  type FlightCodeSearchParams,
} from '@/schema/flight.schema';
import { TicketClass } from '@/generated/prisma/client';
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
export class AircraftNotFoundError extends Error {
  constructor(id: string) { super(`Aircraft not found: ${id}`); this.name = 'AircraftNotFoundError'; }
}
export class FlightSeatReassignmentError extends Error {
  constructor(message: string) { super(message); this.name = 'FlightSeatReassignmentError'; }
}

function cabinToTicketClass(cabin: 'FIRST' | 'BUSINESS' | 'ECONOMY'): TicketClass {
  if (cabin === 'FIRST') return TicketClass.FIRST_CLASS;
  if (cabin === 'BUSINESS') return TicketClass.BUSINESS;
  return TicketClass.ECONOMY;
}

function buildSeatsByClass(layout: NonNullable<Awaited<ReturnType<typeof seatRepository.findLayoutByAircraftTypeIataCode>>>) {
  const byClass = new Map<TicketClass, string[]>();
  byClass.set(TicketClass.FIRST_CLASS, []);
  byClass.set(TicketClass.BUSINESS, []);
  byClass.set(TicketClass.ECONOMY, []);

  for (const cabin of layout.cabins) {
    const cls = cabinToTicketClass(cabin.cabin);
    const list = byClass.get(cls)!;

    for (let row = cabin.rowStart; row <= cabin.rowEnd; row++) {
      for (const col of cabin.columns) {
        const label = `${row}${col}`;
        if (!cabin.blockedSeats.includes(label)) {
          list.push(label);
        }
      }
    }
  }

  return byClass;
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

  async changeAircraftAndReassignSeats(
    id: string,
    input: ChangeFlightAircraftInput,
    session: Session,
  ) {
    checkPermission(session, 'update');

    const data = changeFlightAircraftSchema.parse(input);
    const existing = await flightRepository.findById(id);
    if (!existing) throw new FlightNotFoundError(id);

    if (existing.aircraftId === data.aircraftId) {
      throw new FlightConflictError('New aircraft must be different from current aircraft');
    }

    const newAircraft = await aircraftRepository.findById(data.aircraftId);
    if (!newAircraft) throw new AircraftNotFoundError(data.aircraftId);

    const layout = await seatRepository.findLayoutByAircraftTypeIataCode(newAircraft.type.iataCode);
    if (!layout) {
      throw new FlightSeatReassignmentError(
        `Seat layout not found for aircraft type: ${newAircraft.type.iataCode}`,
      );
    }

    const seatedTickets = await flightRepository.findSeatedTickets(id);
    if (seatedTickets.length === 0) {
      const updated = await flightRepository.update(id, { aircraftId: data.aircraftId });
      return {
        flight: updated,
        reassignment: { total: 0, preserved: 0, moved: 0 },
      };
    }

    const seatsByClass = buildSeatsByClass(layout);
    const takenByClass = new Map<TicketClass, Set<string>>();
    takenByClass.set(TicketClass.FIRST_CLASS, new Set());
    takenByClass.set(TicketClass.BUSINESS, new Set());
    takenByClass.set(TicketClass.ECONOMY, new Set());

    const assignments = new Map<string, string>();
    let preserved = 0;

    // Pass 1: Keep existing seat if valid in new layout and still free.
    for (const ticket of seatedTickets) {
      const currentSeat = ticket.seatNumber;
      if (!currentSeat) continue;

      const classSeats = seatsByClass.get(ticket.class) ?? [];
      const taken = takenByClass.get(ticket.class)!;

      if (classSeats.includes(currentSeat) && !taken.has(currentSeat)) {
        assignments.set(ticket.id, currentSeat);
        taken.add(currentSeat);
        preserved++;
      }
    }

    // Pass 2: Assign new seats for remaining tickets.
    for (const ticket of seatedTickets) {
      if (assignments.has(ticket.id)) continue;

      const classSeats = seatsByClass.get(ticket.class) ?? [];
      const taken = takenByClass.get(ticket.class)!;
      const nextSeat = classSeats.find((s) => !taken.has(s));

      if (!nextSeat) {
        throw new FlightSeatReassignmentError(
          `Not enough seats in ${ticket.class} for aircraft change on flight ${id}`,
        );
      }

      assignments.set(ticket.id, nextSeat);
      taken.add(nextSeat);
    }

    const seatAssignments = Array.from(assignments.entries()).map(([ticketId, seatNumber]) => ({
      ticketId,
      seatNumber,
    }));

    const updatedFlight = await flightRepository.changeAircraftAndSeats({
      flightId: id,
      newAircraftId: data.aircraftId,
      seatAssignments,
    });

    if (!updatedFlight) throw new FlightNotFoundError(id);

    return {
      flight: updatedFlight,
      reassignment: {
        total: seatedTickets.length,
        preserved,
        moved: seatedTickets.length - preserved,
      },
    };
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