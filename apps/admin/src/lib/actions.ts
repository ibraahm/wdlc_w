'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  apiLogin,
  apiLogout,
  apiForgotPassword,
  apiResetPassword,
  apiChangePassword,
  apiSetSetting,
  apiCreateUser,
  apiSetUserActive,
  apiSetAgentStatus,
  apiSetAgentVisibility,
  apiToggleLocationActive,
  apiDeleteLocation,
  apiSetApplicationStatus,
  apiDeleteApplication,
  apiCreatePartner,
  apiUpdatePartner,
  apiDeletePartner,
  apiCreateNetworkCountry,
  apiUpdateNetworkCountry,
  apiDeleteNetworkCountry,
  apiCreateDDFile,
  apiUpdateDDDocument,
  apiSetDDStage,
  apiSetDDRisk,
  apiRecordDDReview,
  apiSetDDBranchCode,
  apiUpdateTellerApplication,
  apiResendBranchUserSetup,
  apiVerifyBranchUser,
  apiSetSubmissionStatus,
  apiAddSubmissionNote,
  apiReplySubmission,
  apiCreateNavItem,
  apiUpdateNavItem,
  apiDeleteNavItem,
  apiReorderNav,
  apiCreateCourse,
  apiUpdateCourse,
  apiCreateAssignment,
  apiUpdateAssignment,
  apiCreateException,
  apiDecideException,
  apiSaveCertificateConfig,
  apiSaveCourseCertConfig,
  apiResetCourseCertConfig,
  apiDeleteCourse,
  apiCreateResource,
  apiUpdateResource,
  apiDeleteResource,
  apiTrainingCompletions,
  apiGetCourse,
  apiCreateSection,
  apiUpdateSection,
  apiDeleteSection,
  apiCreateLesson,
  apiUpdateLesson,
  apiDeleteLesson,
  apiAdminSearch,
  apiCreateRegionalOffice,
  apiUpdateRegionalOffice,
  apiDeleteRegionalOffice,
  apiInviteUser,
  apiGoogleLogin,
  apiGetOfficeRequest,
  apiUpdateOfficeRequest,
  apiOfficeRequestMessage,
  apiListRiskAssessments,
  apiCreateRiskAssessment,
} from './api';
import type { Partner, NetworkCountry, NavItemInput, CourseInput, ResourceInput, Completion, CourseWithCurriculum, SectionInput, LessonInput, SearchResult, RegionalOfficeInput, OfficeRequest, RiskAssessment, RiskFactor, AssignmentInput, ExceptionInput, CertLayout } from './api';
import { getSession, setSessionCookies, clearSessionCookies, clearMustChangePassword } from './auth';

// ---------------------------------------------------------------------------
// Auth actions
// ---------------------------------------------------------------------------

export async function loginAction(formData: FormData): Promise<{ error?: string }> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const humanVerificationToken = (formData.get('humanVerificationToken') as string) || undefined;
  const humanVerificationAnswer = (formData.get('humanVerificationAnswer') as string) || undefined;

  try {
    const result = await apiLogin(email, password, { humanVerificationToken, humanVerificationAnswer });
    await setSessionCookies(result.accessToken, result.refreshToken, result.user);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Login failed' };
  }

  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  if (session) {
    try {
      // We don't have the refresh token here but we can still clear cookies
      await clearSessionCookies();
    } catch {
      await clearSessionCookies();
    }
  } else {
    await clearSessionCookies();
  }
  redirect('/login');
}

export async function forgotPasswordAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const email = formData.get('email') as string;
  const humanVerificationToken = (formData.get('humanVerificationToken') as string) || undefined;
  const humanVerificationAnswer = (formData.get('humanVerificationAnswer') as string) || undefined;
  try {
    await apiForgotPassword(email, { humanVerificationToken, humanVerificationAnswer });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Request failed' };
  }
}

