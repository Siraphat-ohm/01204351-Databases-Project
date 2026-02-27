import { paymentRepository } from '@/repositories/payment.repository';

// Re-export the paymentRepository under a transaction-focused name to avoid
// duplicating logic while providing clearer semantics where desired.
export const transactionRepository = paymentRepository;

export type TransactionRepository = typeof paymentRepository;
