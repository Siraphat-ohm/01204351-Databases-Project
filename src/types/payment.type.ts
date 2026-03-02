import { z } from 'zod';
import {
  Prisma,
  TransactionStatus,
  TransactionType,
} from '@/generated/prisma/client';

export const createPaymentSchema = z.object({
  bookingId: z.cuid({ message: 'Invalid booking ID' }),
  amount: z.number().positive({ message: 'Amount must be positive' }),
  currency: z.string().trim().length(3).default('THB'),
  paymentMethodType: z.string().trim().min(2).optional(),
  paymentMethodRef: z.string().trim().min(2).optional(),
  stripePaymentIntentId: z.string().trim().min(2).optional(),
});

export const markPaymentStatusSchema = z.object({
  status: z.enum(TransactionStatus),
  stripeChargeId: z.string().trim().min(2).optional(),
  failureCode: z.string().trim().min(1).optional(),
  failureMessage: z.string().trim().min(1).optional(),
});

export const refundPaymentSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().trim().min(2).optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type MarkPaymentStatusInput = z.infer<typeof markPaymentStatusSchema>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
export type PaymentServiceAction = 'create' | 'read' | 'refund' | 'read-all';
export type PaymentListItem = PaymentAdmin;

export const paymentAdminInclude = {
  booking: {
    include: {
      user: true,
      flight: {
        include: {
          route: { include: { origin: true, destination: true } },
        },
      },
    },
  },
} satisfies Prisma.TransactionInclude;

export type PaymentAdmin = Prisma.TransactionGetPayload<{
  include: typeof paymentAdminInclude;
}>;

export const paymentDefaults = {
  status: TransactionStatus.PENDING,
  type: TransactionType.PAYMENT,
} as const;
