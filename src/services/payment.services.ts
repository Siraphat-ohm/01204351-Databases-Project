// src/services/payment.services.ts

import Stripe from "stripe";
import { bookingRepository } from "@/repositories/booking.repository";
import { paymentRepository } from "@/repositories/payment.repository";
import { ticketService } from "@/services/ticket.services"; // Added for line items
import {
  createPaymentSchema,
  markPaymentStatusSchema,
  refundPaymentSchema,
  type CreatePaymentInput,
  type RefundPaymentInput,
} from "@/types/payment.type";
import type { PaginatedResponse } from "@/types/common";
import { TransactionStatus, TransactionType } from "@/generated/prisma/client";
import { canAccessPayment } from "@/auth/permissions";
import type { ServiceSession as Session } from "@/services/_shared/session";
import {
  assertPermission,
  hasPermission,
} from "@/services/_shared/authorization";
import {
  resolvePagination,
  type PaginationParams,
} from "@/services/_shared/pagination";

type PaymentListItem = Awaited<
  ReturnType<typeof paymentRepository.findAll>
>[number];

// Initialize Stripe using the version from your previous code
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

import { NotFoundError, ConflictError, UnauthorizedError } from '@/lib/errors';

function checkPermission(
  session: Session,
  action: "create" | "read" | "refund" | "read-all",
) {
  assertPermission(
    session,
    action,
    canAccessPayment,
    "payment",
    (a) => new UnauthorizedError(a),
  );
}

function canReadAll(session: Session) {
  return hasPermission(session, "read-all", canAccessPayment);
}

