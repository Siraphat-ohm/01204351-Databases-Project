import { ticketRepository } from '@/repositories/ticket.repository';
import {
  checkInTicketSchema,
  updateTicketSchema,
  type CheckInTicketInput,
  type UpdateTicketInput,
} from '@/types/ticket.type';
import type { PaginatedResponse } from '@/types/common';
import { canAccessTicket } from '@/auth/permissions';
import type { ServiceSession as Session } from '@/services/_shared/session';
import {
  assertPermission,
  hasPermission,
} from '@/services/_shared/authorization';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

type TicketListItem = Awaited<ReturnType<typeof ticketRepository.findAll>>[number];

export class TicketNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Ticket not found: ${identifier}`);
    this.name = 'TicketNotFoundError';
  }
}

export class TicketConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TicketConflictError';
  }
}

export class TicketAlreadyCheckedInError extends Error {
  constructor(id: string) {
    super(`Ticket already checked in: ${id}`);
    this.name = 'TicketAlreadyCheckedInError';
  }
}

export class UnauthorizedError extends Error {
  constructor(action: string) {
    super(`Unauthorized: cannot perform "${action}" on ticket`);
    this.name = 'UnauthorizedError';
  }
}

function checkPermission(
  session: Session,
  action: 'read' | 'update' | 'check-in' | 'read-all',
) {
  assertPermission(
    session,
    action,
    canAccessTicket,
    'ticket',
    (a) => new UnauthorizedError(a),
  );
}

function canReadAll(session: Session) {
  return hasPermission(session, 'read-all', canAccessTicket);
}

export const ticketService = {
  async findById(id: string, session: Session) {
    checkPermission(session, 'read');

    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw new TicketNotFoundError(id);

    if (!canReadAll(session) && ticket.booking.userId !== session.user.id) {
      throw new UnauthorizedError('read');
    }

    return ticket;
  },

  async findMine(session: Session) {
    checkPermission(session, 'read');
    return ticketRepository.findByUserId(session.user.id);
  },

  async findByBookingId(bookingId: string, session: Session) {
    checkPermission(session, 'read');

    const tickets = canReadAll(session)
      ? await ticketRepository.findByBookingId(bookingId)
      : (await ticketRepository.findByBookingId(bookingId)).filter(
          (t) => t.booking.userId === session.user.id,
        );

    return tickets;
  },

  async findByFlightId(flightId: string, session: Session) {
    checkPermission(session, 'read');

    const tickets = await ticketRepository.findByFlightId(flightId);
    if (canReadAll(session)) return tickets;

    return tickets.filter((t) => t.booking.userId === session.user.id);
  },

  async findByFlightCode(flightCode: string, session: Session) {
    checkPermission(session, 'read');

    const normalizedCode = flightCode.trim().toUpperCase();
    const tickets = await ticketRepository.findByFlightCode(normalizedCode);
    if (canReadAll(session)) return tickets;

    return tickets.filter((t) => t.booking.userId === session.user.id);
  },

  async findAll(session: Session) {
    checkPermission(session, 'read-all');
    return ticketRepository.findAll();
  },

  async findAllPaginated(
    session: Session,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<TicketListItem>> {
    checkPermission(session, 'read-all');

    const { page, limit, skip } = resolvePagination(params);
    const rows = await ticketRepository.findAll();
    const total = rows.length;

    return {
      data: rows.slice(skip, skip + limit),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async checkInTicket(id: string, input: CheckInTicketInput, session: Session) {
    checkPermission(session, 'check-in');

    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw new TicketNotFoundError(id);

    if (ticket.checkedIn) throw new TicketAlreadyCheckedInError(id);

    const data = checkInTicketSchema.parse(input);

    if (data.seatNumber) {
      const seatTaken = await ticketRepository.findSeatAssignment(
        ticket.flightId,
        data.seatNumber,
      );
      if (seatTaken && seatTaken.id !== ticket.id) {
        throw new TicketConflictError(`Seat already assigned: ${data.seatNumber}`);
      }
    }

    return ticketRepository.checkIn(id, data);
  },

  async updateTicket(id: string, input: UpdateTicketInput, session: Session) {
    checkPermission(session, 'update');

    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw new TicketNotFoundError(id);

    const data = updateTicketSchema.parse(input);

    if (data.seatNumber) {
      const seatTaken = await ticketRepository.findSeatAssignment(
        ticket.flightId,
        data.seatNumber,
      );
      if (seatTaken && seatTaken.id !== ticket.id) {
        throw new TicketConflictError(`Seat already assigned: ${data.seatNumber}`);
      }
    }

    return ticketRepository.update(id, data);
  },
};
