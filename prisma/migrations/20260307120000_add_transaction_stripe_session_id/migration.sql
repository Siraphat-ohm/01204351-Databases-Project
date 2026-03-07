-- Add missing stripeSessionId column required by current Prisma schema/client
ALTER TABLE "Transaction"
ADD COLUMN "stripeSessionId" TEXT;

CREATE UNIQUE INDEX "Transaction_stripeSessionId_key"
ON "Transaction"("stripeSessionId");
