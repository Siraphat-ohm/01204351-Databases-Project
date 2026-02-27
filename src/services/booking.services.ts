import { bookingRepository } from '@/repositories/booking.repository';
import { flightRepository } from '@/repositories/flight.repository';
import { userRepository } from '@/repositories/user.repository';
import { paymentService } from '@/services/payment.services';
import {
  acceptReaccommodationSchema,
  cancelReaccommodationSchema,
  createBookingSchema,
  createBookingWithTicketsSchema,
  createGuestBookingSchema,
  createGuestBookingWithTicketsSchema,
  changeFlightSchema,
  updateBookingStatusSchema,
  type AcceptReaccommodationInput,
  type BookingTicketInput,
  type CancelReaccommodationInput,
  type CreateBookingInput,
  type CreateGuestBookingInput,
  type CreateGuestBookingWithTicketsInput,
  type CreateBookingWithTicketsInput,
  type ChangeFlightInput,
} from '@/types/booking.type';
import type { PaginatedResponse } from '@/types/common';
import { canAccessBooking } from '@/auth/permissions';
import {
  BookingStatus,
  FlightStatus,
} from '@/generated/prisma/client';
import type { ServiceSession as Session } from '@/services/_shared/session';
import {
  makeCheckPermission,
  hasPermission,
} from '@/services/_shared/authorization';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

type BookingListItem = Awaited<ReturnType<typeof bookingRepository.findAll>>[number];

import { NotFoundError, ConflictError, BadRequestError, UnauthorizedError } from '@/lib/errors';

const checkPermission = makeCheckPermission(
  canAccessBooking,
  'booking',
  (a) => new UnauthorizedError(a),
);

function canReadAll(session: Session) {
  return hasPermission(session, 'read-all', canAccessBooking);
}

function canForceChangeFromStatus(status: FlightStatus) {
  const disruptedStatuses: FlightStatus[] = [
    FlightStatus.CANCELLED,
    FlightStatus.DELAYED,
    FlightStatus.DIVERTED,
  ];

  return disruptedStatuses.includes(status);
}

function makeBookingRef() {
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `BK${random}`;
}

async function generateUniqueBookingRef() {
  for (let i = 0; i < 5; i++) {
    const bookingRef = makeBookingRef();
    const exists = await bookingRepository.findByBookingRef(bookingRef);
    if (!exists) return bookingRef;
  }
  throw new ConflictError('Could not generate unique booking reference');
}

function assertNoDuplicateSeatAssignments(tickets: BookingTicketInput[]) {
  const seen = new Set<string>();
  for (const t of tickets) {
    if (!t.seatNumber) continue;
    const seat = t.seatNumber.trim().toUpperCase();
    if (seen.has(seat)) {
      throw new ConflictError(`Duplicate seat in request: ${seat}`);
    }
    seen.add(seat);
  }
}

function makeGuestEmail(contactEmail: string) {
  const [local = 'guest', domain = 'example.com'] = contactEmail.toLowerCase().split('@');
  const token = Math.random().toString(36).slice(2, 10);
  return `${local}+guest-${token}@${domain}`;
}

const MAX_PASSENGERS_PER_BOOKING = 9;

function assertPassengerLimit(tickets: BookingTicketInput[]) {
  if (tickets.length > MAX_PASSENGERS_PER_BOOKING) {
    throw new BadRequestError(`Too many passengers in one booking. Maximum allowed: ${MAX_PASSENGERS_PER_BOOKING}`);
  }
}

function assertBookingTotalMatchesTickets(totalPrice: number, tickets: BookingTicketInput[]) {
  const expected = tickets.reduce((sum, t) => sum + t.price + (t.seatSurcharge ?? 0), 0);
  if (Math.abs(expected - totalPrice) > 0.01) {
    throw new BadRequestError(`Total price mismatch. Expected ${expected}, got ${totalPrice}`);
  }
}

