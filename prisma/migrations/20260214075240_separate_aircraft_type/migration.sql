/*
  Warnings:

  - You are about to drop the column `capacityBiz` on the `Aircraft` table. All the data in the column will be lost.
  - You are about to drop the column `capacityEco` on the `Aircraft` table. All the data in the column will be lost.
  - You are about to drop the column `model` on the `Aircraft` table. All the data in the column will be lost.
  - Added the required column `aircraftTypeId` to the `Aircraft` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Aircraft" DROP COLUMN "capacityBiz",
DROP COLUMN "capacityEco",
DROP COLUMN "model",
ADD COLUMN     "aircraftTypeId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "AircraftType" (
    "id" SERIAL NOT NULL,
    "iataCode" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "capacityEco" INTEGER NOT NULL,
    "capacityBiz" INTEGER NOT NULL,

    CONSTRAINT "AircraftType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AircraftType_iataCode_key" ON "AircraftType"("iataCode");

-- AddForeignKey
ALTER TABLE "Aircraft" ADD CONSTRAINT "Aircraft_aircraftTypeId_fkey" FOREIGN KEY ("aircraftTypeId") REFERENCES "AircraftType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
