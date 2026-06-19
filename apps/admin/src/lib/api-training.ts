// Admin API — training: assignments, compliance, exceptions, certificate.
// Split out of api.ts and re-exported from there so `@/lib/api` imports work.
import { authFetch, handleResponse } from './api-client';

// ---------------------------------------------------------------------------
// Training assignments (Phase 3)
// ---------------------------------------------------------------------------

export type TrainingAssignment = {
  id: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  agentId: string | null;
  agentName: string | null;
  agentEmail: string | null;
  branchCode: string | null;
  reason: string;
  note: string | null;
  dueAt: string | null;
  active: boolean;
  assignedBy: string | null;
  createdAt: string;
};

export type AssignmentInput = {
  courseId: string;
  agentId?: string;
  branchCode?: string;
  reason: string;
  note?: string;
  dueAt?: string | null;
};

export async function apiListAssignments(accessToken: string, courseId?: string): Promise<TrainingAssignment[]> {
  const qs = courseId ? `?courseId=${encodeURIComponent(courseId)}` : '';
  const res = await authFetch(`/admin/training/assignments${qs}`, accessToken);
  return handleResponse<TrainingAssignment[]>(res);
}

export async function apiCreateAssignment(accessToken: string, data: AssignmentInput): Promise<TrainingAssignment> {
  const res = await authFetch('/admin/training/assignments', accessToken, { method: 'POST', body: JSON.stringify(data) });
  return handleResponse<TrainingAssignment>(res);
}

export async function apiUpdateAssignment(accessToken: string, id: string, data: Partial<{ reason: string; note: string; dueAt: string | null; active: boolean }>): Promise<TrainingAssignment> {
  const res = await authFetch(`/admin/training/assignments/${id}`, accessToken, { method: 'PATCH', body: JSON.stringify(data) });
  return handleResponse<TrainingAssignment>(res);
}

// ---------------------------------------------------------------------------
// Compliance dashboard (Phase 4)
// ---------------------------------------------------------------------------

export type ComplianceCourse = {
  id: string;
  courseId: string;
  title: string;
  category: string;
  requireAck: boolean;
  dueAt: string | null;
  requiredCount: number;
  completedCount: number;
  completionPct: number;
  overdueCount: number;
  excusedCount: number;
  ackCount: number | null;
  ackPct: number | null;
  versionEffectiveAt: string | null;
  stale: boolean;
};

export type ComplianceSummary = {
  generatedAt: string;
  totals: {
    courses: number;
    required: number;
    completed: number;
    overdue: number;
    excused: number;
    completionPct: number;
    staleCourses: number;
  };
  courses: ComplianceCourse[];
};

export async function apiComplianceSummary(accessToken: string): Promise<ComplianceSummary> {
  const res = await authFetch('/admin/training/compliance', accessToken);
  return handleResponse<ComplianceSummary>(res);
}

// ---------------------------------------------------------------------------
// Training exceptions (Phase 5)
// ---------------------------------------------------------------------------

export type TrainingException = {
  id: string;
  courseId: string;
  courseTitle: string;
  agentId: string | null;
  agentName: string | null;
  agentEmail: string | null;
  branchCode: string | null;
  type: string;
  reason: string;
  note: string | null;
  status: string;
  expiresAt: string | null;
  expired: boolean;
  requestedBy: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
};

export type ExceptionInput = {
  courseId: string;
  agentId?: string;
  branchCode?: string;
  type: string;
  reason: string;
  note?: string;
  expiresAt?: string | null;
};

export async function apiListExceptions(accessToken: string, status?: string): Promise<TrainingException[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await authFetch(`/admin/training/exceptions${qs}`, accessToken);
  return handleResponse<TrainingException[]>(res);
}

export async function apiCreateException(accessToken: string, data: ExceptionInput): Promise<TrainingException> {
  const res = await authFetch('/admin/training/exceptions', accessToken, { method: 'POST', body: JSON.stringify(data) });
  return handleResponse<TrainingException>(res);
}

export async function apiDecideException(accessToken: string, id: string, status: 'APPROVED' | 'REJECTED', note?: string): Promise<TrainingException> {
  const res = await authFetch(`/admin/training/exceptions/${id}/decision`, accessToken, { method: 'PATCH', body: JSON.stringify({ status, note }) });
  return handleResponse<TrainingException>(res);
}

// ---------------------------------------------------------------------------
// Certificate template + field placement
// ---------------------------------------------------------------------------

export type CertField = {
  show: boolean;
  yPct: number;
  xPct?: number;
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  bold?: boolean;
};

export type CertLayout = {
  name: CertField;
  course: CertField;
  details: CertField;
  certId: CertField;
};

