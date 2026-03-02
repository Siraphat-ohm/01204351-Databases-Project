import { stripe } from '@/lib/stripe';
import { bookingRepository } from '@/repositories/booking.repository';
import { paymentRepository } from '@/repositories/payment.repository';
import { ticketService } from '@/services/ticket.services';
import {
  markPaymentStatusSchema,
  refundPaymentSchema,
  paymentAdminInclude,
  type PaymentAdmin,
  type PaymentListItem,
  type PaymentServiceAction,
  type RefundPaymentInput,
} from '@/types/payment.type';
import type { PaginatedResponse } from '@/types/common';
import type { Prisma } from '@/generated/prisma/client';
import { TransactionStatus, TransactionType, BookingStatus } from '@/generated/prisma/client';
import { canAccessPayment } from '@/auth/permissions';
import type { ServiceSession as Session } from '@/services/_shared/session';
import { makePermissionHelpers } from '@/services/_shared/authorization';
import { resolvePagination, type PaginationParams } from '@/services/_shared/pagination';
import { NotFoundError, ConflictError, UnauthorizedError } from '@/lib/errors';

const {
  checkPermission,
  hasPermission: hasPaymentPermission,
} = makePermissionHelpers<PaymentServiceAction>(
  canAccessPayment,
  'payment',
  (a) => new UnauthorizedError(a),
);

export const paymentService = {

  async createCheckoutSession(
    bookingId: string,
    origin: string,
    session: Session,
  ) {
    checkPermission(session, "create");

    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError(`Booking not found: ${bookingId}`);

    if (!hasPaymentPermission(session, 'read-all') && booking.userId !== session.user.id) {
      throw new UnauthorizedError('create');
    }

    const tickets = await ticketService.findByBookingId(booking.id, session);

    const transaction = await paymentRepository.createPayment({
      bookingId: booking.id,
      amount: Number(booking.totalPrice),
      currency: booking.currency,
    }, paymentAdminInclude);

    const lineItems = tickets.map((ticket) => {
      const total = Number(ticket.price) + Number(ticket.seatSurcharge);

      return {
        price_data: {
          currency: booking.currency.toLowerCase(),
          product_data: {
            name: `Flight ${booking.bookingRef} - Seat ${
              ticket.seatNumber || "Unassigned"
            }`,
            description: `${ticket.firstName} ${ticket.lastName}`,
          },
          unit_amount: Math.round(total * 100),
        },
        quantity: 1,
      };
    });

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "promptpay"],
      line_items: lineItems,
      success_url: `${origin}/confirmation?bookingId=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment?bookingId=${booking.id}&canceled=true`,
      client_reference_id: transaction.id,
      metadata: {
        bookingId: booking.id,
        transactionId: transaction.id,
      },
      payment_intent_data: {
        metadata: {
          bookingId: booking.id,
          transactionId: transaction.id,
        },
      },
    });

    await paymentRepository.updateStatus(transaction.id, {
      stripePaymentIntentId: checkoutSession.payment_intent as string,
      status: TransactionStatus.PENDING,
    });

    return { url: checkoutSession.url };
  },

  async createPayment(input: { bookingId: string; amount: number; currency: string; method?: string }, session: Session) {
    checkPermission(session, 'create');

    const payment = await paymentRepository.createPayment({
      bookingId: input.bookingId,
      amount: input.amount,
      currency: input.currency,
      paymentMethodType: input.method as any,
    }, paymentAdminInclude);

    return payment;
  },

  async markPaymentSuccess(
    id: string,
    input: any,
    session: Session,
  ) {
    checkPermission(session, "create");

    const existing = await paymentRepository.findById(id, paymentAdminInclude) as PaymentAdmin;

    if (existing.status === TransactionStatus.SUCCESS) {
      return existing;
    }

    if (existing.type !== TransactionType.PAYMENT) {
      throw new ConflictError("Invalid transaction type");
    }

    const stripeChargeId = input.stripeChargeId ?? input.transactionId ?? input.id ?? undefined;

    const data = markPaymentStatusSchema.parse({
      status: TransactionStatus.SUCCESS,
      stripeChargeId,
    });

    const updated = await paymentRepository.updateStatus(id, data, paymentAdminInclude);

    await bookingRepository.updateStatus(existing.bookingId, BookingStatus.CONFIRMED);

    return updated;
  },

  async markPaymentFailed(
    id: string,
    input: { failureCode?: string; failureMessage?: string },
    session: Session,
  ) {
    checkPermission(session, "create");

    const existing = await paymentRepository.findById(id, paymentAdminInclude) as PaymentAdmin;

    if (existing.status === TransactionStatus.FAILED) {
      return existing;
    }

    return paymentRepository.updateStatus(id, {
      status: TransactionStatus.FAILED,
      failureCode: input.failureCode,
      failureMessage: input.failureMessage,
    }, paymentAdminInclude);
  },

  async refundPayment(id: string, input: RefundPaymentInput, session: Session) {
    checkPermission(session, "refund");

    const payment = await paymentRepository.findById(id, paymentAdminInclude) as PaymentAdmin;

    if (payment.status !== TransactionStatus.SUCCESS) {
      throw new ConflictError("Only successful payments can be refunded");
    }

    if (!payment.stripeChargeId) {
      throw new ConflictError("Missing Stripe payment_intent id");
    }

    const data = refundPaymentSchema.parse(input);
    const refundAmount = data.amount ?? Number(payment.amount);

    if (refundAmount > Number(payment.amount)) {
      throw new ConflictError("Refund exceeds original amount");
    }

    const stripeRefund = await stripe.refunds.create({
      payment_intent: payment.stripeChargeId,
      amount: Math.round(refundAmount * 100),
      metadata: {
        transactionId: payment.id,
      },
    });

    const refund = await paymentRepository.createRefund({
      bookingId: payment.bookingId,
      amount: refundAmount,
      currency: payment.currency,
      reason: data.reason,
      originalTransactionId: payment.id,
    }, paymentAdminInclude);

    await paymentRepository.updateStatus(payment.id, {
      status: TransactionStatus.REFUNDED,
      refundedAt: new Date(),
      refundReason: data.reason,
    });

    return refund;
  },

  async refundBookingForReaccommodation(bookingId: string, reason?: string) {
    const payments = await paymentRepository.findByBookingId(bookingId, paymentAdminInclude) as PaymentAdmin[];
    const payment = payments.find((p) => p.type === TransactionType.PAYMENT && p.status === TransactionStatus.SUCCESS);
    if (!payment) throw new NotFoundError(`Payment not found for booking: ${bookingId}`);

    const refund = await paymentRepository.createRefund({
      bookingId,
      amount: Number(payment.amount),
      currency: payment.currency,
      reason: reason ?? 'Reaccommodation cancellation',
      originalTransactionId: payment.id,
    }, paymentAdminInclude);

    await paymentRepository.updateStatus(payment.id, {
      status: TransactionStatus.REFUNDED,
      refundedAt: new Date(),
      refundReason: reason ?? 'Reaccommodation cancellation',
    });

    return refund;
  },

  async findAllPaginated(
    session: Session,
    params?: PaginationParams<Prisma.TransactionWhereInput>,
  ): Promise<PaginatedResponse<PaymentListItem>> {
    checkPermission(session, 'read-all');

    const { page, limit, skip } = resolvePagination(params);
    const where = (params as any)?.where;
    const [data, total] = await Promise.all([
      paymentRepository.findMany({ where, skip, take: limit, include: paymentAdminInclude }) as Promise<PaymentAdmin[]>,
      paymentRepository.count(where),
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
};