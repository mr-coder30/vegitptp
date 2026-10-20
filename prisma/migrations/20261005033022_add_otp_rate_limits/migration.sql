-- CreateTable
CREATE TABLE "OtpRequest" (
    "id" TEXT NOT NULL,
    "phoneHash" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OtpRequest_phoneHash_createdAt_idx" ON "OtpRequest"("phoneHash", "createdAt");

-- CreateIndex
CREATE INDEX "OtpRequest_ipHash_createdAt_idx" ON "OtpRequest"("ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "OtpRequest_createdAt_idx" ON "OtpRequest"("createdAt");
