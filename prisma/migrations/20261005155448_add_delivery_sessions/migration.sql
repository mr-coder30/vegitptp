-- CreateTable
CREATE TABLE "DeliverySession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliverySession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliverySession_tokenHash_key" ON "DeliverySession"("tokenHash");

-- CreateIndex
CREATE INDEX "DeliverySession_expiresAt_idx" ON "DeliverySession"("expiresAt");
