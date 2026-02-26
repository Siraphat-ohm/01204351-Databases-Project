import { prisma } from '@/lib/prisma';
import {
  paymentAdminInclude,
  type CreatePaymentInput,
} from '@/types/payment.type';
import type { Prisma } from '@/generated/prisma/client';
import {
  TransactionStatus,
  TransactionType,
} from '@/generated/prisma/client';

type PaymentFindManyArgs = {
  where?: Prisma.TransactionWhereInput;
  skip?: number;
  take?: number;
};

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

  findAll: (args?: PaymentFindManyArgs) =>
    prisma.transaction.findMany({
      where: args?.where,
      skip: args?.skip,
      take: args?.take,
      include: paymentAdminInclude,
      orderBy: { createdAt: 'desc' },
    }),

  findMany: (args: PaymentFindManyArgs) =>
    prisma.transaction.findMany({
      where: args.where,
      skip: args.skip,
      take: args.take,
      include: paymentAdminInclude,
      orderBy: { createdAt: 'desc' },
    }),

  count: (where?: Prisma.TransactionWhereInput) =>
    prisma.transaction.count({ where }),

  create: (input: CreatePaymentInput) =>
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

  delete: (id: string) =>
    prisma.transaction.delete({
      where: { id },
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
