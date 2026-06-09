const API = process.env.API_URL || 'http://localhost:4000/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  active?: boolean;
};

export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  user: AdminUser;
};


export type Setting = {
  key: string;
  value: string;
};

export type FormField = {
  id: string;
  type: string; // text | email | tel | number | textarea | select | radio | checkbox | yesno | heading
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  width?: 'full' | 'half';
  helpText?: string;
};

export type BuilderForm = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  fields: FormField[];
  status: string; // DRAFT | PUBLISHED
  submitLabel: string;
  successMessage: string;
  recaptcha: boolean;
  submissionCount?: number;
  updatedAt?: string;
  createdAt?: string;
};

export type FormSubmission = {
  id: string;
  status: string;
  data: Record<string, unknown>;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    const text = await res.text();
    if (!text) return undefined as unknown as T;
    return JSON.parse(text) as T;
  }
  let message = `Request failed: ${res.status}`;
  try {
    const json = await res.json();
    message = json.message || json.error || message;
  } catch {
    // ignore parse error
  }
  throw new Error(message);
}

async function authFetch(
  path: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    ...(options.headers as Record<string, string>),
  };
  return fetch(`${API}${path}`, { ...options, headers });
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function apiLogin(email: string, password: string, recaptchaToken?: string): Promise<AuthResult> {
  const res = await fetch(`${API}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, recaptchaToken }),
  });
  return handleResponse<AuthResult>(res);
}

export async function apiRefresh(refreshToken: string): Promise<AuthResult> {
  const res = await fetch(`${API}/admin/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  return handleResponse<AuthResult>(res);
}

export async function apiLogout(accessToken: string, refreshToken: string): Promise<void> {
  const res = await authFetch('/admin/auth/logout', accessToken, {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
  await handleResponse<void>(res);
}

export async function apiForgotPassword(email: string, recaptchaToken?: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API}/admin/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, recaptchaToken }),
  });
  return handleResponse<{ ok: boolean }>(res);
}

export async function apiResetPassword(
  token: string,
  newPassword: string,
): Promise<{ ok: boolean }> {
  const res = await fetch(`${API}/admin/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  return handleResponse<{ ok: boolean }>(res);
}

export async function apiChangePassword(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean }> {
  const res = await authFetch('/admin/auth/change-password', accessToken, {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return handleResponse<{ ok: boolean }>(res);
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function apiListUsers(accessToken: string): Promise<AdminUser[]> {
  const res = await authFetch('/admin/auth/users', accessToken);
  return handleResponse<AdminUser[]>(res);
}

export async function apiCreateUser(
  accessToken: string,
  data: { email: string; name: string; password: string; role?: string },
): Promise<AdminUser> {
  const res = await authFetch('/admin/auth/users', accessToken, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return handleResponse<AdminUser>(res);
}

export async function apiSetUserActive(
  accessToken: string,
  id: string,
  active: boolean,
): Promise<{ id: string; active: boolean }> {
  const res = await authFetch(`/admin/auth/users/${id}/active`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
  return handleResponse<{ id: string; active: boolean }>(res);
}

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export type AdminAgent = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  active: boolean;
  emailVerified: boolean;
  businessName: string | null;
  city: string | null;
  state: string | null;
  showOnMap: boolean;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
};

export async function apiListAgents(accessToken: string): Promise<AdminAgent[]> {
  const res = await authFetch('/admin/agents', accessToken);
  return handleResponse<AdminAgent[]>(res);
}

export async function apiSetAgentStatus(
  accessToken: string,
  id: string,
  status: string,
): Promise<{ id: string; status: string; showOnMap: boolean }> {
  const res = await authFetch(`/admin/agents/${id}/status`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return handleResponse(res);
}

export async function apiSetAgentVisibility(
  accessToken: string,
  id: string,
  showOnMap: boolean,
): Promise<{ id: string; status: string; showOnMap: boolean }> {
  const res = await authFetch(`/admin/agents/${id}/visibility`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ showOnMap }),
  });
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function apiGetSettings(accessToken: string): Promise<Setting[]> {
  const res = await authFetch('/cms/settings', accessToken);
  return handleResponse<Setting[]>(res);
}

export async function apiSetSetting(
  accessToken: string,
  key: string,
  value: string,
): Promise<void> {
  const res = await authFetch(`/cms/settings/${key}`, accessToken, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
  await handleResponse<void>(res);
}

export async function apiDeleteSetting(accessToken: string, key: string): Promise<void> {
  const res = await authFetch(`/cms/settings/${key}`, accessToken, { method: 'DELETE' });
  await handleResponse<void>(res);
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export type AuditLogEntry = {
  id: string;
  action: string;
  entity?: string;
  entityId?: string;
  createdAt: string;
  admin?: { email: string; name: string } | null;
  agent?: { email: string; firstName: string; lastName: string } | null;
};

export async function apiGetAuditLog(
  accessToken: string,
  params?: { entity?: string; take?: number },
): Promise<{ items: AuditLogEntry[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.entity) qs.set('entity', params.entity);
  if (params?.take) qs.set('take', String(params.take));
  const res = await authFetch(`/admin/audit${qs.size ? '?' + qs : ''}`, accessToken);
  return handleResponse<{ items: AuditLogEntry[]; total: number }>(res);
}

// ---------------------------------------------------------------------------
// Agent Locations (imported)
// ---------------------------------------------------------------------------

export type AdminLocation = {
  id: string;
  businessName: string;
  addressLine: string | null;
  city: string;
  state: string;
  zip: string | null;
  country: string;
  publicPhone: string | null;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
  importKey: string | null;
  createdAt: string;
};

export async function apiListLocations(accessToken: string): Promise<AdminLocation[]> {
  const res = await authFetch('/admin/locations', accessToken);
  return handleResponse<AdminLocation[]>(res);
}

export async function apiImportLocations(
  accessToken: string,
  file: File,
): Promise<{ created: number; updated: number; geocoded: number }> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API}/admin/locations/import`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: fd,
  });
  return handleResponse<{ created: number; updated: number; geocoded: number }>(res);
}

