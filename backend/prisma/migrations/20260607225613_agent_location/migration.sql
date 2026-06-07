-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AgentUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifyToken" TEXT,
    "emailVerifyExpiry" DATETIME,
    "resetToken" TEXT,
    "resetTokenExpiry" DATETIME,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "businessName" TEXT,
    "addressLine" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "country" TEXT DEFAULT 'USA',
    "publicPhone" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "showOnMap" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_AgentUser" ("active", "createdAt", "email", "emailVerified", "emailVerifyExpiry", "emailVerifyToken", "failedAttempts", "firstName", "id", "lastLoginAt", "lastName", "lockedUntil", "passwordHash", "phone", "resetToken", "resetTokenExpiry", "status", "updatedAt") SELECT "active", "createdAt", "email", "emailVerified", "emailVerifyExpiry", "emailVerifyToken", "failedAttempts", "firstName", "id", "lastLoginAt", "lastName", "lockedUntil", "passwordHash", "phone", "resetToken", "resetTokenExpiry", "status", "updatedAt" FROM "AgentUser";
DROP TABLE "AgentUser";
ALTER TABLE "new_AgentUser" RENAME TO "AgentUser";
CREATE UNIQUE INDEX "AgentUser_email_key" ON "AgentUser"("email");
CREATE UNIQUE INDEX "AgentUser_emailVerifyToken_key" ON "AgentUser"("emailVerifyToken");
CREATE UNIQUE INDEX "AgentUser_resetToken_key" ON "AgentUser"("resetToken");
CREATE INDEX "AgentUser_showOnMap_status_idx" ON "AgentUser"("showOnMap", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
