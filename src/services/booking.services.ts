import { bookingRepository } from '@/repositories/booking.repository';
import { flightRepository } from '@/repositories/flight.repository';
import {
  createBookingSchema,
  updateBookingStatusSchema,
  type CreateBookingInput,
} from '@/types/booking.type';
import { canAccessBooking } from '@/auth/permissions';
import { BookingStatus } from '@/generated/prisma/client';
import type { ServiceSession as Session } from '@/services/_shared/session';
import {
  assertPermission,
  hasPermission,
} from '@/services/_shared/authorization';

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
};