export type LocationInput = {
  businessName: string;
  addressLine?: string;
  city: string;
  state: string;
  zip?: string;
  country?: string;
  publicPhone?: string;
  active?: boolean;
};

export async function apiCreateLocation(
  accessToken: string,
  data: LocationInput,
): Promise<AdminLocation> {
  const res = await authFetch('/admin/locations', accessToken, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return handleResponse<AdminLocation>(res);
}

export async function apiUpdateLocation(
  accessToken: string,
  id: string,
  data: Partial<LocationInput>,
): Promise<AdminLocation> {
  const res = await authFetch(`/admin/locations/${id}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return handleResponse<AdminLocation>(res);
}

export async function apiToggleLocationActive(
  accessToken: string,
  id: string,
  active: boolean,
): Promise<AdminLocation> {
  const res = await authFetch(`/admin/locations/${id}/active`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
  return handleResponse<AdminLocation>(res);
}

export async function apiDeleteLocation(accessToken: string, id: string): Promise<void> {
  const res = await authFetch(`/admin/locations/${id}`, accessToken, { method: 'DELETE' });
  await handleResponse<void>(res);
}

// ---------------------------------------------------------------------------
// Agent Applications (Become an Agent leads)
// ---------------------------------------------------------------------------

export type AgentApplication = {
  id: string;
  applicantType?: string;
  firstName: string;
  lastName: string;
  company: string | null;
  businessStreet: string;
  businessCountry: string;
  businessState: string | null;
  businessCity: string;
  businessZip: string;
  businessPhone: string;
  email: string;
  howFound: string | null;
  howFoundOther: string | null;
  businessType: string | null;
  businessTypeOther: string | null;
  productsOffered: string | null;
  currentlyProvides: boolean;
  currentProvider: string | null;
  currentProviderOther: string | null;
  providedPast: boolean;
  pastProvider: string | null;
  pastProviderOther: string | null;
  declinedBefore: boolean;
  declinedExplain: string | null;
  preferredLanguage: string | null;
  preferredLanguageOther: string | null;
  monthlyVolume: string | null;
  totalLocations: string | null;
  comments: string | null;
  status: string;
  createdAt: string;
};

export async function apiListApplications(accessToken: string): Promise<AgentApplication[]> {
  const res = await authFetch('/admin/agent-applications', accessToken);
  return handleResponse<AgentApplication[]>(res);
}

export async function apiSetApplicationStatus(
  accessToken: string,
  id: string,
  status: string,
): Promise<AgentApplication> {
  const res = await authFetch(`/admin/agent-applications/${id}/status`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return handleResponse<AgentApplication>(res);
}

export async function apiDeleteApplication(accessToken: string, id: string): Promise<void> {
  const res = await authFetch(`/admin/agent-applications/${id}`, accessToken, { method: 'DELETE' });
  await handleResponse<void>(res);
}

// ---------------------------------------------------------------------------
// Form builder
// ---------------------------------------------------------------------------

export async function apiListForms(accessToken: string): Promise<BuilderForm[]> {
  const res = await authFetch('/cms/forms', accessToken);
  return handleResponse<BuilderForm[]>(res);
}

export async function apiGetForm(accessToken: string, id: string): Promise<BuilderForm> {
  const res = await authFetch(`/cms/forms/id/${id}`, accessToken);
  return handleResponse<BuilderForm>(res);
}

export async function apiCreateForm(
  accessToken: string,
  data: Partial<BuilderForm>,
): Promise<BuilderForm> {
  const res = await authFetch('/cms/forms', accessToken, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return handleResponse<BuilderForm>(res);
}

export async function apiUpdateForm(
  accessToken: string,
  id: string,
  data: Partial<BuilderForm>,
): Promise<BuilderForm> {
  const res = await authFetch(`/cms/forms/id/${id}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return handleResponse<BuilderForm>(res);
}

export async function apiDeleteForm(accessToken: string, id: string): Promise<void> {
  const res = await authFetch(`/cms/forms/id/${id}`, accessToken, { method: 'DELETE' });
  await handleResponse<void>(res);
}

export async function apiListSubmissions(accessToken: string, id: string): Promise<FormSubmission[]> {
  const res = await authFetch(`/cms/forms/id/${id}/submissions`, accessToken);
  return handleResponse<FormSubmission[]>(res);
}

export async function apiDeleteSubmission(accessToken: string, submissionId: string): Promise<void> {
  const res = await authFetch(`/cms/forms/submissions/${submissionId}`, accessToken, { method: 'DELETE' });
  await handleResponse<void>(res);
}

// ---------------------------------------------------------------------------
// Partners
// ---------------------------------------------------------------------------

export type Partner = {
  id: string;
  name: string;
  type: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  region?: string;
  featured: boolean;
  active: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
};

export async function apiListPartners(accessToken: string): Promise<Partner[]> {
  const res = await authFetch('/cms/partners/admin', accessToken);
  return handleResponse<Partner[]>(res);
}

export async function apiCreatePartner(accessToken: string, data: Partial<Partner>): Promise<Partner> {
  const res = await authFetch('/cms/partners', accessToken, { method: 'POST', body: JSON.stringify(data) });
  return handleResponse<Partner>(res);
}

export async function apiUpdatePartner(accessToken: string, id: string, data: Partial<Partner>): Promise<Partner> {
  const res = await authFetch(`/cms/partners/${id}`, accessToken, { method: 'PATCH', body: JSON.stringify(data) });
  return handleResponse<Partner>(res);
}

export async function apiDeletePartner(accessToken: string, id: string): Promise<void> {
  const res = await authFetch(`/cms/partners/${id}`, accessToken, { method: 'DELETE' });
  await handleResponse<void>(res);
}

// ---------------------------------------------------------------------------
// Network countries (payout map)
// ---------------------------------------------------------------------------

export type PayoutDetails = {
  mobileMoney?: string[];
  cashPartner?: string;
  bankName?: string;
};

export type NetworkCountry = {
  id: string;
  name: string;
  payoutTypes: string[];
  payoutDetails?: PayoutDetails;
  flagUrl?: string;
  active: boolean;
  updatedAt?: string;
};

export async function apiListNetworkCountries(accessToken: string): Promise<NetworkCountry[]> {
  const res = await authFetch('/cms/network/admin', accessToken);
  return handleResponse<NetworkCountry[]>(res);
}

export async function apiCreateNetworkCountry(accessToken: string, data: Partial<NetworkCountry>): Promise<NetworkCountry> {
  const res = await authFetch('/cms/network', accessToken, { method: 'POST', body: JSON.stringify(data) });
  return handleResponse<NetworkCountry>(res);
}

export async function apiUpdateNetworkCountry(accessToken: string, id: string, data: Partial<NetworkCountry>): Promise<NetworkCountry> {
  const res = await authFetch(`/cms/network/${id}`, accessToken, { method: 'PATCH', body: JSON.stringify(data) });
  return handleResponse<NetworkCountry>(res);
}

export async function apiDeleteNetworkCountry(accessToken: string, id: string): Promise<void> {
  const res = await authFetch(`/cms/network/${id}`, accessToken, { method: 'DELETE' });
  await handleResponse<void>(res);
}

// ─── Agent Due Diligence (lifecycle) ────────────────────────────────────────
export interface DDDocument {
  id: string;
  code: string;
  section: 'DOCUMENTATION' | 'COMPLIANCE' | 'ONGOING';
  label: string;
  present: boolean;
  expiry: string | null;
  status: 'OK' | 'EXPIRING' | 'EXPIRED' | 'MISSING' | 'NA';
  notes: string | null;
  dropboxUrl: string | null;
}

export interface DDFile {
  id: string;
  applicationId: string | null;
  agentName: string;
  entityType: 'BUSINESS' | 'INDIVIDUAL';
  states: string | null;
  regionalOffice: string | null;
  stage: string;
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  onboardedAt: string | null;
  lastReviewedAt: string | null;
  reviewedBy: string | null;
  nextReviewDueAt: string | null;
  createdAt: string;
  updatedAt: string;
  documents?: DDDocument[];
  summary?: Record<string, number>;
  compliant?: boolean;
}

export interface DDDashboard {
  expiring: number;
  expired: number;
  missing: number;
  reviewsDue: number;
}

export async function apiListDDFiles(accessToken: string, stage?: string): Promise<DDFile[]> {
  const q = stage ? `?stage=${encodeURIComponent(stage)}` : '';
  const res = await authFetch(`/admin/agent-dd${q}`, accessToken);
  return handleResponse<DDFile[]>(res);
}

export async function apiDDDashboard(accessToken: string): Promise<DDDashboard> {
  const res = await authFetch('/admin/agent-dd/dashboard', accessToken);
  return handleResponse<DDDashboard>(res);
}

export async function apiGetDDFile(accessToken: string, id: string): Promise<DDFile> {
  const res = await authFetch(`/admin/agent-dd/${id}`, accessToken);
  return handleResponse<DDFile>(res);
}

export interface CreateDDFileInput {
  agentName: string;
  entityType?: string;
  states?: string;
  regionalOffice?: string;
  applicationId?: string;
}

export async function apiCreateDDFile(accessToken: string, data: CreateDDFileInput): Promise<DDFile> {
  const res = await authFetch('/admin/agent-dd', accessToken, { method: 'POST', body: JSON.stringify(data) });
  return handleResponse<DDFile>(res);
}

export async function apiUpdateDDDocument(
  accessToken: string,
  fileId: string,
  code: string,
  data: Partial<Pick<DDDocument, 'present' | 'expiry' | 'notes' | 'dropboxUrl'>>,
): Promise<DDDocument> {
  const res = await authFetch(`/admin/agent-dd/${fileId}/documents/${code}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return handleResponse<DDDocument>(res);
}

export async function apiSetDDStage(accessToken: string, id: string, stage: string): Promise<DDFile> {
  const res = await authFetch(`/admin/agent-dd/${id}/stage`, accessToken, { method: 'PATCH', body: JSON.stringify({ stage }) });
  return handleResponse<DDFile>(res);
}

export async function apiSetDDRisk(accessToken: string, id: string, riskRating: string): Promise<DDFile> {
  const res = await authFetch(`/admin/agent-dd/${id}/risk`, accessToken, { method: 'PATCH', body: JSON.stringify({ riskRating }) });
  return handleResponse<DDFile>(res);
}

export async function apiRecordDDReview(
  accessToken: string,
  id: string,
  reviewedBy: string,
  nextReviewDueAt?: string,
): Promise<DDFile> {
  const res = await authFetch(`/admin/agent-dd/${id}/review`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ reviewedBy, nextReviewDueAt }),
  });
  return handleResponse<DDFile>(res);
}
