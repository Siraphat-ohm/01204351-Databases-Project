import { z } from 'zod';

export const paymentLogStatusSchema = z.enum([
  'pending',
  'success',
  'failed',
  'refunded',
]);

export const paymentGatewaySchema = z.enum([
  'stripe',
  'promptpay',
  'truemoney',
  'other',
]);

export const createPaymentLogSchema = z.object({
  transactionId: z.cuid({ message: 'Invalid transaction ID' }).optional(),
  bookingId: z.cuid({ message: 'Invalid booking ID' }),
  amount: z.number().positive(),
  currency: z.string().trim().length(3).default('THB'),
  status: paymentLogStatusSchema.default('pending'),
  gateway: paymentGatewaySchema.default('stripe'),
  rawResponse: z.record(z.string(), z.unknown()).default({}),
});

export const updatePaymentLogSchema = z
  .object({
    transactionId: z.cuid({ message: 'Invalid transaction ID' }).optional(),
    status: paymentLogStatusSchema.optional(),
    gateway: paymentGatewaySchema.optional(),
    rawResponse: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (data) =>
      data.transactionId !== undefined ||
      data.status !== undefined ||
      data.gateway !== undefined ||
      data.rawResponse !== undefined,
    { message: 'At least one field must be provided for update' },
  );

export type CreatePaymentLogInput = z.infer<typeof createPaymentLogSchema>;
export type UpdatePaymentLogInput = z.infer<typeof updatePaymentLogSchema>;