export const paymentService = {
  async findById(id: string, session: Session) {
    checkPermission(session, "read");

    const payment = await paymentRepository.findById(id);
    if (!payment) throw new NotFoundError(`Payment not found: ${id}`);

    if (!canReadAll(session) && payment.booking.userId !== session.user.id) {
      throw new UnauthorizedError("read");
    }

    return payment;
  },

  async findByBookingId(bookingId: string, session: Session) {
    checkPermission(session, "read");

    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError(`Booking not found: ${bookingId}`);

    if (!canReadAll(session) && booking.userId !== session.user.id) {
      throw new UnauthorizedError("read");
    }

    return paymentRepository.findByBookingId(bookingId);
  },

  async findMine(session: Session) {
    checkPermission(session, "read");
    return paymentRepository.findByUserId(session.user.id);
  },

  async findAll(session: Session) {
    checkPermission(session, "read-all");
    return paymentRepository.findAll();
  },

  async findAllPaginated(
    session: Session,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<PaymentListItem>> {
    checkPermission(session, "read-all");

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

  // --- NEW STRIPE CHECKOUT SESSION METHOD ---
  async createCheckoutSession(
    bookingId: string,
    origin: string,
    session: Session,
  ) {
    checkPermission(session, "create");

    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError(`Booking not found: ${bookingId}`);

    if (!canReadAll(session) && booking.userId !== session.user.id) {
      throw new UnauthorizedError("create");
    }

    // 1. Fetch tickets to create itemized receipt
    const tickets = await ticketService.findByBookingId(booking.id, session);

    // 2. Create the PENDING transaction in Postgres
    const transaction = await paymentRepository.createPayment({
      bookingId: booking.id,
      amount: Number(booking.totalPrice),
      currency: booking.currency,
      // Default status is usually PENDING from the repository/schema
    });

    // 3. Map tickets to Stripe line items
    const lineItems = tickets.map((ticket) => {
      const ticketTotal = Number(ticket.price) + Number(ticket.seatSurcharge);
      const amountInSmallestUnit = Math.round(ticketTotal * 100);

      return {
        price_data: {
          currency: booking.currency.toLowerCase(),
          product_data: {
            name: `YokAirlines Flight ${ticket.flightId} - Seat ${ticket.seatNumber || "Unassigned"}`,
            description: `Passenger: ${ticket.firstName} ${ticket.lastName}`,
          },
          unit_amount: amountInSmallestUnit,
        },
        quantity: 1,
      };
    });

    // 4. Create the Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "promptpay"],
      line_items: lineItems,

      success_url: `${origin}/FlightSearch/Confirmation?bookingId=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/FlightSearch/Payment?bookingId=${booking.id}&canceled=true`,

      client_reference_id: transaction.id,

      metadata: {
        bookingId: booking.id,
        transactionId: transaction.id,
      },

      // ✅ เพิ่มตรงนี้
      payment_intent_data: {
        metadata: {
          bookingId: booking.id,
          transactionId: transaction.id,
        },
      },
    });

    // 5. Link the Stripe session ID to your database transaction
    await paymentRepository.updateStatus(transaction.id, {
      stripePaymentIntentId: checkoutSession.id,
    });

    return { url: checkoutSession.url };
  },

  // --- EXISTING METHODS BELOW ---
  async createPayment(input: CreatePaymentInput, session: Session) {
    checkPermission(session, "create");

    const data = createPaymentSchema.parse(input);

    const booking = await bookingRepository.findById(data.bookingId);
    if (!booking) throw new NotFoundError(`Booking not found: ${data.bookingId}`);

    if (!canReadAll(session) && booking.userId !== session.user.id) {
      throw new UnauthorizedError("create");
    }

    if (data.stripePaymentIntentId) {
      const existing = await paymentRepository.findByStripePaymentIntentId(
        data.stripePaymentIntentId,
      );
      if (existing) {
        throw new ConflictError("Payment intent already exists");
      }
    }

    return paymentRepository.createPayment(data);
  },

  async markPaymentSuccess(
    id: string,
    input: { stripeChargeId?: string },
    session: Session,
  ) {
    checkPermission(session, "create");

    const existing = await paymentRepository.findById(id);
    if (!existing) throw new NotFoundError(`Payment not found: ${id}`);

    if (existing.type !== TransactionType.PAYMENT) {
      throw new ConflictError(
        "Only payment transaction can be marked success",
      );
    }

    const data = markPaymentStatusSchema.parse({
      status: TransactionStatus.SUCCESS,
      stripeChargeId: input.stripeChargeId,
    });

    const updatedPayment = await paymentRepository.updateStatus(id, data);

    // Update the booking status when the payment succeeds
    await bookingRepository.updateStatus(existing.bookingId, "CONFIRMED");

    return updatedPayment;
  },

  async markPaymentFailed(
    id: string,
    input: { failureCode?: string; failureMessage?: string },
    session: Session,
  ) {
    checkPermission(session, "create");

    const existing = await paymentRepository.findById(id);
    if (!existing) throw new NotFoundError(`Payment not found: ${id}`);

    if (existing.type !== TransactionType.PAYMENT) {
      throw new ConflictError(
        "Only payment transaction can be marked failed",
      );
    }

    const data = markPaymentStatusSchema.parse({
      status: TransactionStatus.FAILED,
      failureCode: input.failureCode,
      failureMessage: input.failureMessage,
    });

    return paymentRepository.updateStatus(id, data);
  },

  async refundPayment(id: string, input: RefundPaymentInput, session: Session) {
    checkPermission(session, "refund");

    const payment = await paymentRepository.findById(id);
    if (!payment) throw new NotFoundError(`Payment not found: ${id}`);

    if (payment.type !== TransactionType.PAYMENT) {
      throw new ConflictError(
        "Only payment transaction can be refunded",
      );
    }

    if (payment.status !== TransactionStatus.SUCCESS) {
      throw new ConflictError(
        "Only successful payments can be refunded",
      );
    }

    const data = refundPaymentSchema.parse(input);
    const refundAmount = data.amount ?? Number(payment.amount);

    if (refundAmount > Number(payment.amount)) {
      throw new ConflictError(
        "Refund amount exceeds original payment amount",
      );
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

  async refundBookingForReaccommodation(bookingId: string, reason?: string) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError(`Booking not found: ${bookingId}`);

    const payments = await paymentRepository.findByBookingId(bookingId);
    const refundablePayments = payments.filter(
      (p) =>
        p.type === TransactionType.PAYMENT &&
        p.status === TransactionStatus.SUCCESS,
    );

    for (const payment of refundablePayments) {
      await paymentRepository.createRefund({
        bookingId: payment.bookingId,
        amount: Number(payment.amount),
        currency: payment.currency,
        reason: reason ?? "Passenger cancelled during reaccommodation",
        originalTransactionId: payment.id,
      });

      await paymentRepository.updateStatus(payment.id, {
        status: TransactionStatus.REFUNDED,
        refundedAt: new Date(),
        refundReason: reason ?? "Passenger cancelled during reaccommodation",
      });
    }

    return {
      bookingId,
      refundedCount: refundablePayments.length,
    };
  },
};
