import { prisma } from '@/lib/prisma';
import {
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
  include?: Prisma.TransactionInclude;
};

export const paymentRepository = {
  findById: (id: string, include?: Prisma.TransactionInclude) =>
    prisma.transaction.findUniqueOrThrow({ where: { id }, include }),

  findByBookingId: (bookingId: string, include?: Prisma.TransactionInclude) =>
    prisma.transaction.findMany({
      where: { bookingId },
      include,
      orderBy: { createdAt: 'desc' },
    }),

  findByUserId: (userId: string, include?: Prisma.TransactionInclude) =>
    prisma.transaction.findMany({
      where: { booking: { userId } },
      include,
      orderBy: { createdAt: 'desc' },
    }),

  findAll: (args?: PaymentFindManyArgs) =>
    prisma.transaction.findMany({
      where: args?.where,
      skip: args?.skip,
      take: args?.take,
      include: args?.include,
      orderBy: { createdAt: 'desc' },
    }),

  findMany: (args: PaymentFindManyArgs) =>
    prisma.transaction.findMany({
      where: args.where,
      skip: args.skip,
      take: args.take,
      include: args.include,
      orderBy: { createdAt: 'desc' },
    }),

  count: (where?: Prisma.TransactionWhereInput) =>
    prisma.transaction.count({ where }),

  create: (input: CreatePaymentInput, include?: Prisma.TransactionInclude) =>
    prisma.transaction.create({
      data: {
        bookingId: input.bookingId,
        amount: input.amount,
        currency: input.currency,
        status: TransactionStatus.PENDING,
        type: TransactionType.PAYMENT,
        paymentMethodType: input.paymentMethodType,
      },
      include,
    }),

  createPayment: (input: CreatePaymentInput, include?: Prisma.TransactionInclude) =>
    prisma.transaction.create({
      data: {
        bookingId: input.bookingId,
        amount: input.amount,
        currency: input.currency,
        status: TransactionStatus.PENDING,
        type: TransactionType.PAYMENT,
        paymentMethodType: input.paymentMethodType,
      },
      include,
    }),

  delete: (id: string, include?: Prisma.TransactionInclude) =>
    prisma.transaction.delete({ where: { id }, include }),

  updateStatus: (
    id: string,
    data: {
      status?: TransactionStatus;
      paymentMethodType?: string;
      refundedAt?: Date;
      refundReason?: string;
    },
    include?: Prisma.TransactionInclude,
  ) =>
    prisma.transaction.update({ where: { id }, data, include }),

  createRefund: (data: {
    bookingId: string;
    amount: number;
    currency: string;
    reason?: string;
    originalTransactionId: string;
  }, include?: Prisma.TransactionInclude) =>
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
      include,
    }),
};
