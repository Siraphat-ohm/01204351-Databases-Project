/*
  Warnings:

  - You are about to drop the column `basePrice` on the `Flight` table. All the data in the column will be lost.
  - You are about to drop the column `mongoProfileId` on the `StaffProfile` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `passwordHash` on the `user` table. All the data in the column will be lost.
  - You are about to drop the `ActiveEmergencyTask` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmergencyIncident` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmergencyTaskTemplate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmergencyType` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[stripePaymentIntentId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mongoProfileId]` on the table `user` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `lat` to the `Airport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lon` to the `Airport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `basePriceBusiness` to the `Flight` table without a default value. This is not possible if the table is not empty.
  - Added the required column `basePriceEconomy` to the `Flight` table without a default value. This is not possible if the table is not empty.
  - Added the required column `basePriceFirst` to the `Flight` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PAYMENT', 'REFUND');

-- DropForeignKey
ALTER TABLE "ActiveEmergencyTask" DROP CONSTRAINT "ActiveEmergencyTask_completedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "ActiveEmergencyTask" DROP CONSTRAINT "ActiveEmergencyTask_incidentId_fkey";

-- DropForeignKey
ALTER TABLE "EmergencyIncident" DROP CONSTRAINT "EmergencyIncident_emergencyTypeId_fkey";

-- DropForeignKey
ALTER TABLE "EmergencyIncident" DROP CONSTRAINT "EmergencyIncident_flightId_fkey";

-- DropForeignKey
ALTER TABLE "EmergencyTaskTemplate" DROP CONSTRAINT "EmergencyTaskTemplate_emergencyTypeId_fkey";

-- DropForeignKey
ALTER TABLE "StaffProfile" DROP CONSTRAINT "StaffProfile_userId_fkey";

-- AlterTable
ALTER TABLE "AircraftType" ADD COLUMN     "capacityFirst" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Airport" ADD COLUMN     "lat" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "lon" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'THB',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Flight" DROP COLUMN "basePrice",
ADD COLUMN     "activeIncidentId" TEXT,
ADD COLUMN     "basePriceBusiness" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "basePriceEconomy" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "basePriceFirst" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "StaffProfile" DROP COLUMN "mongoProfileId";

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "boardingPass" TEXT,
ADD COLUMN     "checkedIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "nationality" TEXT;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "paymentMethod",
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'THB',
ADD COLUMN     "failureCode" TEXT,
ADD COLUMN     "failureMessage" TEXT,
ADD COLUMN     "originalTransactionId" TEXT,
ADD COLUMN     "paymentMethodRef" TEXT,
ADD COLUMN     "paymentMethodType" TEXT,
ADD COLUMN     "refundReason" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "stripePaymentIntentId" TEXT,
ADD COLUMN     "type" "TransactionType" NOT NULL DEFAULT 'PAYMENT',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "user" DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "passwordHash",
ADD COLUMN     "mongoProfileId" TEXT;

-- DropTable
DROP TABLE "ActiveEmergencyTask";

-- DropTable
DROP TABLE "EmergencyIncident";

-- DropTable
DROP TABLE "EmergencyTaskTemplate";

-- DropTable
DROP TABLE "EmergencyType";

-- DropEnum
DROP TYPE "EmergencyStatus";

-- CreateIndex
CREATE INDEX "Aircraft_status_idx" ON "Aircraft"("status");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_flightId_idx" ON "Booking"("flightId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Flight_status_idx" ON "Flight"("status");

-- CreateIndex
CREATE INDEX "Flight_departureTime_idx" ON "Flight"("departureTime");

-- CreateIndex
CREATE INDEX "Flight_routeId_idx" ON "Flight"("routeId");

-- CreateIndex
CREATE INDEX "StaffProfile_role_idx" ON "StaffProfile"("role");

-- CreateIndex
CREATE INDEX "StaffProfile_baseAirportId_idx" ON "StaffProfile"("baseAirportId");

-- CreateIndex
CREATE INDEX "Ticket_bookingId_idx" ON "Ticket"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_stripePaymentIntentId_key" ON "Transaction"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Transaction_bookingId_idx" ON "Transaction"("bookingId");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_stripePaymentIntentId_idx" ON "Transaction"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "user_mongoProfileId_key" ON "user"("mongoProfileId");

-- CreateIndex
CREATE INDEX "user_role_idx" ON "user"("role");

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
