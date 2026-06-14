-- Corporate LMS: curriculum (sections/lessons), per-lesson progress,
-- multi-language courses, assignment deadlines.

-- Course additions
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "translationGroup" TEXT;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "dueAt" TIMESTAMP(3);
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "requireLessons" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "Course_translationGroup_idx" ON "Course"("translationGroup");

-- Agent preferred language
ALTER TABLE "AgentUser" ADD COLUMN IF NOT EXISTS "preferredLanguage" TEXT DEFAULT 'en';

CREATE TABLE IF NOT EXISTS "CourseSection" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseSection_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CourseSection_courseId_order_idx" ON "CourseSection"("courseId", "order");

CREATE TABLE IF NOT EXISTS "Lesson" (
  "id" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "contentHtml" TEXT NOT NULL DEFAULT '',
  "videoUrl" TEXT,
  "durationMinutes" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Lesson_sectionId_order_idx" ON "Lesson"("sectionId", "order");

CREATE TABLE IF NOT EXISTS "LessonProgress" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LessonProgress_lessonId_agentId_key" ON "LessonProgress"("lessonId", "agentId");
CREATE INDEX IF NOT EXISTS "LessonProgress_agentId_idx" ON "LessonProgress"("agentId");

-- Foreign keys
ALTER TABLE "CourseSection" ADD CONSTRAINT "CourseSection_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "CourseSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
