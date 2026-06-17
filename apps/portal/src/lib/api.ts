const API = process.env.API_URL || 'http://localhost:4000/api';

export type HumanVerification = {
  humanVerificationToken?: string;
  humanVerificationAnswer?: string;
};

export type Agent = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: string;
  emailVerified: boolean;
};

export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  agent: Agent;
};

async function safeFetch(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Convert low-level network errors into a friendly message
    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('ENOTFOUND')) {
      throw new Error('Service temporarily unavailable. Please try again later.');
    }
    throw err;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    const text = await res.text();
    if (!text) return undefined as unknown as T;
    return JSON.parse(text) as T;
  }
  let message = 'Request failed';
  try {
    const json = await res.json();
    if (Array.isArray(json.message)) {
      message = json.message.join('; ');
    } else {
      message = json.message || json.error || message;
    }
  } catch {
    // ignore parse error
  }
  throw new Error(message);
}

export async function apiVerifyEmail(token: string): Promise<{ ok: boolean; message: string }> {
  const res = await safeFetch(`${API}/portal/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return handleResponse(res);
}

export async function apiResendVerification(email: string): Promise<{ ok: boolean }> {
  const res = await safeFetch(`${API}/portal/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse(res);
}

export async function apiLogin(email: string, password: string, verification?: HumanVerification): Promise<AuthResult> {
  const res = await safeFetch(`${API}/portal/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, ...verification }),
  });
  return handleResponse(res);
}

export async function apiRefresh(refreshToken: string): Promise<AuthResult> {
  const res = await safeFetch(`${API}/portal/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  return handleResponse(res);
}

export async function apiGoogleLogin(credential: string): Promise<AuthResult> {
  const res = await safeFetch(`${API}/portal/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  return handleResponse(res);
}

export async function apiLogout(accessToken: string, refreshToken: string): Promise<void> {
  await safeFetch(`${API}/portal/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ refreshToken }),
  });
}

