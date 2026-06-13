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
  reviewedBy: string,
  nextReviewDueAt?: string,
): Promise<DDFile> {
  const res = await authFetch(`/admin/agent-dd/${id}/review`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ reviewedBy, nextReviewDueAt }),
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
