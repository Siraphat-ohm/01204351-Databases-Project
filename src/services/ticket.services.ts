import { ticketRepository } from '@/repositories/ticket.repository';
import {
  checkInTicketSchema,
  ticketCreateSchema,
  updateTicketSchema,
  type CheckInTicketInput,
  type CreateTicketInput,
  type UpdateTicketInput,
} from '@/types/ticket.type';
import type { PaginatedResponse } from '@/types/common';
import { canAccessTicket } from '@/auth/permissions';
import type { ServiceSession as Session } from '@/services/_shared/session';
import type { Prisma } from '@/generated/prisma/client';
import {
  makeCheckPermission,
  hasPermission,
} from '@/services/_shared/authorization';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

type TicketListItem = Awaited<ReturnType<typeof ticketRepository.findAll>>[number];

import { NotFoundError, ConflictError, BadRequestError, UnauthorizedError } from '@/lib/errors';

const checkPermission = makeCheckPermission(
  canAccessTicket,
  'ticket',
  (a) => new UnauthorizedError(a),
);

function canReadAll(session: Session) {
  return hasPermission(session, 'read-all', canAccessTicket);
}

export const ticketService = {
  async createTicket(input: CreateTicketInput, session: Session) {
    checkPermission(session, 'create');

    const data = ticketCreateSchema.parse(input);

    if (data.seatNumber) {
      const seatTaken = await ticketRepository.findSeatAssignment(
        data.flightId,
        data.seatNumber,
      );
      if (seatTaken) {
          throw new ConflictError(`Seat already assigned: ${data.seatNumber}`);
        }
    }

    return ticketRepository.create(data);
  },

  async findById(id: string, session: Session) {
    checkPermission(session, 'read');

    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw new NotFoundError(`Ticket not found: ${id}`);

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
    params?: PaginationParams<Prisma.TicketWhereInput>,
  ): Promise<PaginatedResponse<TicketListItem>> {
    checkPermission(session, 'read-all');

    const { page, limit, skip } = resolvePagination(params);
    const where = (params as any)?.where;
    const [data, total] = await Promise.all([
      ticketRepository.findMany({ where, skip, take: limit }),
      ticketRepository.count(where),
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

  async checkInTicket(id: string, input: CheckInTicketInput, session: Session) {
    checkPermission(session, 'check-in');

    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw new NotFoundError(`Ticket not found: ${id}`);

      if (ticket.checkedIn) throw new BadRequestError(`Ticket already checked in: ${id}`);

    const data = checkInTicketSchema.parse(input);

    if (data.seatNumber) {
      const seatTaken = await ticketRepository.findSeatAssignment(
        ticket.flightId,
        data.seatNumber,
      );
      if (seatTaken && seatTaken.id !== ticket.id) {
        throw new ConflictError(`Seat already assigned: ${data.seatNumber}`);
      }
    }

    return ticketRepository.checkIn(id, data);
  },

  async updateTicket(id: string, input: UpdateTicketInput, session: Session) {
    checkPermission(session, 'update');

    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw new NotFoundError(`Ticket not found: ${id}`);

    const data = updateTicketSchema.parse(input);

    if (data.seatNumber) {
      const seatTaken = await ticketRepository.findSeatAssignment(
        ticket.flightId,
        data.seatNumber,
      );
      if (seatTaken && seatTaken.id !== ticket.id) {
        throw new ConflictError(`Seat already assigned: ${data.seatNumber}`);
      }
    }

    return ticketRepository.update(id, data);
  },

  async deleteTicket(id: string, session: Session) {
    checkPermission(session, 'delete');

    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw new NotFoundError(`Ticket not found: ${id}`);

    return ticketRepository.delete(id);
  },
};
