import { bookingRepository } from '@/repositories/booking.repository';
import { paymentLogRepository } from '@/repositories/payment-log.repository';
import {
  createPaymentLogSchema,
  updatePaymentLogSchema,
  type CreatePaymentLogInput,
  type UpdatePaymentLogInput,
} from '@/types/payment-log.type';
import type { ServiceSession as Session } from '@/services/_shared/session';

export class PaymentLogNotFoundError extends Error {
  constructor(id: string) {
    super(`Payment log not found: ${id}`);
    this.name = 'PaymentLogNotFoundError';
  }
}

export class BookingNotFoundError extends Error {
  constructor(id: string) {
    super(`Booking not found: ${id}`);
    this.name = 'BookingNotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(action: string) {
    super(`Unauthorized: cannot perform "${action}" on payment log`);
    this.name = 'UnauthorizedError';
  }
}

function isAdmin(session: Session) {
  return session.user.role === 'ADMIN';
}

async function assertCanReadBooking(session: Session, bookingId: string) {
  const booking = await bookingRepository.findById(bookingId);
  if (!booking) throw new BookingNotFoundError(bookingId);

  if (!isAdmin(session) && booking.userId !== session.user.id) {
    throw new UnauthorizedError('read');
  }

  return booking;
}

export const paymentLogService = {
  async findById(id: string, session: Session) {
    const log = await paymentLogRepository.findById(id);
    if (!log) throw new PaymentLogNotFoundError(id);

    const bookingId = String((log as { bookingId: unknown }).bookingId);
    await assertCanReadBooking(session, bookingId);

    return log;
  },

  async findByBookingId(bookingId: string, session: Session) {
    await assertCanReadBooking(session, bookingId);
    return paymentLogRepository.findByBookingId(bookingId);
  },

  async findAll(session: Session) {
    if (!isAdmin(session)) throw new UnauthorizedError('read-all');
    return paymentLogRepository.findAll();
  },

  async create(input: CreatePaymentLogInput, session: Session) {
    if (!isAdmin(session)) throw new UnauthorizedError('create');

    const data = createPaymentLogSchema.parse(input);
    await assertCanReadBooking(session, data.bookingId);

    return paymentLogRepository.create(data);
  },

  async updateById(id: string, input: UpdatePaymentLogInput, session: Session) {
    if (!isAdmin(session)) throw new UnauthorizedError('update');

    const data = updatePaymentLogSchema.parse(input);
    const updated = await paymentLogRepository.updateById(id, data);
    if (!updated) throw new PaymentLogNotFoundError(id);

    return updated;
  },
};