export async function resetPasswordAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const token = formData.get('token') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (newPassword !== confirmPassword) {
    return { ok: false, error: 'Passwords do not match' };
  }

  try {
    await apiResetPassword(token, newPassword);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Reset failed' };
  }
}

export async function changePasswordAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };

  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  if (!currentPassword || !newPassword) return { ok: false, error: 'Both fields are required' };
  if (newPassword.length < 12) return { ok: false, error: 'New password must be at least 12 characters' };
  if (newPassword === currentPassword) return { ok: false, error: 'New password must be different' };

  try {
    await apiChangePassword(session.accessToken, currentPassword, newPassword);
    // Clear the "must change password" flag in the session cookie so the
    // forced-change redirect stops immediately.
    await clearMustChangePassword();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Change password failed' };
  }
}

// ---------------------------------------------------------------------------
// Settings actions
// ---------------------------------------------------------------------------

export async function saveSettingsAction(
  entries: { key: string; value: string }[],
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };

  try {
    await Promise.all(entries.map(({ key, value }) => apiSetSetting(session.accessToken, key, value)));
    revalidatePath('/settings');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export async function addSettingAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };

  const key = formData.get('key') as string;
  const value = formData.get('value') as string;

  try {
    await apiSetSetting(session.accessToken, key, value);
    revalidatePath('/settings');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Add failed' };
  }
}

// ---------------------------------------------------------------------------
// User actions
// ---------------------------------------------------------------------------

export async function createUserAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };

  try {
    await apiCreateUser(session.accessToken, {
      email: formData.get('email') as string,
      name: formData.get('name') as string,
      password: formData.get('password') as string,
      role: (formData.get('role') as string) || undefined,
      regionalOfficeId: (formData.get('regionalOfficeId') as string) || undefined,
    });
    revalidatePath('/users');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Create failed' };
  }
}

