import { ticketRepository } from '@/repositories/ticket.repository';
import {
  checkInTicketSchema,
  ticketCreateSchema,
  updateTicketSchema,
  ticketAdminInclude,
  type CheckInTicketInput,
  type CreateTicketInput,
  type TicketAdmin,
  type TicketServiceAction,
  type UpdateTicketInput,
} from '@/types/ticket.type';
import type { PaginatedResponse } from '@/types/common';
import { canAccessTicket } from '@/auth/permissions';
import type { ServiceSession as Session } from '@/services/_shared/session';
import type { Prisma } from '@/generated/prisma/client';
import { makePermissionHelpers } from '@/services/_shared/authorization';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

type TicketListItem = Awaited<ReturnType<typeof ticketRepository.findAll>>[number];

import { NotFoundError, ConflictError, BadRequestError, UnauthorizedError } from '@/lib/errors';

const {
  checkPermission,
  hasPermission: hasTicketPermission,
} = makePermissionHelpers<TicketServiceAction>(
  canAccessTicket,
  'ticket',
  (a) => new UnauthorizedError(a),
);

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

    return ticketRepository.create(data, ticketAdminInclude);
  },

  async findById(id: string, session: Session) {
    checkPermission(session, 'read');

    const ticket = await ticketRepository.findById(id, ticketAdminInclude) as TicketAdmin;

    if (!hasTicketPermission(session, 'read-all') && ticket.booking.userId !== session.user.id) {
      throw new UnauthorizedError('read');
    }

    return ticket;
  },

  async findMine(session: Session) {
    checkPermission(session, 'read');
    return ticketRepository.findByUserId(session.user.id, ticketAdminInclude) as Promise<TicketAdmin[]>;
  },

  async findByBookingId(bookingId: string, session: Session) {
    checkPermission(session, 'read');

    const tickets = await ticketRepository.findByBookingId(bookingId, ticketAdminInclude) as TicketAdmin[];
    if (hasTicketPermission(session, 'read-all')) return tickets;

    return tickets.filter((t) => t.booking.userId === session.user.id);
  },

  async findByFlightId(flightId: string, session: Session) {
    checkPermission(session, 'read');

    const tickets = await ticketRepository.findByFlightId(flightId, ticketAdminInclude) as TicketAdmin[];
    if (hasTicketPermission(session, 'read-all')) return tickets;

    return tickets.filter((t) => t.booking.userId === session.user.id);
  },

  async findByFlightCode(flightCode: string, session: Session) {
    checkPermission(session, 'read');

    const normalizedCode = flightCode.trim().toUpperCase();
    const tickets = await ticketRepository.findByFlightCode(normalizedCode, ticketAdminInclude) as TicketAdmin[];
    if (hasTicketPermission(session, 'read-all')) return tickets;

    return tickets.filter((t) => t.booking.userId === session.user.id);
  },

  async findAll(session: Session) {
    checkPermission(session, 'read-all');
    return ticketRepository.findAll({ include: ticketAdminInclude });
  },

  async findAllPaginated(
    session: Session,
    params?: PaginationParams<Prisma.TicketWhereInput>,
  ): Promise<PaginatedResponse<TicketListItem>> {
    checkPermission(session, 'read-all');

    const { page, limit, skip } = resolvePagination(params);
    const where = (params as any)?.where;
    const [data, total] = await Promise.all([
      ticketRepository.findMany({ where, skip, take: limit, include: ticketAdminInclude }),
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
    // fetch ticket first so we can allow ownership-based check-in for passengers
    const ticket = await ticketRepository.findById(id, ticketAdminInclude) as TicketAdmin;
    // or if the ticket belongs to the current user (passenger checking own ticket)
    if (!hasTicketPermission(session, 'check-in') && ticket.booking.userId !== session.user.id) {
      throw new UnauthorizedError('check-in');
    }

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

    return ticketRepository.checkIn(id, data, ticketAdminInclude);
  },

  async updateTicket(id: string, input: UpdateTicketInput, session: Session) {
    checkPermission(session, 'update');

    const ticket = await ticketRepository.findById(id, ticketAdminInclude);

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

    return ticketRepository.update(id, data, ticketAdminInclude);
  },

  async deleteTicket(id: string, session: Session) {
    checkPermission(session, 'delete');

    await ticketRepository.findById(id);

    return ticketRepository.delete(id);
  },
};
