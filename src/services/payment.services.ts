import { stripe } from '@/lib/stripe';
import { connectMongo } from '@/lib/mongoose';
import PaymentLog from '@/models/PaymentLog';
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

let mongoLogRetryAfter = 0;

function savePaymentLogBestEffort(input: {
  transactionId?: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  gateway: 'stripe';
  rawResponse: Record<string, unknown>;
}) {
  void (async () => {
    const now = Date.now();
    if (now < mongoLogRetryAfter) return;

    try {
      await connectMongo();
      const filter = input.transactionId
        ? { transactionId: input.transactionId, status: input.status, gateway: input.gateway }
        : {
            bookingId: input.bookingId,
            status: input.status,
            gateway: input.gateway,
            amount: input.amount,
            currency: input.currency,
          };

      await PaymentLog.updateOne(
        filter,
        {
          $setOnInsert: {
            transactionId: input.transactionId ?? null,
            bookingId: input.bookingId,
            amount: input.amount,
            currency: input.currency,
            status: input.status,
            gateway: input.gateway,
            rawResponse: input.rawResponse,
          },
        },
        { upsert: true },
      );
    } catch (error) {
      // Prevent log spam / repeated timeouts when MongoDB is unavailable.
      mongoLogRetryAfter = Date.now() + 60_000;
      console.error('[PaymentLog] Failed to persist log (non-blocking):', error);
    }
  })();
}

