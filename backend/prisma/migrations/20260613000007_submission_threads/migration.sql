-- Submission case management: assignee, updatedAt, threaded messages
ALTER TABLE "FormSubmission" ADD COLUMN IF NOT EXISTS "assignee" TEXT;
ALTER TABLE "FormSubmission" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "FormSubmission_status_idx" ON "FormSubmission"("status");

CREATE TABLE IF NOT EXISTS "SubmissionMessage" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "toEmail" TEXT,
  "authorId" TEXT,
  "authorName" TEXT,
  "emailError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubmissionMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SubmissionMessage_submissionId_fkey" FOREIGN KEY ("submissionId")
    REFERENCES "FormSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "SubmissionMessage_submissionId_createdAt_idx" ON "SubmissionMessage"("submissionId","createdAt");
