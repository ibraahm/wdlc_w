const API = process.env.API_URL || 'http://localhost:4000/api';

export type HumanVerification = {
  humanVerificationToken?: string;
  humanVerificationAnswer?: string;
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  active?: boolean;
  mustChangePassword?: boolean;
  regionalOfficeId?: string | null;
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

export async function apiLogin(email: string, password: string, verification?: HumanVerification): Promise<AuthResult> {
  const res = await fetch(`${API}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, ...verification }),
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

export async function apiForgotPassword(email: string, verification?: HumanVerification): Promise<{ ok: boolean }> {
  const res = await fetch(`${API}/admin/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, ...verification }),
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
  data: { email: string; name: string; password: string; role?: string; regionalOfficeId?: string },
): Promise<AdminUser> {
  const res = await authFetch('/admin/auth/users', accessToken, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return handleResponse<AdminUser>(res);
}

export async function apiSetUserRegion(
  accessToken: string,
  id: string,
  regionalOfficeId: string | null,
): Promise<{ id: string; regionalOfficeId: string | null }> {
  const res = await authFetch(`/admin/auth/users/${id}/region`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ regionalOfficeId }),
  });
  return handleResponse(res);
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
  signatureName: string | null;
  signatureTitle: string | null;
  signatureConsent: boolean;
  signatureConsentText: string | null;
  signatureClientTimestamp: string | null;
  signatureAcceptedAt: string | null;
  signatureIp: string | null;
  signatureUserAgent: string | null;
  status: string;
  createdAt: string;
  ddFile?: {
    id: string;
    stage: string;
    riskRating: 'LOW' | 'MEDIUM' | 'HIGH' | null;
    updatedAt: string;
  } | null;
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
// Website submissions (read-only inbox for public forms)
// ---------------------------------------------------------------------------

export type WebsiteForm = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  status: string;
  submissionCount?: number;
};

export type SubmissionMessage = {
  id: string;
  kind: 'REPLY' | 'NOTE';
  body: string;
  toEmail?: string | null;
  authorName?: string | null;
  emailError?: string | null;
  createdAt: string;
};

export type WebsiteSubmission = {
  id: string;
  status: string;
  assignee?: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
  messages?: SubmissionMessage[];
};

export async function apiListWebsiteForms(accessToken: string): Promise<WebsiteForm[]> {
  const res = await authFetch('/cms/forms', accessToken);
  return handleResponse<WebsiteForm[]>(res);
}

export async function apiListWebsiteSubmissions(accessToken: string, formId: string): Promise<WebsiteSubmission[]> {
  const res = await authFetch(`/cms/forms/id/${formId}/submissions`, accessToken);
  return handleResponse<WebsiteSubmission[]>(res);
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
  application?: {
    id: string;
    applicantType: string;
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
    signatureName: string | null;
    signatureTitle: string | null;
    signatureConsent: boolean;
    signatureConsentText: string | null;
    signatureClientTimestamp: string | null;
    signatureAcceptedAt: string | null;
    signatureIp: string | null;
    signatureUserAgent: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  agentName: string;
  branchCode?: string | null;
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
  nextReviewDueAt?: string,
): Promise<DDFile> {
  // Reviewer + date are stamped server-side from the signed-in admin.
  const res = await authFetch(`/admin/agent-dd/${id}/review`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ nextReviewDueAt }),
  });
  return handleResponse<DDFile>(res);
}

// ---------------------------------------------------------------------------
// News Posts
// ---------------------------------------------------------------------------

export type NewsPost = {
  id: string;
  title: string;
  slug: string;
  category: string; // NEWS | PRESS
  summary?: string;
  body: string;
  author?: string;
  imageUrl?: string;
  publishedAt?: string;
  status: string; // DRAFT | PUBLISHED
  createdAt: string;
  updatedAt: string;
};

export type NewsPostInput = {
  title: string;
  slug: string;
  category?: string;
  summary?: string;
  body?: string;
  author?: string;
  imageUrl?: string;
  status?: string;
  publishedAt?: string | null;
};

export async function apiListNewsPosts(accessToken: string, category?: string): Promise<NewsPost[]> {
  const qs = category ? `?category=${category}` : '';
  const res = await authFetch(`/cms/news/admin/all${qs}`, accessToken);
  return handleResponse<NewsPost[]>(res);
}

export async function apiCreateNewsPost(accessToken: string, data: NewsPostInput): Promise<NewsPost> {
  const res = await authFetch('/cms/news', accessToken, { method: 'POST', body: JSON.stringify(data) });
  return handleResponse<NewsPost>(res);
}

