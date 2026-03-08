-- Move provider-detail fields from SQL Transaction to Mongo PaymentLog
ALTER TABLE "Transaction"
  DROP COLUMN IF EXISTS "paymentMethodRef",
  DROP COLUMN IF EXISTS "failureCode",
  DROP COLUMN IF EXISTS "failureMessage";
