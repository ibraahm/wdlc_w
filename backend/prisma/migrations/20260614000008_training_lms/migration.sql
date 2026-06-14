-- Training / LMS: courses, quizzes, completions, resources, acknowledgements

CREATE TABLE IF NOT EXISTS "Course" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'General',
  "description" TEXT,
  "contentHtml" TEXT NOT NULL DEFAULT '',
  "questions" TEXT NOT NULL DEFAULT '[]',
  "passingScore" INTEGER NOT NULL DEFAULT 80,
  "audience" TEXT NOT NULL DEFAULT 'ALL',
  "targetStates" TEXT,
  "targetBranches" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Course_slug_key" ON "Course"("slug");
CREATE INDEX IF NOT EXISTS "Course_status_order_idx" ON "Course"("status", "order");
CREATE INDEX IF NOT EXISTS "Course_category_idx" ON "Course"("category");

CREATE TABLE IF NOT EXISTS "CourseCompletion" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "branchCode" TEXT,
  "agentState" TEXT,
  "score" INTEGER NOT NULL,
  "passed" BOOLEAN NOT NULL,
  "answers" TEXT NOT NULL DEFAULT '[]',
  "attempt" INTEGER NOT NULL DEFAULT 1,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseCompletion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CourseCompletion_courseId_agentId_idx" ON "CourseCompletion"("courseId", "agentId");
CREATE INDEX IF NOT EXISTS "CourseCompletion_agentId_idx" ON "CourseCompletion"("agentId");
CREATE INDEX IF NOT EXISTS "CourseCompletion_branchCode_idx" ON "CourseCompletion"("branchCode");
CREATE INDEX IF NOT EXISTS "CourseCompletion_passed_completedAt_idx" ON "CourseCompletion"("passed", "completedAt");

CREATE TABLE IF NOT EXISTS "Resource" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'General',
  "description" TEXT,
  "url" TEXT NOT NULL,
  "audience" TEXT NOT NULL DEFAULT 'ALL',
  "targetStates" TEXT,
  "targetBranches" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Resource_status_order_idx" ON "Resource"("status", "order");
CREATE INDEX IF NOT EXISTS "Resource_category_idx" ON "Resource"("category");

CREATE TABLE IF NOT EXISTS "ResourceAck" (
  "id" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "branchCode" TEXT,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResourceAck_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ResourceAck_resourceId_agentId_key" ON "ResourceAck"("resourceId", "agentId");
CREATE INDEX IF NOT EXISTS "ResourceAck_agentId_idx" ON "ResourceAck"("agentId");

-- Foreign keys
ALTER TABLE "CourseCompletion" ADD CONSTRAINT "CourseCompletion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseCompletion" ADD CONSTRAINT "CourseCompletion_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceAck" ADD CONSTRAINT "ResourceAck_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceAck" ADD CONSTRAINT "ResourceAck_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
