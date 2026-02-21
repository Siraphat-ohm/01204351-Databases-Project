import { bookingRepository } from '@/repositories/booking.repository';
import { flightRepository } from '@/repositories/flight.repository';
import { paymentRepository } from '@/repositories/payment.repository';
import {
  acceptReaccommodationSchema,
  cancelReaccommodationSchema,
  createBookingSchema,
  changeFlightSchema,
  updateBookingStatusSchema,
  type AcceptReaccommodationInput,
  type CancelReaccommodationInput,
  type CreateBookingInput,
  type ChangeFlightInput,
} from '@/types/booking.type';
import type { PaginatedResponse } from '@/types/common';
import { canAccessBooking } from '@/auth/permissions';
import {
  BookingStatus,
  FlightStatus,
  TransactionStatus,
  TransactionType,
} from '@/generated/prisma/client';
import type { ServiceSession as Session } from '@/services/_shared/session';
import {
  assertPermission,
  hasPermission,
} from '@/services/_shared/authorization';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

type BookingListItem = Awaited<ReturnType<typeof bookingRepository.findAll>>[number];

export class BookingNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Booking not found: ${identifier}`);
    this.name = 'BookingNotFoundError';
  }
}

export class BookingConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookingConflictError';
  }
}

export class BookingAlreadyCancelledError extends Error {
  constructor(id: string) {
    super(`Booking already cancelled: ${id}`);
    this.name = 'BookingAlreadyCancelledError';
  }
}

export class BookingChangeNotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookingChangeNotAllowedError';
  }
}

export class BookingReaccommodationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookingReaccommodationError';
  }
}

export class UnauthorizedError extends Error {
  constructor(action: string) {
    super(`Unauthorized: cannot perform "${action}" on booking`);
    this.name = 'UnauthorizedError';
  }
}

function checkPermission(
  session: Session,
  action: 'create' | 'read' | 'cancel' | 'read-all',
) {
  assertPermission(
    session,
    action,
    canAccessBooking,
    'booking',
    (a) => new UnauthorizedError(a),
  );
}

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
  throw new BookingConflictError('Could not generate unique booking reference');
}

export const bookingService = {
  async findById(id: string, session: Session) {
    checkPermission(session, 'read');

    const booking = await bookingRepository.findById(id);
    if (!booking) throw new BookingNotFoundError(id);

    if (!canReadAll(session) && booking.userId !== session.user.id) {
      throw new UnauthorizedError('read');
    }

    return booking;
  },

  async findByBookingRef(bookingRef: string, session: Session) {
    checkPermission(session, 'read');

    const booking = await bookingRepository.findByBookingRef(bookingRef);
    if (!booking) throw new BookingNotFoundError(bookingRef);

    if (!canReadAll(session) && booking.userId !== session.user.id) {
      throw new UnauthorizedError('read');
    }

    return booking;
  },

  async findMine(session: Session) {
    checkPermission(session, 'read');
    return bookingRepository.findByUserId(session.user.id);
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
    const rows = await bookingRepository.findAll();
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

  async createBooking(input: CreateBookingInput, session: Session) {
    checkPermission(session, 'create');

    const data = createBookingSchema.parse(input);

    if (!canReadAll(session) && data.userId !== session.user.id) {
      throw new UnauthorizedError('create');
    }

    const flight = await flightRepository.findById(data.flightId);
    if (!flight) throw new BookingNotFoundError(`flight:${data.flightId}`);

    const bookingRef = data.bookingRef ?? (await generateUniqueBookingRef());

    const existingByRef = await bookingRepository.findByBookingRef(bookingRef);
    if (existingByRef) throw new BookingConflictError('Booking reference already exists');

    return bookingRepository.create({ ...data, bookingRef });
  },

  async cancelBooking(id: string, session: Session) {
    checkPermission(session, 'cancel');

    const booking = await bookingRepository.findById(id);
    if (!booking) throw new BookingNotFoundError(id);

    if (!canReadAll(session) && booking.userId !== session.user.id) {
      throw new UnauthorizedError('cancel');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BookingAlreadyCancelledError(id);
    }

    const { status } = updateBookingStatusSchema.parse({ status: BookingStatus.CANCELLED });
    return bookingRepository.updateStatus(id, status);
  },

  async changeFlight(id: string, input: ChangeFlightInput, session: Session) {
    checkPermission(session, 'read');
    checkPermission(session, 'cancel');
    checkPermission(session, 'create');

    const booking = await bookingRepository.findById(id);
    if (!booking) throw new BookingNotFoundError(id);

    if (!canReadAll(session) && booking.userId !== session.user.id) {
      throw new UnauthorizedError('change-flight');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BookingAlreadyCancelledError(id);
    }

    if (!canForceChangeFromStatus(booking.flight.status)) {
      throw new BookingChangeNotAllowedError(
        `Flight change is only allowed for disrupted flights. Current status: ${booking.flight.status}`,
      );
    }

    const data = changeFlightSchema.parse(input);

    if (data.newFlightId === booking.flightId) {
      throw new BookingConflictError('New flight must be different from current flight');
    }

    const newFlight = await flightRepository.findById(data.newFlightId);
    if (!newFlight) throw new BookingNotFoundError(`flight:${data.newFlightId}`);

    if (newFlight.status !== FlightStatus.SCHEDULED) {
      throw new BookingChangeNotAllowedError('New flight must be SCHEDULED');
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

    if (!changedBooking) throw new BookingNotFoundError(id);
    return changedBooking;
  },

  async acceptReaccommodation(id: string, input: AcceptReaccommodationInput, session: Session) {
    checkPermission(session, 'read');
    checkPermission(session, 'cancel');
    checkPermission(session, 'create');

    const booking = await bookingRepository.findById(id);
    if (!booking) throw new BookingNotFoundError(id);

    if (!canReadAll(session) && booking.userId !== session.user.id) {
      throw new UnauthorizedError('accept-reaccommodation');
    }

    if (booking.status !== BookingStatus.REACCOMMODATION_PENDING) {
      throw new BookingReaccommodationError(
        `Booking is not pending reaccommodation: ${booking.status}`,
      );
    }

    const data = acceptReaccommodationSchema.parse(input);

    if (data.newFlightId === booking.flightId) {
      throw new BookingConflictError('New flight must be different from current flight');
    }

    const newFlight = await flightRepository.findById(data.newFlightId);
    if (!newFlight) throw new BookingNotFoundError(`flight:${data.newFlightId}`);

    if (newFlight.status !== FlightStatus.SCHEDULED) {
      throw new BookingReaccommodationError('Selected flight is not available for reaccommodation');
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

    if (!changedBooking) throw new BookingNotFoundError(id);
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
    if (!booking) throw new BookingNotFoundError(id);

    if (!canReadAll(session) && booking.userId !== session.user.id) {
      throw new UnauthorizedError('cancel-reaccommodation');
    }

    if (booking.status !== BookingStatus.REACCOMMODATION_PENDING) {
      throw new BookingReaccommodationError(
        `Booking is not pending reaccommodation: ${booking.status}`,
      );
    }

    const { reason } = cancelReaccommodationSchema.parse(input ?? {});
    const payments = await paymentRepository.findByBookingId(id);

    const refundablePayments = payments.filter(
      (p) => p.type === TransactionType.PAYMENT && p.status === TransactionStatus.SUCCESS,
    );

    for (const payment of refundablePayments) {
      await paymentRepository.createRefund({
        bookingId: payment.bookingId,
        amount: Number(payment.amount),
        currency: payment.currency,
        reason: reason ?? 'Passenger cancelled during reaccommodation',
        originalTransactionId: payment.id,
      });

      await paymentRepository.updateStatus(payment.id, {
        status: TransactionStatus.REFUNDED,
        refundedAt: new Date(),
        refundReason: reason ?? 'Passenger cancelled during reaccommodation',
      });
    }

    const { status } = updateBookingStatusSchema.parse({ status: BookingStatus.CANCELLED });
    return bookingRepository.updateStatus(id, status);
  },
};
