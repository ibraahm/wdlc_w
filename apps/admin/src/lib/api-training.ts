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
