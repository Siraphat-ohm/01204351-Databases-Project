import type { PaginatedResponse } from '@/types/common';
import type { Prisma } from '@/generated/prisma/client';
import { resolvePagination, type PaginationParams } from '@/services/_shared/pagination';

type PaymentListItem = Awaited<ReturnType<typeof paymentRepository.findAll>>[number];
import { stripe } from "@/lib/stripe";
import { bookingRepository } from "@/repositories/booking.repository";
import { paymentRepository } from "@/repositories/payment.repository";
import { ticketService } from "@/services/ticket.services";
import {
  markPaymentStatusSchema,
  refundPaymentSchema,
  type RefundPaymentInput,
} from "@/types/payment.type";
import { TransactionStatus, TransactionType, BookingStatus } from "@/generated/prisma/client";
import { canAccessPayment } from "@/auth/permissions";
import type { ServiceSession as Session } from "@/services/_shared/session";
import {
  hasPermission,
  makeCheckPermission,
} from "@/services/_shared/authorization";
import { NotFoundError, ConflictError, UnauthorizedError } from "@/lib/errors";

const checkPermission = (
  session: Session,
  action: "create" | "read" | "refund" | "read-all",
) =>
  makeCheckPermission(
    canAccessPayment,
    'payment',
    (a) => new UnauthorizedError(a),
  );

function canReadAll(session: Session) {
  return hasPermission(session, "read-all", canAccessPayment);
}

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

      if (!canReadAll(session) && booking.userId !== session.user.id) {
        throw new UnauthorizedError("create");
      }

      // Create a pending transaction record for this specific flight
      const transaction = await paymentRepository.createPayment({
        bookingId: booking.id,
        amount: Number(booking.totalPrice),
        currency: booking.currency,
      });
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
              description: `Seat: ${ticket.seatNumber || "Unassigned"}`,
            },
            unit_amount: Math.round(total * 100),
          },
          quantity: 1,
        };
      });

      allLineItems.push(...flightItems);
    }

    // 2. Create the unified Stripe session
    const joinedBookingIds = ids.join(",");
    const joinedTransactionIds = transactionIds.join(",");

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
    // THIS LINE IS CRITICAL. Without this, the webhook sees empty metadata.
    metadata: {
      transactionIds: joinedTransactionIds,
    },
  },
});

    // 3. Link the Stripe Intent to all DB transactions
    await Promise.all(
      transactionIds.map((tId) =>
        paymentRepository.updateStatus(tId, {
          stripePaymentIntentId: checkoutSession.payment_intent as string,
          status: TransactionStatus.PENDING,
        })
      )
    );
    

    return { url: checkoutSession.url };
  },

  async createPayment(input: { bookingId: string; amount: number; currency: string; method?: string }, session: Session) {
    checkPermission(session, 'create');

    const payment = await paymentRepository.createPayment({
      bookingId: input.bookingId,
      amount: input.amount,
      currency: input.currency,
      paymentMethodType: input.method as any,
    });

    return payment;
  },
  async handleSuccessfulPaymentMetadata(transactionIdsStr: string, stripeChargeId: string, session: Session) {
    const ids = transactionIdsStr.split(',').filter(Boolean);
    const results = [];

    for (const id of ids) {
      const result = await this.markPaymentSuccess(id, { stripeChargeId }, session);
      results.push(result);
    }
    return results;
  },

 async markPaymentSuccess(
    id: string,
    input: any,
    session: Session,
  ) {
    // Note: If this is called by a Webhook, ensure 'session' 
    // represents a system user or skip the permission check.
    checkPermission(session, "create");

    const existing = await paymentRepository.findById(id);
    if (!existing) throw new NotFoundError(`Payment record not found: ${id}`);

    // If already success, don't repeat (idempotency)
    if (existing.status === TransactionStatus.SUCCESS) {
      return existing;
    }

    if (existing.type !== TransactionType.PAYMENT) {
      throw new ConflictError("Invalid transaction type");
    }

    const stripeChargeId = input.stripeChargeId ?? input.transactionId ?? input.id;

    const data = markPaymentStatusSchema.parse({
      status: TransactionStatus.SUCCESS,
      stripeChargeId,
    });

    // 1. Update the Payment/Transaction record
    const updated = await paymentRepository.updateStatus(id, data);

    // 2. Update the linked Booking to CONFIRMED
    // This is the line that was likely not being hit
    await bookingRepository.updateStatus(existing.bookingId, BookingStatus.CONFIRMED);

    return updated;
  },

  async markPaymentFailed(
    id: string,
    input: { failureCode?: string; failureMessage?: string },
    session: Session,
  ) {
    checkPermission(session, "create");

    const existing = await paymentRepository.findById(id);
    if (!existing) throw new NotFoundError(`Payment not found: ${id}`);

    if (existing.status === TransactionStatus.FAILED) {
      return existing;
    }

    return paymentRepository.updateStatus(id, {
      status: TransactionStatus.FAILED,
      failureCode: input.failureCode,
      failureMessage: input.failureMessage,
    });
  },

  async refundPayment(id: string, input: RefundPaymentInput, session: Session) {
    checkPermission(session, "refund");

    const payment = await paymentRepository.findById(id);
    if (!payment) throw new NotFoundError(`Payment not found: ${id}`);

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

    // 🔥 Real Stripe refund
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
    });

    await paymentRepository.updateStatus(payment.id, {
      status: TransactionStatus.REFUNDED,
      refundedAt: new Date(),
      refundReason: data.reason,
    });

    return refund;
  },

  async refundBookingForReaccommodation(bookingId: string, reason?: string) {
    const payments = await paymentRepository.findByBookingId(bookingId);
    const payment = payments.find((p) => p.type === TransactionType.PAYMENT && p.status === TransactionStatus.SUCCESS);
    if (!payment) throw new NotFoundError(`Payment not found for booking: ${bookingId}`);

    const refund = await paymentRepository.createRefund({
      bookingId,
      amount: Number(payment.amount),
      currency: payment.currency,
      reason: reason ?? 'Reaccommodation cancellation',
      originalTransactionId: payment.id,
    });

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
      paymentRepository.findMany({ where, skip, take: limit }),
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