export async function apiUpdateNewsPost(accessToken: string, id: string, data: Partial<NewsPostInput>): Promise<NewsPost> {
  const res = await authFetch(`/cms/news/${id}`, accessToken, { method: 'PATCH', body: JSON.stringify(data) });
  return handleResponse<NewsPost>(res);
}

export async function apiDeleteNewsPost(accessToken: string, id: string): Promise<{ ok: boolean }> {
  const res = await authFetch(`/cms/news/${id}`, accessToken, { method: 'DELETE' });
  return handleResponse<{ ok: boolean }>(res);
}

// ---------------------------------------------------------------------------
// Navigation menus (header / utility bar / footer)
// ---------------------------------------------------------------------------

export type NavLocation = 'HEADER' | 'UTILITY' | 'FOOTER';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  location: string;
  column: string | null;
  order: number;
  visible: boolean;
  parentId: string | null;
  children?: NavItem[];
}

export interface NavItemInput {
  label: string;
  href: string;
  location?: string;
  column?: string | null;
  order?: number;
  visible?: boolean;
  parentId?: string | null;
}

export async function apiListNav(accessToken: string, location?: string): Promise<NavItem[]> {
  const q = location ? `?location=${encodeURIComponent(location)}` : '';
  const res = await authFetch(`/cms/nav/admin${q}`, accessToken);
  return handleResponse<NavItem[]>(res);
}

export async function apiCreateNavItem(accessToken: string, data: NavItemInput): Promise<NavItem> {
  const res = await authFetch('/cms/nav', accessToken, { method: 'POST', body: JSON.stringify(data) });
  return handleResponse<NavItem>(res);
}

export async function apiUpdateNavItem(accessToken: string, id: string, data: Partial<NavItemInput>): Promise<NavItem> {
  const res = await authFetch(`/cms/nav/${id}`, accessToken, { method: 'PATCH', body: JSON.stringify(data) });
  return handleResponse<NavItem>(res);
}

export async function apiDeleteNavItem(accessToken: string, id: string): Promise<void> {
  const res = await authFetch(`/cms/nav/${id}`, accessToken, { method: 'DELETE' });
  await handleResponse<void>(res);
}

export async function apiReorderNav(accessToken: string, items: { id: string; order: number }[]): Promise<void> {
  const res = await authFetch('/cms/nav/reorder', accessToken, { method: 'PATCH', body: JSON.stringify({ items }) });
  await handleResponse<void>(res);
}

export async function apiSetDDBranchCode(accessToken: string, id: string, branchCode: string): Promise<DDFile> {
  const res = await authFetch(`/admin/agent-dd/${id}/branch-code`, accessToken, { method: 'PATCH', body: JSON.stringify({ branchCode }) });
  return handleResponse<DDFile>(res);
}

// ---------------------------------------------------------------------------
// Teller applications
// ---------------------------------------------------------------------------

export type TellerApplication = {
  id: string;
  branchCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  signatureName?: string | null;
  status: string;
  createdAt: string;
};

export async function apiListTellerApplications(accessToken: string): Promise<TellerApplication[]> {
  const res = await authFetch('/admin/teller-applications', accessToken);
  return handleResponse<TellerApplication[]>(res);
}

export async function apiUpdateTellerApplication(
  accessToken: string,
  id: string,
  data: { branchCode?: string; status?: string },
): Promise<TellerApplication> {
  const res = await authFetch(`/admin/teller-applications/${id}`, accessToken, { method: 'PATCH', body: JSON.stringify(data) });
  return handleResponse<TellerApplication>(res);
}

export async function apiSetSubmissionStatus(accessToken: string, submissionId: string, status: string, assignee?: string): Promise<void> {
  const res = await authFetch(`/cms/forms/submissions/${submissionId}/status`, accessToken, { method: 'PATCH', body: JSON.stringify({ status, assignee }) });
  await handleResponse<void>(res);
}

export async function apiAddSubmissionNote(accessToken: string, submissionId: string, body: string): Promise<SubmissionMessage> {
  const res = await authFetch(`/cms/forms/submissions/${submissionId}/note`, accessToken, { method: 'POST', body: JSON.stringify({ body }) });
  return handleResponse<SubmissionMessage>(res);
}

export async function apiReplySubmission(accessToken: string, submissionId: string, subject: string, body: string): Promise<SubmissionMessage> {
  const res = await authFetch(`/cms/forms/submissions/${submissionId}/reply`, accessToken, { method: 'POST', body: JSON.stringify({ subject, body }) });
  return handleResponse<SubmissionMessage>(res);
}

// ---------------------------------------------------------------------------
// Active agent branches (register of live agents + their portal users)
// ---------------------------------------------------------------------------

export type BranchUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: string; // PRINCIPAL | TELLER
  status: string;
  active: boolean;
  lastLoginAt?: string | null;
};

