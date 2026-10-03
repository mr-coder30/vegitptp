/*
  Warnings:

  - The `paymentMethod` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `basketId` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `productType` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the `Basket` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BasketItem` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `deliverySlot` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Made the column `vegetableId` on table `OrderItem` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "DeliverySlot" AS ENUM ('MORNING_0630', 'MORNING_0800', 'MORNING_1000', 'EVENING_1800', 'EVENING_2000');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH_ON_DELIVERY');

-- DropForeignKey
ALTER TABLE "BasketItem" DROP CONSTRAINT "BasketItem_basketId_fkey";

-- DropForeignKey
ALTER TABLE "BasketItem" DROP CONSTRAINT "BasketItem_vegetableId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_basketId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_vegetableId_fkey";

-- DropIndex
DROP INDEX "OrderItem_basketId_idx";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "locality" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliverySlot" "DeliverySlot" NOT NULL,
ADD COLUMN     "locality" TEXT,
DROP COLUMN "paymentMethod",
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH_ON_DELIVERY';

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "basketId",
DROP COLUMN "productId",
DROP COLUMN "productType",
ALTER COLUMN "vegetableId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Vegetable" ALTER COLUMN "unit" SET DEFAULT 'kg';

-- DropTable
DROP TABLE "Basket";

-- DropTable
DROP TABLE "BasketItem";

-- CreateIndex
CREATE INDEX "Order_deliverySlot_idx" ON "Order"("deliverySlot");

-- CreateIndex
CREATE INDEX "Order_locality_idx" ON "Order"("locality");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_vegetableId_fkey" FOREIGN KEY ("vegetableId") REFERENCES "Vegetable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
