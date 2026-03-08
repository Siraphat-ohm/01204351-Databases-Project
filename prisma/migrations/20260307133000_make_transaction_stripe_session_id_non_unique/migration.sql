-- A single Stripe Checkout session can pay for multiple transactions (e.g. round-trip)
-- so stripeSessionId must NOT be unique on Transaction.
DROP INDEX IF EXISTS "Transaction_stripeSessionId_key";

CREATE INDEX IF NOT EXISTS "Transaction_stripeSessionId_idx"
ON "Transaction"("stripeSessionId");
