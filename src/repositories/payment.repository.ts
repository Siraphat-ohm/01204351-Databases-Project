import { prisma } from '@/lib/prisma';
import {
  paymentAdminInclude,
  type CreatePaymentInput,
} from '@/types/payment.type';
import {
  TransactionStatus,
  TransactionType,
} from '@/generated/prisma/client';

export const paymentRepository = {
  findById: (id: string) =>
    prisma.transaction.findUnique({
      where: { id },
      include: paymentAdminInclude,
    }),

  findByStripePaymentIntentId: (stripePaymentIntentId: string) =>
    prisma.transaction.findUnique({
      where: { stripePaymentIntentId },
      include: paymentAdminInclude,
    }),

  findByBookingId: (bookingId: string) =>
    prisma.transaction.findMany({
      where: { bookingId },
      include: paymentAdminInclude,
      orderBy: { createdAt: 'desc' },
    }),

  findByUserId: (userId: string) =>
    prisma.transaction.findMany({
      where: {
        booking: { userId },
      },
      include: paymentAdminInclude,
      orderBy: { createdAt: 'desc' },
    }),

  findAll: () =>
    prisma.transaction.findMany({
      include: paymentAdminInclude,
      orderBy: { createdAt: 'desc' },
    }),

  createPayment: (input: CreatePaymentInput) =>
    prisma.transaction.create({
      data: {
        bookingId: input.bookingId,
        amount: input.amount,
        currency: input.currency,
        status: TransactionStatus.PENDING,
        type: TransactionType.PAYMENT,
        paymentMethodType: input.paymentMethodType,
        paymentMethodRef: input.paymentMethodRef,
        stripePaymentIntentId: input.stripePaymentIntentId,
      },
      include: paymentAdminInclude,
    }),

  updateStatus: (
    id: string,
    data: {
      status: TransactionStatus;
      stripeChargeId?: string;
      failureCode?: string;
      failureMessage?: string;
      refundedAt?: Date;
      refundReason?: string;
    },
  ) =>
    prisma.transaction.update({
      where: { id },
      data,
      include: paymentAdminInclude,
    }),

  createRefund: (data: {
    bookingId: string;
    amount: number;
    currency: string;
    reason?: string;
    originalTransactionId: string;
  }) =>
    prisma.transaction.create({
      data: {
        bookingId: data.bookingId,
        amount: data.amount,
        currency: data.currency,
        status: TransactionStatus.SUCCESS,
        type: TransactionType.REFUND,
        refundedAt: new Date(),
        refundReason: data.reason,
        originalTransactionId: data.originalTransactionId,
      },
      include: paymentAdminInclude,
    }),
};
