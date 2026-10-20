/*
  Warnings:

  - Added the required column `deliveryBoyId` to the `DeliverySession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DeliverySession" ADD COLUMN     "deliveryBoyId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "DeliveryBoy" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryBoy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryBoy_username_key" ON "DeliveryBoy"("username");

-- CreateIndex
CREATE INDEX "DeliveryBoy_isActive_idx" ON "DeliveryBoy"("isActive");

-- CreateIndex
CREATE INDEX "DeliverySession_deliveryBoyId_idx" ON "DeliverySession"("deliveryBoyId");

-- AddForeignKey
ALTER TABLE "DeliverySession" ADD CONSTRAINT "DeliverySession_deliveryBoyId_fkey" FOREIGN KEY ("deliveryBoyId") REFERENCES "DeliveryBoy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