export type AgentBranch = {
  id: string;
  branchCode: string;
  agentName: string;
  stage: string;
  riskRating: string | null;
  nextReviewDueAt: string | null;
  lastReviewedAt: string | null;
  reviewDue: boolean;
  compliant: boolean;
  summary: Record<string, number>;
  application?: { firstName: string; lastName: string; email: string; businessCity?: string | null; businessState?: string | null } | null;
  users: BranchUser[];
};

export async function apiListBranches(accessToken: string): Promise<AgentBranch[]> {
  const res = await authFetch('/admin/agent-dd/branches', accessToken);
  return handleResponse<AgentBranch[]>(res);
}

export async function apiResendBranchUserSetup(accessToken: string, userId: string): Promise<void> {
  const res = await authFetch(`/admin/agent-dd/users/${userId}/resend-setup`, accessToken, { method: 'POST' });
  await handleResponse<void>(res);
}

export async function apiVerifyBranchUser(accessToken: string, userId: string): Promise<void> {
  const res = await authFetch(`/admin/agent-dd/users/${userId}/verify`, accessToken, { method: 'POST' });
  await handleResponse<void>(res);
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

// ---------------------------------------------------------------------------
// Dashboard cockpit + global search
// ---------------------------------------------------------------------------

export type DashboardSummary = {
  applications: { total: number; new: number; reviewing: number; approved: number; rejected: number; pending: number };
  pipeline: { application: number; underReview: number; ddInProgress: number; active: number; suspended: number; terminated: number };
  branches: { active: number; portalUsers: number; principals: number; tellers: number; unverifiedUsers: number };
  dd: { expired: number; expiring: number; missing: number; reviewsDue: number };
  tellerApplicationsPending: number;
  submissionsOpen: number;
  training: { coursesPublished: number; coursesPastDue: number; completionsTotal: number; completionsPassed: number };
};

export type SearchResult = {
  type: 'Application' | 'DD file' | 'Portal user' | 'Teller app';
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  href: string;
};

export async function apiDashboardSummary(accessToken: string): Promise<DashboardSummary> {
  const res = await authFetch('/admin/dashboard/summary', accessToken);
  return handleResponse<DashboardSummary>(res);
}

export async function apiAdminSearch(accessToken: string, q: string): Promise<{ query: string; results: SearchResult[] }> {
  const res = await authFetch(`/admin/search?q=${encodeURIComponent(q)}`, accessToken);
  return handleResponse<{ query: string; results: SearchResult[] }>(res);
}

// ---------------------------------------------------------------------------
// Agent 360 record view
// ---------------------------------------------------------------------------

export type AgentProfile = {
  ddFile: {
    id: string; agentName: string; branchCode: string | null; entityType: string;
    states: string | null; regionalOffice: string | null; stage: string; riskRating: string | null;
    onboardedAt: string | null; lastReviewedAt: string | null; reviewedBy: string | null; nextReviewDueAt: string | null;
    documents: { code: string; section: string; label: string; present: boolean; status: string; expiry: string | null; notes: string | null; dropboxUrl: string | null }[];
    documentSummary: Record<string, number>;
    compliant: boolean;
  };
  application: Record<string, any> | null;
  users: { id: string; firstName: string; lastName: string; email: string; phone: string | null; role: string; status: string; active: boolean; emailVerified: boolean; lastLoginAt: string | null; createdAt: string }[];
  training: { id: string; courseTitle: string; category: string; score: number; passed: boolean; passingScore: number; attempt: number; completedAt: string; agentId: string }[];
  timeline: { id: string; action: string; createdAt: string; actor: string | null }[];
};

export async function apiAgentProfile(accessToken: string, ddFileId: string): Promise<AgentProfile> {
  const res = await authFetch(`/admin/agent-profile/${ddFileId}`, accessToken);
  return handleResponse<AgentProfile>(res);
}

// ---------------------------------------------------------------------------
// Regional offices
// ---------------------------------------------------------------------------

export type RegionalOffice = {
  id: string;
  code: string;
  name: string;
  states: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  active: boolean;
  agentCount?: number;
  createdAt?: string;
};

export type RegionalOfficeInput = {
  code?: string;
  name?: string;
  states?: string;
  contactEmail?: string;
  contactPhone?: string;
  active?: boolean;
};

export async function apiListRegionalOffices(accessToken: string): Promise<RegionalOffice[]> {
  const res = await authFetch('/admin/regional-offices', accessToken);
  return handleResponse<RegionalOffice[]>(res);
}

export async function apiCreateRegionalOffice(accessToken: string, data: RegionalOfficeInput): Promise<RegionalOffice> {
  const res = await authFetch('/admin/regional-offices', accessToken, { method: 'POST', body: JSON.stringify(data) });
  return handleResponse<RegionalOffice>(res);
}

export async function apiUpdateRegionalOffice(accessToken: string, id: string, data: RegionalOfficeInput): Promise<RegionalOffice> {
  const res = await authFetch(`/admin/regional-offices/${id}`, accessToken, { method: 'PATCH', body: JSON.stringify(data) });
  return handleResponse<RegionalOffice>(res);
}

export async function apiDeleteRegionalOffice(accessToken: string, id: string): Promise<void> {
  const res = await authFetch(`/admin/regional-offices/${id}`, accessToken, { method: 'DELETE' });
  await handleResponse<void>(res);
}

// ---------------------------------------------------------------------------
// Invite + Google sign-in (admin)
// ---------------------------------------------------------------------------

export async function apiInviteUser(
  accessToken: string,
  data: { email: string; name: string; role?: string; regionalOfficeId?: string },
): Promise<AdminUser> {
  const res = await authFetch('/admin/auth/users/invite', accessToken, { method: 'POST', body: JSON.stringify(data) });
  return handleResponse<AdminUser>(res);
}

export async function apiGoogleLogin(credential: string): Promise<AuthResult> {
  const res = await fetch(`${API}/admin/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  return handleResponse<AuthResult>(res);
}

// ---------------------------------------------------------------------------
// Agent → office requests (admin / regional officer queue)
// ---------------------------------------------------------------------------

export type RequestAttachment = { name: string; url: string; kind?: string };
export type RequestMessage = { id: string; authorType: string; authorName: string | null; body: string; createdAt: string };
export type OfficeRequest = {
  id: string; type: string; subject: string; details: string; status: string;
  attachments: RequestAttachment[]; assignee: string | null; branchCode: string | null;
  regionalOfficeId: string | null; createdAt: string; updatedAt: string;
  agent?: { firstName: string; lastName: string; email: string } | null;
  messages?: RequestMessage[];
};

export async function apiListOfficeRequests(accessToken: string, status?: string): Promise<OfficeRequest[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await authFetch(`/admin/requests${qs}`, accessToken);
  return handleResponse<OfficeRequest[]>(res);
}
export async function apiGetOfficeRequest(accessToken: string, id: string): Promise<OfficeRequest> {
  const res = await authFetch(`/admin/requests/${id}`, accessToken);
  return handleResponse<OfficeRequest>(res);
}
export async function apiUpdateOfficeRequest(accessToken: string, id: string, data: { status?: string; assignee?: string }): Promise<OfficeRequest> {
  const res = await authFetch(`/admin/requests/${id}`, accessToken, { method: 'PATCH', body: JSON.stringify(data) });
  return handleResponse<OfficeRequest>(res);
}
export async function apiOfficeRequestMessage(accessToken: string, id: string, body: string): Promise<RequestMessage> {
  const res = await authFetch(`/admin/requests/${id}/messages`, accessToken, { method: 'POST', body: JSON.stringify({ body }) });
  return handleResponse<RequestMessage>(res);
}

// ---------------------------------------------------------------------------
// Risk assessments (per DD file)
// ---------------------------------------------------------------------------

export type RiskFactor = { key: string; label: string; rating: number };
export type RiskAssessment = {
  id: string; ddFileId: string; factors: RiskFactor[]; score: number; rating: string;
  notes: string | null; assessedBy: string | null; createdAt: string;
};

export async function apiListRiskAssessments(accessToken: string, ddFileId: string): Promise<RiskAssessment[]> {
  const res = await authFetch(`/admin/agent-dd/${ddFileId}/risk-assessments`, accessToken);
  return handleResponse<RiskAssessment[]>(res);
}
export async function apiCreateRiskAssessment(accessToken: string, ddFileId: string, data: { factors: RiskFactor[]; notes?: string }): Promise<RiskAssessment> {
  const res = await authFetch(`/admin/agent-dd/${ddFileId}/risk-assessments`, accessToken, { method: 'POST', body: JSON.stringify(data) });
  return handleResponse<RiskAssessment>(res);
}

// ---------------------------------------------------------------------------
// Visitor analytics (web / portal / admin traffic)
// ---------------------------------------------------------------------------

export type AnalyticsSummary = {
  rangeDays: number;
  totalVisits: number;
  uniqueVisitors: number;
  byPortal: { portal: string; visits: number }[];
  topCountries: { country: string; visits: number }[];
  topPaths: { portal: string; path: string; visits: number }[];
  daily: { date: string; visits: number }[];
};

export async function apiGetAnalyticsSummary(accessToken: string, days = 30): Promise<AnalyticsSummary> {
  const res = await authFetch(`/admin/analytics/summary?days=${days}`, accessToken);
  return handleResponse<AnalyticsSummary>(res);
}