export type CertConfig = {
  templateImage: string | null;
  layout: CertLayout;
  brandLogo: string | null;
  brandAddress: string | null;
};

export async function apiGetCertificateConfig(accessToken: string): Promise<CertConfig> {
  const res = await authFetch('/admin/training/certificate', accessToken);
  return handleResponse<CertConfig>(res);
}

export async function apiSaveCertificateConfig(
  accessToken: string,
  data: { templateImage?: string | null; layout?: CertLayout; brandLogo?: string | null; brandAddress?: string | null },
): Promise<CertConfig> {
  const res = await authFetch('/admin/training/certificate', accessToken, { method: 'PATCH', body: JSON.stringify(data) });
  return handleResponse<CertConfig>(res);
}

// Per-course certificate override (falls back to the global default)
export type CourseCertConfig = {
  hasOverride: boolean;
  templateImage: string | null;
  layout: CertLayout;
};

export async function apiGetCourseCertConfig(accessToken: string, courseId: string): Promise<CourseCertConfig> {
  const res = await authFetch(`/admin/training/certificate/course/${encodeURIComponent(courseId)}/config`, accessToken);
  return handleResponse<CourseCertConfig>(res);
}

export async function apiSaveCourseCertConfig(
  accessToken: string,
  courseId: string,
  data: { templateImage?: string | null; layout?: CertLayout },
): Promise<CourseCertConfig> {
  const res = await authFetch(`/admin/training/certificate/course/${encodeURIComponent(courseId)}/config`, accessToken, { method: 'PATCH', body: JSON.stringify(data) });
  return handleResponse<CourseCertConfig>(res);
}

export async function apiResetCourseCertConfig(accessToken: string, courseId: string): Promise<CourseCertConfig> {
  const res = await authFetch(`/admin/training/certificate/course/${encodeURIComponent(courseId)}/config`, accessToken, { method: 'DELETE' });
  return handleResponse<CourseCertConfig>(res);
}

// ---------------------------------------------------------------------------
// Training / LMS - courses, quizzes, resources, reporting
// ---------------------------------------------------------------------------

export type QuizQuestion = { q: string; options: string[]; answer: number };

