-- CreateEnum
CREATE TYPE "CabinClass" AS ENUM ('FIRST', 'BUSINESS', 'ECONOMY');

-- CreateTable
CREATE TABLE "SeatLayoutTemplate" (
    "id" TEXT NOT NULL,
    "aircraftTypeId" TEXT NOT NULL,
    "reference" TEXT,

    CONSTRAINT "SeatLayoutTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatLayoutCabin" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "cabin" "CabinClass" NOT NULL,
    "rowStart" INTEGER NOT NULL,
    "rowEnd" INTEGER NOT NULL,
    "columns" TEXT[],
    "aisleAfter" TEXT[],
    "exitRows" INTEGER[],
    "blockedSeats" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SeatLayoutCabin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeatLayoutTemplate_aircraftTypeId_key" ON "SeatLayoutTemplate"("aircraftTypeId");

-- CreateIndex
CREATE INDEX "SeatLayoutCabin_templateId_idx" ON "SeatLayoutCabin"("templateId");

-- AddForeignKey
ALTER TABLE "SeatLayoutTemplate" ADD CONSTRAINT "SeatLayoutTemplate_aircraftTypeId_fkey" FOREIGN KEY ("aircraftTypeId") REFERENCES "AircraftType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatLayoutCabin" ADD CONSTRAINT "SeatLayoutCabin_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SeatLayoutTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
