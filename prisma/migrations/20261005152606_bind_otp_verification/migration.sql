-- AlterTable
ALTER TABLE "OtpRequest" ADD COLUMN     "verificationId" TEXT;

-- CreateIndex
CREATE INDEX "OtpRequest_verificationId_idx" ON "OtpRequest"("verificationId");
