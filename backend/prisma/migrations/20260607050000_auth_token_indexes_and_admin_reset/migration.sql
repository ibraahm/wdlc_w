-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN "resetToken" TEXT;
ALTER TABLE "AdminUser" ADD COLUMN "resetTokenExpiry" DATETIME;

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_resetToken_key" ON "AdminUser"("resetToken");

-- CreateIndex
CREATE UNIQUE INDEX "AgentUser_emailVerifyToken_key" ON "AgentUser"("emailVerifyToken");

-- CreateIndex
CREATE UNIQUE INDEX "AgentUser_resetToken_key" ON "AgentUser"("resetToken");

