-- CreateTable
CREATE TABLE "AgentLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessName" TEXT NOT NULL,
    "addressLine" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT,
    "country" TEXT NOT NULL DEFAULT 'USA',
    "publicPhone" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "importKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentLocation_importKey_key" ON "AgentLocation"("importKey");

-- CreateIndex
CREATE INDEX "AgentLocation_active_idx" ON "AgentLocation"("active");
