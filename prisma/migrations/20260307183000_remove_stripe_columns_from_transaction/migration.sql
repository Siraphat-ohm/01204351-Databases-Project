-- Remove Stripe provider-specific columns from Transaction.
-- Stripe provider references are now stored in Mongo PaymentLog.rawResponse.
DROP INDEX IF EXISTS "Transaction_stripePaymentIntentId_idx";
DROP INDEX IF EXISTS "Transaction_stripeSessionId_idx";
DROP INDEX IF EXISTS "Transaction_stripePaymentIntentId_key";
DROP INDEX IF EXISTS "Transaction_stripeSessionId_key";

ALTER TABLE "Transaction"
DROP COLUMN IF EXISTS "stripePaymentIntentId",
DROP COLUMN IF EXISTS "stripeChargeId",
DROP COLUMN IF EXISTS "stripeSessionId";
