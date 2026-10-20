-- CreateTable
CREATE TABLE "DeliveryLoginAttempt" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryLoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryLoginAttempt_ipHash_createdAt_idx" ON "DeliveryLoginAttempt"("ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "DeliveryLoginAttempt_createdAt_idx" ON "DeliveryLoginAttempt"("createdAt");
