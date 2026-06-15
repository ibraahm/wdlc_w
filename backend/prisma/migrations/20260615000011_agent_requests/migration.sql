-- Agent → regional office requests + threaded messages

CREATE TABLE IF NOT EXISTS "AgentRequest" (
  "id" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "branchCode" TEXT,
  "regionalOfficeId" TEXT,
  "type" TEXT NOT NULL DEFAULT 'OTHER',
  "subject" TEXT NOT NULL,
  "details" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "attachments" TEXT NOT NULL DEFAULT '[]',
  "assignee" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AgentRequest_regionalOfficeId_status_idx" ON "AgentRequest"("regionalOfficeId", "status");
CREATE INDEX IF NOT EXISTS "AgentRequest_agentId_idx" ON "AgentRequest"("agentId");
CREATE INDEX IF NOT EXISTS "AgentRequest_branchCode_idx" ON "AgentRequest"("branchCode");

CREATE TABLE IF NOT EXISTS "AgentRequestMessage" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "authorType" TEXT NOT NULL,
  "authorName" TEXT,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentRequestMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AgentRequestMessage_requestId_createdAt_idx" ON "AgentRequestMessage"("requestId", "createdAt");

ALTER TABLE "AgentRequestMessage" ADD CONSTRAINT "AgentRequestMessage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AgentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
