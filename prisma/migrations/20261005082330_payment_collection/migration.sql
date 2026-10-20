/*
  Warnings:

  - The values [CASH_ON_DELIVERY] on the enum `PaymentMethod` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethod_new" AS ENUM ('CASH', 'QR');
ALTER TABLE "public"."Order" ALTER COLUMN "paymentMethod" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod_new" USING ("paymentMethod"::text::"PaymentMethod_new");
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
DROP TYPE "public"."PaymentMethod_old";
ALTER TABLE "Order" ALTER COLUMN "paymentMethod" SET DEFAULT 'CASH';
COMMIT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentAccountId" TEXT,
ADD COLUMN     "paymentAccountName" TEXT,
ADD COLUMN     "paymentCollected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentCollectedAt" TIMESTAMP(3),
ALTER COLUMN "paymentMethod" SET DEFAULT 'CASH';

-- CreateTable
CREATE TABLE "PaymentAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qrImageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentAccount_isActive_idx" ON "PaymentAccount"("isActive");

-- CreateIndex
CREATE INDEX "PaymentAccount_sortOrder_idx" ON "PaymentAccount"("sortOrder");

-- CreateIndex
CREATE INDEX "Order_paymentMethod_idx" ON "Order"("paymentMethod");

-- CreateIndex
CREATE INDEX "Order_paymentAccountId_idx" ON "Order"("paymentAccountId");

-- CreateIndex
CREATE INDEX "Order_paymentCollected_idx" ON "Order"("paymentCollected");

-- CreateIndex
CREATE INDEX "Order_paymentCollectedAt_idx" ON "Order"("paymentCollectedAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_paymentAccountId_fkey" FOREIGN KEY ("paymentAccountId") REFERENCES "PaymentAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
