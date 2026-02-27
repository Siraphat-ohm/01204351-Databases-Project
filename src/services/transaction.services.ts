import { bookingRepository } from '@/repositories/booking.repository';
import { paymentRepository } from '@/repositories/payment.repository';
import {
  createPaymentSchema,
  markPaymentStatusSchema,
  refundPaymentSchema,
  type CreatePaymentInput,
  type RefundPaymentInput,
} from '@/types/payment.type';
import type { PaginatedResponse } from '@/types/common';
import { TransactionStatus, TransactionType } from '@/generated/prisma/client';
import { canAccessPayment } from '@/auth/permissions';
import type { ServiceSession as Session } from '@/services/_shared/session';
import {
  makeCheckPermission,
  hasPermission,
} from '@/services/_shared/authorization';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

type TransactionListItem = Awaited<ReturnType<typeof paymentRepository.findAll>>[number];

import { NotFoundError, ConflictError, UnauthorizedError } from '@/lib/errors';

const checkPermission = makeCheckPermission(
  canAccessPayment,
  'payment',
  (a) => new UnauthorizedError(a),
);

function canReadAll(session: Session) {
  return hasPermission(session, 'read-all', canAccessPayment);
}

export const transactionService = {
  async findById(id: string, session: Session) {
    checkPermission(session, 'read');

    const tx = await paymentRepository.findById(id);
    if (!tx) throw new NotFoundError(`Transaction not found: ${id}`);

    if (!canReadAll(session) && tx.booking.userId !== session.user.id) {
      throw new UnauthorizedError('read');
    }

    return tx;
  },

  async findByBookingId(bookingId: string, session: Session) {
    checkPermission(session, 'read');

    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError(`Booking not found: ${bookingId}`);

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

  async findAllPaginated(
    session: Session,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<TransactionListItem>> {
    checkPermission(session, 'read-all');

    const { page, limit, skip } = resolvePagination(params);
    const [data, total] = await Promise.all([
      paymentRepository.findMany({
        skip,
        take: limit,
      }),
      paymentRepository.count(),
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

  async createTransaction(input: CreatePaymentInput, session: Session) {
    checkPermission(session, 'create');

    const data = createPaymentSchema.parse(input);

    const booking = await bookingRepository.findById(data.bookingId);
    if (!booking) throw new NotFoundError(`Booking not found: ${data.bookingId}`);

    if (!canReadAll(session) && booking.userId !== session.user.id) {
      throw new UnauthorizedError('create');
    }

    if (data.stripePaymentIntentId) {
      const existing = await paymentRepository.findByStripePaymentIntentId(
        data.stripePaymentIntentId,
      );
      if (existing) throw new ConflictError('Payment intent already exists');
    }

    return paymentRepository.create(data);
  },

  async updateStatus(
    id: string,
    input: Partial<{ status: TransactionStatus; stripeChargeId?: string; failureCode?: string; failureMessage?: string; refundedAt?: Date; refundReason?: string }>,
    session: Session,
  ) {
    checkPermission(session, 'create');

    const existing = await paymentRepository.findById(id);
    if (!existing) throw new NotFoundError(`Transaction not found: ${id}`);

    // Validate using markPaymentStatusSchema if status provided
    const payload = input.status
      ? markPaymentStatusSchema.parse(input as any)
      : input;

    return paymentRepository.updateStatus(id, payload as any);
  },

  async createRefund(
    originalTransactionId: string,
    input: RefundPaymentInput,
    session: Session,
  ) {
    checkPermission(session, 'refund');

    const payment = await paymentRepository.findById(originalTransactionId);
    if (!payment) throw new NotFoundError(`Transaction not found: ${originalTransactionId}`);

    if (payment.type !== TransactionType.PAYMENT) {
      throw new ConflictError('Only payment transaction can be refunded');
    }

    if (payment.status !== TransactionStatus.SUCCESS) {
      throw new ConflictError('Only successful payments can be refunded');
    }

    const data = refundPaymentSchema.parse(input);
    const refundAmount = data.amount ?? Number(payment.amount);

    if (refundAmount > Number(payment.amount)) {
      throw new ConflictError('Refund amount exceeds original payment amount');
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