async function getStripePaymentIntentIdFromLogs(transactionId: string): Promise<string | null> {
  try {
    await connectMongo();

    const log = await PaymentLog.findOne({
      transactionId,
      gateway: 'stripe',
      status: { $in: ['success', 'pending', 'refunded'] },
    })
      .sort({ createdAt: -1 })
      .lean();

    const raw = (log as { rawResponse?: Record<string, unknown> } | null)?.rawResponse;
    if (!raw) return null;

    const candidate = raw.stripePaymentIntentId ?? raw.stripeChargeId;
    return typeof candidate === 'string' && candidate.length > 0 ? candidate : null;
  } catch {
    return null;
  }
}

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
    bookingIds: string | string[], // Accept both single string or array
    origin: string,
    session: Session,
  ) {
    checkPermission(session, "create");

    // Ensure we are working with an array
    const ids = Array.isArray(bookingIds) ? bookingIds : [bookingIds];
    
    const allLineItems: any[] = [];
    const transactionIds: string[] = [];

    // 1. Process each booking to build a single Stripe session
    for (const bId of ids) {
      const booking = await bookingRepository.findById(bId);
      if (!booking) throw new NotFoundError(`Booking not found: ${bId}`);

      if (!hasPaymentPermission(session, 'read-all') && booking.userId !== session.user.id) {
        throw new UnauthorizedError('create');
      }

      // Create a pending transaction record for this specific flight
      const transaction = await paymentRepository.createPayment({
        bookingId: booking.id,
        amount: Number(booking.totalPrice),
        currency: booking.currency,
      }, paymentAdminInclude);
      transactionIds.push(transaction.id);

      // Get tickets for this flight and add to line items
      const tickets = await ticketService.findByBookingId(booking.id, session);
      const flightItems = tickets.map((ticket) => {
        const total = Number(ticket.price) + Number(ticket.seatSurcharge);
        return {
          price_data: {
            currency: booking.currency.toLowerCase(),
            product_data: {
              name: `Flight ${booking.bookingRef} - ${ticket.firstName} ${ticket.lastName}`,
              description: `Seat: ${ticket.seatNumber || 'Unassigned'}`,
            },
            unit_amount: Math.round(total * 100),
          },
          quantity: 1,
        };
      });

      allLineItems.push(...flightItems);
    }

    // 2. Create the unified Stripe session
    const joinedBookingIds = ids.join(',');
    const joinedTransactionIds = transactionIds.join(',');

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "promptpay"],
      line_items: allLineItems,
      // Pass all IDs back to the confirmation page
      success_url: `${origin}/confirmation?bookingId=${joinedBookingIds}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment?bookingId=${joinedBookingIds}&canceled=true`,
      metadata: {
        transactionIds: joinedTransactionIds,
      },
      payment_intent_data: {
        metadata: {
          transactionIds: joinedTransactionIds,
        },
      },
    });

    // 3. Keep SQL transaction status as pending and store Stripe refs in Mongo payment logs
    const sessionId = checkoutSession.id;
    const paymentIntentId = checkoutSession.payment_intent as string | null;
    
    await Promise.all(
      transactionIds.map((tId) =>
        paymentRepository.updateStatus(tId, {
          status: TransactionStatus.PENDING,
        })
      )
    );

    for (const tId of transactionIds) {
      const tx = await paymentRepository.findById(tId);
      savePaymentLogBestEffort({
        transactionId: tId,
        bookingId: tx.bookingId,
        amount: Number(tx.amount),
        currency: tx.currency,
        status: 'pending',
        gateway: 'stripe',
        rawResponse: {
          stripeSessionId: sessionId,
          stripePaymentIntentId: paymentIntentId,
        },
      });
    }

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
    // Note: If this is called by a Webhook, ensure 'session' 
    // represents a system user or skip the permission check.
    checkPermission(session, "create");

    const existing = await paymentRepository.findById(id, paymentAdminInclude) as PaymentAdmin;
    if (!existing) throw new NotFoundError(`Payment record not found: ${id}`);

    const stripeChargeId = input.stripeChargeId ?? input.transactionId ?? input.id;
    const paymentMethodType = input.paymentMethodType ?? existing.paymentMethodType;

    // If already success, still backfill missing method type (idempotent + corrective)
    if (existing.status === TransactionStatus.SUCCESS) {
      const needsBackfill = !existing.paymentMethodType && !!paymentMethodType;

      if (!needsBackfill) return existing;

      return paymentRepository.updateStatus(
        id,
        {
          status: TransactionStatus.SUCCESS,
          paymentMethodType,
        },
        paymentAdminInclude,
      );
    }

    if (existing.type !== TransactionType.PAYMENT) {
      throw new ConflictError("Invalid transaction type");
    }

    const data = markPaymentStatusSchema.parse({
      status: TransactionStatus.SUCCESS,
    });

    // 1. Update the Payment/Transaction record
    const updated = await paymentRepository.updateStatus(id, {
      ...data,
      paymentMethodType,
    }, paymentAdminInclude);

    // 2. Update the linked Booking to CONFIRMED
    // This is the line that was likely not being hit
    await bookingRepository.updateStatus(existing.bookingId, BookingStatus.CONFIRMED);

    // 3. Log raw gateway response to MongoDB for audit (best effort)
    savePaymentLogBestEffort({
      transactionId: id,
      bookingId: existing.bookingId,
      amount: Number(existing.amount),
      currency: existing.currency,
      status: 'success',
      gateway: 'stripe',
      rawResponse: {
        ...(input as Record<string, unknown>),
        stripeChargeId,
        paymentMethodType,
      },
    });

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

    const failed = await paymentRepository.updateStatus(id, {
      status: TransactionStatus.FAILED,
    }, paymentAdminInclude);

    // Log raw gateway response to MongoDB for audit (best effort)
    savePaymentLogBestEffort({
      transactionId: id,
      bookingId: existing.bookingId,
      amount: Number(existing.amount),
      currency: existing.currency,
      status: 'failed',
      gateway: 'stripe',
      rawResponse: input as Record<string, unknown>,
    });

    return failed;
  },

  async refundPayment(id: string, input: RefundPaymentInput, session: Session) {
    checkPermission(session, "refund");

    const payment = await paymentRepository.findById(id, paymentAdminInclude) as PaymentAdmin;

    if (payment.status !== TransactionStatus.SUCCESS) {
      throw new ConflictError("Only successful payments can be refunded");
    }

    const stripePaymentIntentId = await getStripePaymentIntentIdFromLogs(payment.id);
    if (!stripePaymentIntentId) {
      throw new ConflictError("Missing Stripe payment_intent id");
    }

    const data = refundPaymentSchema.parse(input);
    const refundAmount = data.amount ?? Number(payment.amount);

    if (refundAmount > Number(payment.amount)) {
      throw new ConflictError("Refund exceeds original amount");
    }

    const stripeRefund = await stripe.refunds.create({
      payment_intent: stripePaymentIntentId,
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

    // Log raw gateway response to MongoDB for audit (best effort)
    savePaymentLogBestEffort({
      transactionId: refund.id,
      bookingId: payment.bookingId,
      amount: refundAmount,
      currency: payment.currency,
      status: 'refunded',
      gateway: 'stripe',
      rawResponse: stripeRefund as unknown as Record<string, unknown>,
    });

    return refund;
  },

  async refundBookingForReaccommodation(bookingId: string, reason?: string) {
    const payments = await paymentRepository.findByBookingId(bookingId, paymentAdminInclude) as PaymentAdmin[];
    const payment = payments.find((p) => p.type === TransactionType.PAYMENT && p.status === TransactionStatus.SUCCESS);
    if (!payment) throw new NotFoundError(`Payment not found for booking: ${bookingId}`);

    const refundAmount = Number(payment.amount);
    const refundReason = reason ?? 'Reaccommodation cancellation';

    const stripePaymentIntentId = await getStripePaymentIntentIdFromLogs(payment.id);

    // Issue actual Stripe refund when payment intent is available
    let stripeRefund: Record<string, unknown> | null = null;
    if (stripePaymentIntentId) {
      stripeRefund = await stripe.refunds.create({
        payment_intent: stripePaymentIntentId,
        amount: Math.round(refundAmount * 100),
        metadata: { transactionId: payment.id },
      }) as unknown as Record<string, unknown>;
    }

    const refund = await paymentRepository.createRefund({
      bookingId,
      amount: refundAmount,
      currency: payment.currency,
      reason: refundReason,
      originalTransactionId: payment.id,
    }, paymentAdminInclude);

    await paymentRepository.updateStatus(payment.id, {
      status: TransactionStatus.REFUNDED,
      refundedAt: new Date(),
      refundReason,
    });

    // Log to MongoDB for audit (best effort)
    savePaymentLogBestEffort({
      transactionId: refund.id,
      bookingId,
      amount: refundAmount,
      currency: payment.currency,
      status: 'refunded',
      gateway: 'stripe',
      rawResponse: stripeRefund ?? { reason: refundReason, manualRefund: true },
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