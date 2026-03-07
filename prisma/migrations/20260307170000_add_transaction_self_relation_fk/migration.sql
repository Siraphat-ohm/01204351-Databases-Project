-- Add referential integrity for refund -> original payment transaction linkage
CREATE INDEX IF NOT EXISTS "Transaction_originalTransactionId_idx"
ON "Transaction"("originalTransactionId");

ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_originalTransactionId_fkey"
FOREIGN KEY ("originalTransactionId") REFERENCES "Transaction"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