export async function setAgentStatusAction(
  id: string,
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiSetAgentStatus(session.accessToken, id, status);
    revalidatePath('/agents');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function setAgentVisibilityAction(
  id: string,
  showOnMap: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiSetAgentVisibility(session.accessToken, id, showOnMap);
    revalidatePath('/agents');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function toggleLocationActiveAction(
  id: string,
  active: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiToggleLocationActive(session.accessToken, id, active);
    revalidatePath('/agents');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function deleteLocationAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiDeleteLocation(session.accessToken, id);
    revalidatePath('/agents');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}

export async function setApplicationStatusAction(
  id: string,
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiSetApplicationStatus(session.accessToken, id, status);
    revalidatePath('/applications');
    revalidatePath('/agent-dd');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function deleteApplicationAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiDeleteApplication(session.accessToken, id);
    revalidatePath('/applications');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}

export async function setUserActiveAction(
  id: string,
  active: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };

  try {
    await apiSetUserActive(session.accessToken, id, active);
    revalidatePath('/users');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

// ---------------------------------------------------------------------------
// Partner actions
// ---------------------------------------------------------------------------

export async function createPartnerAction(
  data: Partial<Partner>,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    const partner = await apiCreatePartner(session.accessToken, data);
    revalidatePath('/partners');
    return { ok: true, id: partner.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Create failed' };
  }
}

export async function updatePartnerAction(
  id: string,
  data: Partial<Partner>,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiUpdatePartner(session.accessToken, id, data);
    revalidatePath('/partners');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function deletePartnerAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiDeletePartner(session.accessToken, id);
    revalidatePath('/partners');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}

// ---------------------------------------------------------------------------
// Network country actions
// ---------------------------------------------------------------------------

export async function createNetworkCountryAction(
  data: Partial<NetworkCountry>,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    const c = await apiCreateNetworkCountry(session.accessToken, data);
    revalidatePath('/network');
    return { ok: true, id: c.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Create failed' };
  }
}

export async function updateNetworkCountryAction(
  id: string,
  data: Partial<NetworkCountry>,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiUpdateNetworkCountry(session.accessToken, id, data);
    revalidatePath('/network');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function deleteNetworkCountryAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiDeleteNetworkCountry(session.accessToken, id);
    revalidatePath('/network');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}

// ─── Agent Due Diligence ────────────────────────────────────────────────────
export async function createDDFileAction(data: {
  agentName: string;
  entityType?: string;
  states?: string;
  regionalOffice?: string;
  applicationId?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    const file = await apiCreateDDFile(session.accessToken, data);
    revalidatePath('/agent-dd');
    return { ok: true, id: file.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Create failed' };
  }
}

export async function updateDDDocumentAction(
  fileId: string,
  code: string,
  data: { present?: boolean; expiry?: string | null; notes?: string; dropboxUrl?: string | null },
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiUpdateDDDocument(session.accessToken, fileId, code, data);
    revalidatePath(`/agent-dd/${fileId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function setDDStageAction(id: string, stage: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiSetDDStage(session.accessToken, id, stage);
    revalidatePath(`/agent-dd/${id}`);
    revalidatePath('/agent-dd');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function setDDRiskAction(id: string, riskRating: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiSetDDRisk(session.accessToken, id, riskRating);
    revalidatePath(`/agent-dd/${id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function recordDDReviewAction(
  id: string,
  nextReviewDueAt?: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiRecordDDReview(session.accessToken, id, nextReviewDueAt);
    revalidatePath(`/agent-dd/${id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

// ---------------------------------------------------------------------------
// News actions
// ---------------------------------------------------------------------------

export async function createNewsPostAction(data: import('./api').NewsPostInput): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await import('./api').then((m) => m.apiCreateNewsPost(session.accessToken, data));
    revalidatePath('/news');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Create failed' };
  }
}

export async function updateNewsPostAction(id: string, data: Partial<import('./api').NewsPostInput>): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await import('./api').then((m) => m.apiUpdateNewsPost(session.accessToken, id, data));
    revalidatePath('/news');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function deleteNewsPostAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await import('./api').then((m) => m.apiDeleteNewsPost(session.accessToken, id));
    revalidatePath('/news');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}

// ---------------------------------------------------------------------------
// Navigation menu actions
// ---------------------------------------------------------------------------

export async function createNavItemAction(
  data: NavItemInput,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    const item = await apiCreateNavItem(session.accessToken, data);
    revalidatePath('/navigation');
    return { ok: true, id: item.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Create failed' };
  }
}

export async function updateNavItemAction(
  id: string,
  data: Partial<NavItemInput>,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiUpdateNavItem(session.accessToken, id, data);
    revalidatePath('/navigation');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function deleteNavItemAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiDeleteNavItem(session.accessToken, id);
    revalidatePath('/navigation');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}

export async function reorderNavAction(
  items: { id: string; order: number }[],
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiReorderNav(session.accessToken, items);
    revalidatePath('/navigation');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Reorder failed' };
  }
}

// ---------------------------------------------------------------------------
// Branch code + teller actions
// ---------------------------------------------------------------------------

export async function setDDBranchCodeAction(id: string, branchCode: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiSetDDBranchCode(session.accessToken, id, branchCode.trim().toLowerCase());
    revalidatePath(`/agent-dd/${id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function updateTellerApplicationAction(
  id: string,
  data: { branchCode?: string; status?: string },
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiUpdateTellerApplication(session.accessToken, id, data);
    revalidatePath('/tellers');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

// ---------------------------------------------------------------------------
// Website submission case management
// ---------------------------------------------------------------------------

export async function setSubmissionStatusAction(submissionId: string, status: string, assignee?: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiSetSubmissionStatus(session.accessToken, submissionId, status, assignee);
    revalidatePath('/submissions');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function addSubmissionNoteAction(submissionId: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  if (!body.trim()) return { ok: false, error: 'Note cannot be empty' };
  try {
    await apiAddSubmissionNote(session.accessToken, submissionId, body.trim());
    revalidatePath('/submissions');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to add note' };
  }
}

export async function replySubmissionAction(submissionId: string, subject: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  if (!subject.trim() || !body.trim()) return { ok: false, error: 'Subject and message are required' };
  try {
    await apiReplySubmission(session.accessToken, submissionId, subject.trim(), body.trim());
    revalidatePath('/submissions');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Reply failed' };
  }
}

export async function resendBranchUserSetupAction(userId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiResendBranchUserSetup(session.accessToken, userId);
    revalidatePath('/branches');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Resend failed' };
  }
}

export async function verifyBranchUserAction(userId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiVerifyBranchUser(session.accessToken, userId);
    revalidatePath('/branches');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Verify failed' };
  }
}

// ---------------------------------------------------------------------------
// Training / LMS - courses & resources
// ---------------------------------------------------------------------------

export async function createCourseAction(data: CourseInput): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiCreateCourse(session.accessToken, data);
    revalidatePath('/training/courses');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Create failed' };
  }
}

export async function saveCertificateAction(
  data: { templateImage?: string | null; layout?: CertLayout },
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiSaveCertificateConfig(session.accessToken, data);
    revalidatePath('/training/certificate');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export async function saveCourseCertAction(
  courseId: string,
  data: { templateImage?: string | null; layout?: CertLayout },
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiSaveCourseCertConfig(session.accessToken, courseId, data);
    revalidatePath(`/training/certificate/course/${courseId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export async function resetCourseCertAction(courseId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiResetCourseCertConfig(session.accessToken, courseId);
    revalidatePath(`/training/certificate/course/${courseId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Reset failed' };
  }
}

export async function createExceptionAction(data: ExceptionInput): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiCreateException(session.accessToken, data);
    revalidatePath('/training/exceptions');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Request failed' };
  }
}

export async function decideExceptionAction(id: string, status: 'APPROVED' | 'REJECTED', note?: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiDecideException(session.accessToken, id, status, note);
    revalidatePath('/training/exceptions');
    revalidatePath('/training/compliance');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Decision failed' };
  }
}

export async function createAssignmentAction(data: AssignmentInput): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiCreateAssignment(session.accessToken, data);
    revalidatePath('/training/assignments');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Assign failed' };
  }
}

export async function updateAssignmentAction(
  id: string,
  data: Partial<{ reason: string; note: string; dueAt: string | null; active: boolean }>,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiUpdateAssignment(session.accessToken, id, data);
    revalidatePath('/training/assignments');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function updateCourseAction(id: string, data: Partial<CourseInput>): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiUpdateCourse(session.accessToken, id, data);
    revalidatePath('/training/courses');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function deleteCourseAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiDeleteCourse(session.accessToken, id);
    revalidatePath('/training/courses');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}

export async function createResourceAction(data: ResourceInput): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiCreateResource(session.accessToken, data);
    revalidatePath('/training/resources');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Create failed' };
  }
}

export async function updateResourceAction(id: string, data: Partial<ResourceInput>): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiUpdateResource(session.accessToken, id, data);
    revalidatePath('/training/resources');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function deleteResourceAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiDeleteResource(session.accessToken, id);
    revalidatePath('/training/resources');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}

// ── Curriculum (sections & lessons) ─────────────────────────────────────────

export async function getCourseCurriculumAction(courseId: string): Promise<{ course?: CourseWithCurriculum; error?: string }> {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };
  try {
    const course = await apiGetCourse(session.accessToken, courseId);
    return { course };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Load failed' };
  }
}

export async function createSectionAction(courseId: string, data: SectionInput): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiCreateSection(session.accessToken, courseId, data);
    revalidatePath('/training/courses');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Create failed' };
  }
}

