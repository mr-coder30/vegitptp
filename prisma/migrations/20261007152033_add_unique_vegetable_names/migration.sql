/*
  Warnings:

  - A unique constraint covering the columns `[nameTe]` on the table `Vegetable` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nameEn]` on the table `Vegetable` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Vegetable_nameTe_key" ON "Vegetable"("nameTe");

-- CreateIndex
CREATE UNIQUE INDEX "Vegetable_nameEn_key" ON "Vegetable"("nameEn");
