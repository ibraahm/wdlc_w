-- #4 Auditability: stop parent deletes from cascading away evidence records.
-- Change evidence FKs from ON DELETE CASCADE to ON DELETE RESTRICT so a course,
-- resource, form, version, or application that has learner/e-signature evidence
-- cannot be silently wiped by deleting its parent.

ALTER TABLE "CourseCompletion" DROP CONSTRAINT IF EXISTS "CourseCompletion_courseId_fkey";
ALTER TABLE "CourseCompletion" ADD CONSTRAINT "CourseCompletion_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PolicyAcknowledgment" DROP CONSTRAINT IF EXISTS "PolicyAcknowledgment_courseId_fkey";
ALTER TABLE "PolicyAcknowledgment" ADD CONSTRAINT "PolicyAcknowledgment_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PolicyAcknowledgment" DROP CONSTRAINT IF EXISTS "PolicyAcknowledgment_courseVersionId_fkey";
ALTER TABLE "PolicyAcknowledgment" ADD CONSTRAINT "PolicyAcknowledgment_courseVersionId_fkey"
  FOREIGN KEY ("courseVersionId") REFERENCES "CourseVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CourseVersion" DROP CONSTRAINT IF EXISTS "CourseVersion_courseId_fkey";
ALTER TABLE "CourseVersion" ADD CONSTRAINT "CourseVersion_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ResourceAck" DROP CONSTRAINT IF EXISTS "ResourceAck_resourceId_fkey";
ALTER TABLE "ResourceAck" ADD CONSTRAINT "ResourceAck_resourceId_fkey"
  FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FormSubmission" DROP CONSTRAINT IF EXISTS "FormSubmission_formId_fkey";
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formId_fkey"
  FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AgentDDFile" DROP CONSTRAINT IF EXISTS "AgentDDFile_applicationId_fkey";
ALTER TABLE "AgentDDFile" ADD CONSTRAINT "AgentDDFile_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "AgentApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