export const bookingService = {
  async findById(id: string, session: Session) {
    checkPermission(session, 'read');

    const booking = await bookingRepository.findById(id);
    if (!booking) throw new NotFoundError(`Booking not found: ${id}`);

    if (!canReadAll(session) && booking.userId !== session.user.id) {
      throw new UnauthorizedError('read');
    }

    return booking;
  },

  async findByBookingRef(bookingRef: string, session: Session) {
    checkPermission(session, 'read');

    const booking = await bookingRepository.findByBookingRef(bookingRef);
    if (!booking) throw new NotFoundError(`Booking not found: ${bookingRef}`);

    if (!canReadAll(session) && booking.userId !== session.user.id) {
      throw new UnauthorizedError('read');
    }

    return booking;
  },

  async findMine(session: Session) {
    checkPermission(session, 'read');
    return bookingRepository.findByUserId(session.user.id);
  },

  async findByFlightId(flightId: string, session: Session) {
    checkPermission(session, 'read');

    const bookings = await bookingRepository.findByFlightId(flightId);
    if (canReadAll(session)) return bookings;

    return bookings.filter((b) => b.userId === session.user.id);
  },

  async findByFlightCode(flightCode: string, session: Session) {
    checkPermission(session, 'read');

    const normalizedCode = flightCode.trim().toUpperCase();
    const bookings = await bookingRepository.findByFlightCode(normalizedCode);
    if (canReadAll(session)) return bookings;

    return bookings.filter((b) => b.userId === session.user.id);
  },

  async findAll(session: Session) {
    checkPermission(session, 'read-all');
    return bookingRepository.findAll();
  },

  async findAllPaginated(
    session: Session,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<BookingListItem>> {
    checkPermission(session, 'read-all');

    const { page, limit, skip } = resolvePagination(params);
    const [data, total] = await Promise.all([
      bookingRepository.findMany({
        skip,
        take: limit,
      }),
      bookingRepository.count(),
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

  async createBooking(input: CreateBookingInput, session: Session) {
    checkPermission(session, 'create');

    const data = createBookingSchema.parse(input);

    if (!canReadAll(session) && data.userId !== session.user.id) {
      throw new UnauthorizedError('create');
    }

    const flight = await flightRepository.findById(data.flightId);
    if (!flight) throw new NotFoundError(`Booking not found: flight:${data.flightId}`);

    const bookingRef = data.bookingRef ?? (await generateUniqueBookingRef());

    const existingByRef = await bookingRepository.findByBookingRef(bookingRef);
    if (existingByRef) throw new ConflictError('Booking reference already exists');

    return bookingRepository.create({ ...data, bookingRef });
  },

  async createBookingWithTickets(input: CreateBookingWithTicketsInput, session: Session) {
    checkPermission(session, 'create');

    const data = createBookingWithTicketsSchema.parse(input);

    if (!canReadAll(session) && data.userId !== session.user.id) {
      throw new UnauthorizedError('create');
    }

    assertPassengerLimit(data.tickets);
    assertBookingTotalMatchesTickets(data.totalPrice, data.tickets);

    const flight = await flightRepository.findById(data.flightId);
    if (!flight) throw new NotFoundError(`Booking not found: flight:${data.flightId}`);

    assertNoDuplicateSeatAssignments(data.tickets);

    const requestedSeats = data.tickets
      .map((t) => t.seatNumber?.trim().toUpperCase())
      .filter((s): s is string => Boolean(s));

    if (requestedSeats.length > 0) {
      const occupied = await bookingRepository.findOccupiedSeats(data.flightId, requestedSeats);
      if (occupied.length > 0) {
        const occupiedSeatList = occupied
          .map((s) => s.seatNumber)
          .filter((s): s is string => Boolean(s))
          .sort();
        throw new ConflictError(`Seat already assigned: ${occupiedSeatList.join(', ')}`);
      }
    }

    const bookingRef = data.bookingRef ?? (await generateUniqueBookingRef());
    const existingByRef = await bookingRepository.findByBookingRef(bookingRef);
    if (existingByRef) throw new ConflictError('Booking reference already exists');

    return bookingRepository.createWithTickets({
      booking: {
        bookingRef,
        userId: data.userId,
        flightId: data.flightId,
        totalPrice: data.totalPrice,
        currency: data.currency,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
      },
      tickets: data.tickets,
    });
  },

  async createGuestBooking(input: CreateGuestBookingInput) {
    const data = createGuestBookingSchema.parse(input);

    const flight = await flightRepository.findById(data.flightId);
    if (!flight) throw new NotFoundError(`Booking not found: flight:${data.flightId}`);

    const bookingRef = data.bookingRef ?? (await generateUniqueBookingRef());
    const existingByRef = await bookingRepository.findByBookingRef(bookingRef);
    if (existingByRef) throw new ConflictError('Booking reference already exists');

    const guestUser = await userRepository.createGuestUser({
      email: makeGuestEmail(data.contactEmail),
      name: data.guestName ?? 'Guest Passenger',
      phone: data.contactPhone,
    });

    return bookingRepository.create({
      bookingRef,
      userId: guestUser.id,
      flightId: data.flightId,
      totalPrice: data.totalPrice,
      currency: data.currency,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
    });
  },

  async createGuestBookingWithTickets(input: CreateGuestBookingWithTicketsInput) {
    const data = createGuestBookingWithTicketsSchema.parse(input);

    assertPassengerLimit(data.tickets);
    assertBookingTotalMatchesTickets(data.totalPrice, data.tickets);

    const flight = await flightRepository.findById(data.flightId);
    if (!flight) throw new NotFoundError(`Booking not found: flight:${data.flightId}`);

    assertNoDuplicateSeatAssignments(data.tickets);

    const requestedSeats = data.tickets
      .map((t) => t.seatNumber?.trim().toUpperCase())
      .filter((s): s is string => Boolean(s));

    if (requestedSeats.length > 0) {
      const occupied = await bookingRepository.findOccupiedSeats(data.flightId, requestedSeats);
      if (occupied.length > 0) {
        const occupiedSeatList = occupied
          .map((s) => s.seatNumber)
          .filter((s): s is string => Boolean(s))
          .sort();
        throw new ConflictError(`Seat already assigned: ${occupiedSeatList.join(', ')}`);
      }
    }

    const bookingRef = data.bookingRef ?? (await generateUniqueBookingRef());
    const existingByRef = await bookingRepository.findByBookingRef(bookingRef);
    if (existingByRef) throw new ConflictError('Booking reference already exists');

    const guestUser = await userRepository.createGuestUser({
      email: makeGuestEmail(data.contactEmail),
      name: data.guestName ?? 'Guest Passenger',
      phone: data.contactPhone,
    });

    return bookingRepository.createWithTickets({
      booking: {
        bookingRef,
        userId: guestUser.id,
        flightId: data.flightId,
        totalPrice: data.totalPrice,
        currency: data.currency,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
      },
      tickets: data.tickets,
    });
  },

  async cancelBooking(id: string, session: Session) {
    checkPermission(session, 'cancel');

    const booking = await bookingRepository.findById(id);
    if (!booking) throw new NotFoundError(`Booking not found: ${id}`);

    if (!canReadAll(session) && booking.userId !== session.user.id) {
      throw new UnauthorizedError('cancel');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new ConflictError(`Booking already cancelled: ${id}`);
    }

    const { status } = updateBookingStatusSchema.parse({ status: BookingStatus.CANCELLED });
    return bookingRepository.updateStatus(id, status);
  },

  async changeFlight(id: string, input: ChangeFlightInput, session: Session) {
    checkPermission(session, 'read');
    checkPermission(session, 'cancel');
    checkPermission(session, 'create');

    const booking = await bookingRepository.findById(id);
    if (!booking) throw new NotFoundError(`Booking not found: ${id}`);

    if (!canReadAll(session) && booking.userId !== session.user.id) {
      throw new UnauthorizedError('change-flight');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new ConflictError(`Booking already cancelled: ${id}`);
    }

    if (!canForceChangeFromStatus(booking.flight.status)) {
      throw new ConflictError(
        `Flight change is only allowed for disrupted flights. Current status: ${booking.flight.status}`,
      );
    }

    const data = changeFlightSchema.parse(input);

    if (data.newFlightId === booking.flightId) {
      throw new ConflictError('New flight must be different from current flight');
    }

    const newFlight = await flightRepository.findById(data.newFlightId);
    if (!newFlight) throw new NotFoundError(`Booking not found: flight:${data.newFlightId}`);

    if (newFlight.status !== FlightStatus.SCHEDULED) {
      throw new ConflictError('New flight must be SCHEDULED');
    }

    const newBookingRef = await generateUniqueBookingRef();

    const changedBooking = await bookingRepository.changeFlight({
      bookingId: id,
      newFlightId: data.newFlightId,
      newBookingRef,
      totalPrice: data.totalPrice,
      currency: data.currency,
      keepSeatAssignments: data.keepSeatAssignments,
    });

    if (!changedBooking) throw new NotFoundError(`Booking not found: ${id}`);
    return changedBooking;
  },

  async acceptReaccommodation(id: string, input: AcceptReaccommodationInput, session: Session) {
    checkPermission(session, 'read');
    checkPermission(session, 'cancel');
    checkPermission(session, 'create');

    const booking = await bookingRepository.findById(id);
    if (!booking) throw new NotFoundError(`Booking not found: ${id}`);

    if (!canReadAll(session) && booking.userId !== session.user.id) {
      throw new UnauthorizedError('accept-reaccommodation');
    }

    if (booking.status !== BookingStatus.REACCOMMODATION_PENDING) {
      throw new ConflictError(`Booking is not pending reaccommodation: ${booking.status}`);
    }

    const data = acceptReaccommodationSchema.parse(input);

    if (data.newFlightId === booking.flightId) {
      throw new ConflictError('New flight must be different from current flight');
    }

    const newFlight = await flightRepository.findById(data.newFlightId);
    if (!newFlight) throw new NotFoundError(`Booking not found: flight:${data.newFlightId}`);

    if (newFlight.status !== FlightStatus.SCHEDULED) {
      throw new ConflictError('Selected flight is not available for reaccommodation');
    }

    const newBookingRef = await generateUniqueBookingRef();
    const changedBooking = await bookingRepository.changeFlight({
      bookingId: id,
      newFlightId: data.newFlightId,
      newBookingRef,
      totalPrice: data.totalPrice,
      currency: data.currency,
      keepSeatAssignments: false,
    });

    if (!changedBooking) throw new NotFoundError(`Booking not found: ${id}`);
    return changedBooking;
  },

  async cancelForReaccommodation(
    id: string,
    input: CancelReaccommodationInput,
    session: Session,
  ) {
    checkPermission(session, 'cancel');
    checkPermission(session, 'read');

    const booking = await bookingRepository.findById(id);
    if (!booking) throw new NotFoundError(`Booking not found: ${id}`);

    if (!canReadAll(session) && booking.userId !== session.user.id) {
      throw new UnauthorizedError('cancel-reaccommodation');
    }

    if (booking.status !== BookingStatus.REACCOMMODATION_PENDING) {
      throw new ConflictError(`Booking is not pending reaccommodation: ${booking.status}`);
    }

    const { reason } = cancelReaccommodationSchema.parse(input ?? {});
    await paymentService.refundBookingForReaccommodation(
      id,
      reason ?? 'Passenger cancelled during reaccommodation',
    );

    const { status } = updateBookingStatusSchema.parse({ status: BookingStatus.CANCELLED });
    return bookingRepository.updateStatus(id, status);
  },
};
