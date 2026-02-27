// Thin shim to provide `transaction`-named exports while reusing existing payment types
export {
  createPaymentSchema as createTransactionSchema,
  markPaymentStatusSchema as markTransactionStatusSchema,
  refundPaymentSchema as refundTransactionSchema,
  type CreatePaymentInput as CreateTransactionInput,
  type RefundPaymentInput as RefundTransactionInput,
  paymentAdminInclude as transactionAdminInclude,
  type PaymentAdmin as TransactionAdmin,
  paymentDefaults as transactionDefaults,
} from '@/types/payment.type';

export type { CreatePaymentInput as CreateTransactionInputType } from '@/types/payment.type';