export type Course = {
  id: string;
  slug: string;
  title: string;
  category: string;
  description?: string | null;
  contentHtml: string;
  questions: string; // JSON string of QuizQuestion[]
  passingScore: number;
  audience: string; // ALL | STATE | AGENT
  targetStates?: string | null;
  targetBranches?: string | null;
  status: string; // DRAFT | PUBLISHED
  order: number;
  language: string;
  translationGroup?: string | null;
  dueAt?: string | null;
  requireLessons?: boolean;
  requireAck?: boolean;
  policyStatement?: string | null;
  questionCount?: number;
  sectionCount?: number;
  lessonCount?: number;
  passedCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CourseInput = {
  title: string;
  slug?: string;
  category: string;
  description?: string;
  contentHtml: string;
  questions: QuizQuestion[];
  passingScore: number;
  audience: string;
  targetStates?: string;
  targetBranches?: string;
  status: string;
  order?: number;
  language?: string;
  translationGroup?: string;
  dueAt?: string | null;
  requireLessons?: boolean;
  requireAck?: boolean;
  policyStatement?: string | null;
};

export type Lesson = {
  id: string;
  sectionId: string;
  title: string;
  order: number;
  contentHtml: string;
  videoUrl?: string | null;
  durationMinutes?: number | null;
};

export type Section = {
  id: string;
  courseId: string;
  title: string;
  order: number;
  lessons: Lesson[];
};

export type CourseWithCurriculum = Course & { sections: Section[] };

export type LessonInput = { title: string; order?: number; contentHtml?: string; videoUrl?: string; durationMinutes?: number | null };
export type SectionInput = { title: string; order?: number };

export type Resource = {
  id: string;
  title: string;
  category: string;
  description?: string | null;
  url: string;
  allowDownload: boolean;
  audience: string;
  targetStates?: string | null;
  targetBranches?: string | null;
  status: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ResourceInput = {
  title: string;
  category: string;
  description?: string;
  url: string;
  allowDownload?: boolean;
  audience: string;
  targetStates?: string;
  targetBranches?: string;
  status: string;
  order?: number;
};

export type Completion = {
  id: string;
  completedAt: string;
  score: number;
  passed: boolean;
  attempt: number;
  branchCode?: string | null;
  agentState?: string | null;
  course: { title: string; slug: string; category: string; passingScore: number };
  agent: { firstName: string; lastName: string; email: string; role: string; branchCode?: string | null };
};

export type TrainingReport = {
  courses: { id: string; title: string; slug: string; category: string; passedLearners: number; dueAt?: string | null; overdue?: boolean }[];
  byState: { state: string; completions: number }[];
  byBranch: { branchCode: string; completions: number }[];
};

export async function apiListCourses(accessToken: string): Promise<Course[]> {
  const res = await authFetch('/admin/training/courses', accessToken);
  return handleResponse<Course[]>(res);
}

export async function apiCreateCourse(accessToken: string, data: CourseInput): Promise<Course> {
  const res = await authFetch('/admin/training/courses', accessToken, { method: 'POST', body: JSON.stringify(data) });
  return handleResponse<Course>(res);
}

export async function apiUpdateCourse(accessToken: string, id: string, data: Partial<CourseInput>): Promise<Course> {
  const res = await authFetch(`/admin/training/courses/${id}`, accessToken, { method: 'PATCH', body: JSON.stringify(data) });
  return handleResponse<Course>(res);
}

export async function apiDeleteCourse(accessToken: string, id: string): Promise<void> {
  const res = await authFetch(`/admin/training/courses/${id}`, accessToken, { method: 'DELETE' });
  await handleResponse<void>(res);
}

export async function apiGetCourse(accessToken: string, id: string): Promise<CourseWithCurriculum> {
  const res = await authFetch(`/admin/training/courses/${id}`, accessToken);
  return handleResponse<CourseWithCurriculum>(res);
}

export async function apiCreateSection(accessToken: string, courseId: string, data: SectionInput): Promise<Section> {
  const res = await authFetch(`/admin/training/courses/${courseId}/sections`, accessToken, { method: 'POST', body: JSON.stringify(data) });
  return handleResponse<Section>(res);
}

export async function apiUpdateSection(accessToken: string, id: string, data: Partial<SectionInput>): Promise<Section> {
  const res = await authFetch(`/admin/training/sections/${id}`, accessToken, { method: 'PATCH', body: JSON.stringify(data) });
  return handleResponse<Section>(res);
}

export async function apiDeleteSection(accessToken: string, id: string): Promise<void> {
  const res = await authFetch(`/admin/training/sections/${id}`, accessToken, { method: 'DELETE' });
  await handleResponse<void>(res);
}

export async function apiCreateLesson(accessToken: string, sectionId: string, data: LessonInput): Promise<Lesson> {
  const res = await authFetch(`/admin/training/sections/${sectionId}/lessons`, accessToken, { method: 'POST', body: JSON.stringify(data) });
  return handleResponse<Lesson>(res);
}

export async function apiUpdateLesson(accessToken: string, id: string, data: Partial<LessonInput>): Promise<Lesson> {
  const res = await authFetch(`/admin/training/lessons/${id}`, accessToken, { method: 'PATCH', body: JSON.stringify(data) });
  return handleResponse<Lesson>(res);
}

export async function apiDeleteLesson(accessToken: string, id: string): Promise<void> {
  const res = await authFetch(`/admin/training/lessons/${id}`, accessToken, { method: 'DELETE' });
  await handleResponse<void>(res);
}

export async function apiListTrainingResources(accessToken: string): Promise<Resource[]> {
  const res = await authFetch('/admin/training/resources', accessToken);
  return handleResponse<Resource[]>(res);
}

export async function apiCreateResource(accessToken: string, data: ResourceInput): Promise<Resource> {
  const res = await authFetch('/admin/training/resources', accessToken, { method: 'POST', body: JSON.stringify(data) });
  return handleResponse<Resource>(res);
}

export async function apiUpdateResource(accessToken: string, id: string, data: Partial<ResourceInput>): Promise<Resource> {
  const res = await authFetch(`/admin/training/resources/${id}`, accessToken, { method: 'PATCH', body: JSON.stringify(data) });
  return handleResponse<Resource>(res);
}

export async function apiDeleteResource(accessToken: string, id: string): Promise<void> {
  const res = await authFetch(`/admin/training/resources/${id}`, accessToken, { method: 'DELETE' });
  await handleResponse<void>(res);
}

export async function apiTrainingCompletions(
  accessToken: string,
  filter: { state?: string; branchCode?: string; courseId?: string; passedOnly?: boolean } = {},
): Promise<Completion[]> {
  const params = new URLSearchParams();
  if (filter.state) params.set('state', filter.state);
  if (filter.branchCode) params.set('branchCode', filter.branchCode);
  if (filter.courseId) params.set('courseId', filter.courseId);
  if (filter.passedOnly) params.set('passedOnly', 'true');
  const qs = params.toString();
  const res = await authFetch(`/admin/training/completions${qs ? `?${qs}` : ''}`, accessToken);
  return handleResponse<Completion[]>(res);
}

export async function apiTrainingReport(accessToken: string): Promise<TrainingReport> {
  const res = await authFetch('/admin/training/report', accessToken);
  return handleResponse<TrainingReport>(res);
}
