-- A single Stripe PaymentIntent can belong to multiple booking transactions
-- (round-trip / multi-segment checkout), so this must not be unique.
DROP INDEX IF EXISTS "Transaction_stripePaymentIntentId_key";

CREATE INDEX IF NOT EXISTS "Transaction_stripePaymentIntentId_idx"
ON "Transaction"("stripePaymentIntentId");
