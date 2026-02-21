import { bookingRepository } from '@/repositories/booking.repository';
import { paymentRepository } from '@/repositories/payment.repository';
import {
  createPaymentSchema,
  markPaymentStatusSchema,
  refundPaymentSchema,
  type CreatePaymentInput,
  type RefundPaymentInput,
} from '@/types/payment.type';
import {
  TransactionStatus,
  TransactionType,
} from '@/generated/prisma/client';
import { canAccessPayment } from '@/auth/permissions';
import type { ServiceSession as Session } from '@/services/_shared/session';
import {
  assertPermission,
  hasPermission,
} from '@/services/_shared/authorization';

export class PaymentNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Payment not found: ${identifier}`);
    this.name = 'PaymentNotFoundError';
  }
}

export class PaymentConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentConflictError';
  }
}

export class BookingNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Booking not found: ${identifier}`);
    this.name = 'BookingNotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(action: string) {
    super(`Unauthorized: cannot perform "${action}" on payment`);
    this.name = 'UnauthorizedError';
  }
}

function checkPermission(
  session: Session,
  action: 'create' | 'read' | 'refund' | 'read-all',
) {
  assertPermission(
    session,
    action,
    canAccessPayment,
    'payment',
    (a) => new UnauthorizedError(a),
  );
}

function canReadAll(session: Session) {
  return hasPermission(session, 'read-all', canAccessPayment);
}

export const paymentService = {
  async findById(id: string, session: Session) {
    checkPermission(session, 'read');

    const payment = await paymentRepository.findById(id);
    if (!payment) throw new PaymentNotFoundError(id);

    if (!canReadAll(session) && payment.booking.userId !== session.user.id) {
      throw new UnauthorizedError('read');
    }

    return payment;
  },

  async findByBookingId(bookingId: string, session: Session) {
    checkPermission(session, 'read');

    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new BookingNotFoundError(bookingId);

    if (!canReadAll(session) && booking.userId !== session.user.id) {
      throw new UnauthorizedError('read');
    }

    return paymentRepository.findByBookingId(bookingId);
  },

  async findMine(session: Session) {
    checkPermission(session, 'read');
    return paymentRepository.findByUserId(session.user.id);
  },

  async findAll(session: Session) {
    checkPermission(session, 'read-all');
    return paymentRepository.findAll();
  },

  async createPayment(input: CreatePaymentInput, session: Session) {
    checkPermission(session, 'create');

    const data = createPaymentSchema.parse(input);

    const booking = await bookingRepository.findById(data.bookingId);
    if (!booking) throw new BookingNotFoundError(data.bookingId);

    if (!canReadAll(session) && booking.userId !== session.user.id) {
      throw new UnauthorizedError('create');
    }

    if (data.stripePaymentIntentId) {
      const existing = await paymentRepository.findByStripePaymentIntentId(
        data.stripePaymentIntentId,
      );
      if (existing) {
        throw new PaymentConflictError('Payment intent already exists');
      }
    }

    return paymentRepository.createPayment(data);
  },

  async markPaymentSuccess(
    id: string,
    input: { stripeChargeId?: string },
    session: Session,
  ) {
    checkPermission(session, 'create');

    const existing = await paymentRepository.findById(id);
    if (!existing) throw new PaymentNotFoundError(id);

    if (existing.type !== TransactionType.PAYMENT) {
      throw new PaymentConflictError('Only payment transaction can be marked success');
    }

    const data = markPaymentStatusSchema.parse({
      status: TransactionStatus.SUCCESS,
      stripeChargeId: input.stripeChargeId,
    });

    return paymentRepository.updateStatus(id, data);
  },

  async markPaymentFailed(
    id: string,
    input: { failureCode?: string; failureMessage?: string },
    session: Session,
  ) {
    checkPermission(session, 'create');

    const existing = await paymentRepository.findById(id);
    if (!existing) throw new PaymentNotFoundError(id);

    if (existing.type !== TransactionType.PAYMENT) {
      throw new PaymentConflictError('Only payment transaction can be marked failed');
    }

    const data = markPaymentStatusSchema.parse({
      status: TransactionStatus.FAILED,
      failureCode: input.failureCode,
      failureMessage: input.failureMessage,
    });

    return paymentRepository.updateStatus(id, data);
  },

  async refundPayment(id: string, input: RefundPaymentInput, session: Session) {
    checkPermission(session, 'refund');

    const payment = await paymentRepository.findById(id);
    if (!payment) throw new PaymentNotFoundError(id);

    if (payment.type !== TransactionType.PAYMENT) {
      throw new PaymentConflictError('Only payment transaction can be refunded');
    }

    if (payment.status !== TransactionStatus.SUCCESS) {
      throw new PaymentConflictError('Only successful payments can be refunded');
    }

    const data = refundPaymentSchema.parse(input);
    const refundAmount = data.amount ?? Number(payment.amount);

    if (refundAmount > Number(payment.amount)) {
      throw new PaymentConflictError('Refund amount exceeds original payment amount');
    }

    const refund = await paymentRepository.createRefund({
      bookingId: payment.bookingId,
      amount: refundAmount,
      currency: payment.currency,
      reason: data.reason,
      originalTransactionId: payment.id,
    });

    await paymentRepository.updateStatus(payment.id, {
      status: TransactionStatus.REFUNDED,
      refundedAt: new Date(),
      refundReason: data.reason,
    });

    return refund;
  },
};