export async function updateSectionAction(id: string, data: Partial<SectionInput>): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiUpdateSection(session.accessToken, id, data);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function deleteSectionAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiDeleteSection(session.accessToken, id);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}

export async function createLessonAction(sectionId: string, data: LessonInput): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiCreateLesson(session.accessToken, sectionId, data);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Create failed' };
  }
}

export async function updateLessonAction(id: string, data: Partial<LessonInput>): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiUpdateLesson(session.accessToken, id, data);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function deleteLessonAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiDeleteLesson(session.accessToken, id);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}

export async function loadCompletionsAction(
  filter: { state?: string; branchCode?: string; courseId?: string; passedOnly?: boolean },
): Promise<{ rows?: Completion[]; error?: string }> {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };
  try {
    const rows = await apiTrainingCompletions(session.accessToken, filter);
    return { rows };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Load failed' };
  }
}

// ---------------------------------------------------------------------------
// Global search (admin header)
// ---------------------------------------------------------------------------

export async function adminSearchAction(q: string): Promise<{ results?: SearchResult[]; error?: string }> {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };
  try {
    const { results } = await apiAdminSearch(session.accessToken, q);
    return { results };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Search failed' };
  }
}

// ---------------------------------------------------------------------------
// Regional offices
// ---------------------------------------------------------------------------