export async function apiForgotPassword(email: string, verification?: HumanVerification): Promise<{ ok: boolean }> {
  const res = await safeFetch(`${API}/portal/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, ...verification }),
  });
  return handleResponse(res);
}

export async function apiResetPassword(
  token: string,
  newPassword: string,
): Promise<{ ok: boolean }> {
  const res = await safeFetch(`${API}/portal/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  return handleResponse(res);
}

export async function apiChangePassword(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean }> {
  const res = await safeFetch(`${API}/portal/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return handleResponse(res);
}

// ── Training / LMS ──────────────────────────────────────────────────────────

export type CourseSummary = {
  id: string;
  slug: string;
  title: string;
  category: string;
  description?: string;
  language: string;
  languages: string[];
  passingScore: number;
  questionCount: number;
  lessonCount: number;
  lessonsDone: number;
  progressPct: number;
  completed: boolean;
  bestScore: number | null;
  dueAt: string | null;
  overdue: boolean;
  // Phase 3: reason this course was explicitly assigned (null = via audience).
  assignedReason: string | null;
  // Phase 5: an approved waiver/equivalency excuses this course for the learner.
  excused: boolean;
  excusedType: string | null;
};

export type QuizQuestion = { i: number; q: string; options: string[] };

export type LessonView = {
  id: string;
  title: string;
  contentHtml: string;
  videoUrl: string | null;
  durationMinutes: number | null;
  completed: boolean;
};

export type SectionView = { id: string; title: string; lessons: LessonView[] };

export type CourseDetail = {
  slug: string;
  title: string;
  category: string;
  description?: string;
  contentHtml: string;
  language: string;
  languages: { slug: string; language: string }[];
  passingScore: number;
  requireLessons: boolean;
  dueAt: string | null;
  sections: SectionView[];
  lessonCount: number;
  lessonsDone: number;
  questions: QuizQuestion[];
  lastAttempt: { score: number; passed: boolean; completedAt: string } | null;
  certificateAvailable: boolean;
  // Phase 2: policy acknowledgment / content versioning
  requireAck: boolean;
  version: number;
  versionEffectiveAt: string;
  policyStatement: string;
  acknowledgedVersion: number | null;
  acknowledgedAt: string | null;
};

export type QuizResult = {
  score: number;
  passed: boolean;
  passingScore: number;
  correct: number;
  total: number;
  results: { i: number; correct: boolean }[];
  certificateAvailable?: boolean;
};

export type ResourceItem = {
  id: string;
  title: string;
  category: string;
  description?: string;
  url: string;
  acknowledged: boolean;
};

function authHeaders(accessToken: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };
}

export async function apiCourses(accessToken: string): Promise<CourseSummary[]> {
  const res = await safeFetch(`${API}/portal/training/courses`, { headers: authHeaders(accessToken), cache: 'no-store' });
  return handleResponse(res);
}

export async function apiCourse(accessToken: string, slug: string): Promise<CourseDetail> {
  const res = await safeFetch(`${API}/portal/training/courses/${encodeURIComponent(slug)}`, {
    headers: authHeaders(accessToken),
    cache: 'no-store',
  });
  return handleResponse(res);
}

export async function apiSubmitQuiz(accessToken: string, slug: string, answers: number[]): Promise<QuizResult> {
  const res = await safeFetch(`${API}/portal/training/courses/${encodeURIComponent(slug)}/submit`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ answers }),
  });
  return handleResponse(res);
}

export async function apiCompleteLesson(accessToken: string, lessonId: string): Promise<{ ok: boolean }> {
  const res = await safeFetch(`${API}/portal/training/lessons/${encodeURIComponent(lessonId)}/complete`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
  return handleResponse(res);
}

export async function apiAcknowledgePolicy(
  accessToken: string,
  slug: string,
): Promise<{ acknowledged: boolean; version: number; acknowledgedAt: string; statement: string }> {
  const res = await safeFetch(`${API}/portal/training/courses/${encodeURIComponent(slug)}/acknowledge`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
  return handleResponse(res);
}

export async function apiSetLanguage(accessToken: string, language: string): Promise<{ ok: boolean; language: string }> {
  const res = await safeFetch(`${API}/portal/training/language`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ language }),
  });
  return handleResponse(res);
}

export async function apiResources(accessToken: string): Promise<ResourceItem[]> {
  const res = await safeFetch(`${API}/portal/training/resources`, { headers: authHeaders(accessToken), cache: 'no-store' });
  return handleResponse(res);
}

export async function apiAckResource(accessToken: string, id: string): Promise<{ acknowledged: boolean }> {
  const res = await safeFetch(`${API}/portal/training/resources/${encodeURIComponent(id)}/ack`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
  return handleResponse(res);
}

// ── Agent → office requests ─────────────────────────────────────────────────

export type RequestAttachment = { name: string; url: string; kind?: string };
export type RequestMessage = { id: string; authorType: string; authorName: string | null; body: string; createdAt: string };
export type AgentRequest = {
  id: string; type: string; subject: string; details: string; status: string;
  attachments: RequestAttachment[]; createdAt: string; updatedAt: string;
  messages?: RequestMessage[];
};

export async function apiListRequests(accessToken: string): Promise<AgentRequest[]> {
  const res = await safeFetch(`${API}/portal/requests`, { headers: authHeaders(accessToken), cache: 'no-store' });
  return handleResponse(res);
}
export async function apiGetRequest(accessToken: string, id: string): Promise<AgentRequest> {
  const res = await safeFetch(`${API}/portal/requests/${encodeURIComponent(id)}`, { headers: authHeaders(accessToken), cache: 'no-store' });
  return handleResponse(res);
}
export async function apiCreateRequest(accessToken: string, data: { type: string; subject: string; details?: string; attachments?: RequestAttachment[] }): Promise<AgentRequest> {
  const res = await safeFetch(`${API}/portal/requests`, { method: 'POST', headers: authHeaders(accessToken), body: JSON.stringify(data) });
  return handleResponse(res);
}
export async function apiRequestMessage(accessToken: string, id: string, body: string): Promise<RequestMessage> {
  const res = await safeFetch(`${API}/portal/requests/${encodeURIComponent(id)}/messages`, { method: 'POST', headers: authHeaders(accessToken), body: JSON.stringify({ body }) });
  return handleResponse(res);
}
