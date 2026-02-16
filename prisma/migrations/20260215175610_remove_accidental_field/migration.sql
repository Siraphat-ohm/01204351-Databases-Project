/*
  Warnings:

  - You are about to drop the column `flightHours` on the `StaffProfile` table. All the data in the column will be lost.
  - You are about to drop the column `licenseNumber` on the `StaffProfile` table. All the data in the column will be lost.
  - You are about to drop the column `skills` on the `StaffProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StaffProfile" DROP COLUMN "flightHours",
DROP COLUMN "licenseNumber",
DROP COLUMN "skills";