export async function createRegionalOfficeAction(data: RegionalOfficeInput): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiCreateRegionalOffice(session.accessToken, data);
    revalidatePath('/regional-offices');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Create failed' };
  }
}

export async function updateRegionalOfficeAction(id: string, data: RegionalOfficeInput): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiUpdateRegionalOffice(session.accessToken, id, data);
    revalidatePath('/regional-offices');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function deleteRegionalOfficeAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiDeleteRegionalOffice(session.accessToken, id);
    revalidatePath('/regional-offices');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}

// ---------------------------------------------------------------------------
// Invite admin user + Google sign-in
// ---------------------------------------------------------------------------

export async function inviteUserAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiInviteUser(session.accessToken, {
      email: formData.get('email') as string,
      name: formData.get('name') as string,
      role: (formData.get('role') as string) || undefined,
      regionalOfficeId: (formData.get('regionalOfficeId') as string) || undefined,
      accessExpiresAt: (formData.get('accessExpiresAt') as string) || undefined,
    });
    revalidatePath('/users');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Invite failed' };
  }
}

export async function googleLoginAction(credential: string): Promise<{ error?: string }> {
  if (!credential) return { error: 'Missing Google credential.' };
  try {
    const result = await apiGoogleLogin(credential);
    await setSessionCookies(result.accessToken, result.refreshToken, result.user);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Google sign-in failed.' };
  }
  redirect('/dashboard');
}

// ---------------------------------------------------------------------------
// Agent → office requests (queue actions)
// ---------------------------------------------------------------------------

export async function loadOfficeRequestAction(id: string): Promise<{ request?: OfficeRequest; error?: string }> {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };
  try {
    const request = await apiGetOfficeRequest(session.accessToken, id);
    return { request };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Load failed' };
  }
}

export async function updateOfficeRequestAction(id: string, data: { status?: string; assignee?: string }): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiUpdateOfficeRequest(session.accessToken, id, data);
    revalidatePath('/requests');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function officeRequestMessageAction(id: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiOfficeRequestMessage(session.accessToken, id, body);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

// ---------------------------------------------------------------------------
// Risk assessments
// ---------------------------------------------------------------------------

export async function loadRiskAssessmentsAction(ddFileId: string): Promise<{ rows?: RiskAssessment[]; error?: string }> {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };
  try {
    const rows = await apiListRiskAssessments(session.accessToken, ddFileId);
    return { rows };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Load failed' };
  }
}

export async function createRiskAssessmentAction(ddFileId: string, factors: RiskFactor[], notes?: string): Promise<{ ok: boolean; rating?: string; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    const r = await apiCreateRiskAssessment(session.accessToken, ddFileId, { factors, notes });
    revalidatePath(`/agent-dd/${ddFileId}`);
    return { ok: true, rating: r.rating };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Save failed' };
  }
}
