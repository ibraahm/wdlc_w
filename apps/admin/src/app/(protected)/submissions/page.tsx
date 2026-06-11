import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
  apiListWebsiteForms,
  apiListWebsiteSubmissions,
  type WebsiteForm,
  type WebsiteSubmission,
} from '@/lib/api';
import { EmptyState } from '@/components/ui-admin';

type SubmissionRow = {
  form: WebsiteForm;
  submission: WebsiteSubmission;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(formatValue).join(', ');
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function titleize(key: string) {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function primaryLine(data: Record<string, unknown>) {
  const name = formatValue(data.name ?? data.fullName ?? data.firstName);
  const email = formatValue(data.email ?? data.emailAddress);
  const subject = formatValue(data.subject ?? data.reason ?? data.topic);
  return [name !== 'Not provided' ? name : null, email !== 'Not provided' ? email : null, subject !== 'Not provided' ? subject : null]
    .filter(Boolean)
    .join(' - ');
}

export default async function WebsiteSubmissionsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let rows: SubmissionRow[] = [];
  let forms: WebsiteForm[] = [];
  let error = '';

  try {
    forms = await apiListWebsiteForms(session.accessToken);
    const submissionsByForm = await Promise.all(
      forms.map(async (form) => ({
        form,
        submissions: await apiListWebsiteSubmissions(session.accessToken, form.id),
      })),
    );

    rows = submissionsByForm
      .flatMap(({ form, submissions }) => submissions.map((submission) => ({ form, submission })))
      .sort((a, b) => new Date(b.submission.createdAt).getTime() - new Date(a.submission.createdAt).getTime());
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load website submissions';
  }

  const contactCount = rows.filter((row) => row.form.slug.includes('contact')).length;
  const reportCount = rows.filter((row) => row.form.slug.includes('report') || row.form.slug.includes('fraud')).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Website Submissions</h1>
        <p className="admin-section-subtitle">
          Read-only inbox for public website forms. Contact and report submissions stay visible here without exposing the form editor.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Total submissions" value={rows.length} />
            <Stat label="Contact" value={contactCount} />
            <Stat label="Report/Fraud" value={reportCount} />
            <Stat label="Published forms" value={forms.filter((form) => form.status === 'PUBLISHED').length} />
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon="IN"
              title="No website submissions yet"
              description="Messages from the public contact and report forms will appear here after visitors submit them."
            />
          ) : (
            <div className="space-y-4">
              {rows.map(({ form, submission }) => {
                const entries = Object.entries(submission.data ?? {});
                const heading = primaryLine(submission.data) || form.name;

                return (
                  <article key={submission.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-2 border-b border-gray-100 pb-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-semibold text-gray-900">{heading}</h2>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                            {form.name}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                          Submitted {formatDate(submission.createdAt)} from /forms/{form.slug}
                        </p>
                      </div>
                      <span className="w-fit rounded-full border border-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-500">
                        {submission.status}
                      </span>
                    </div>

                    <dl className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {entries.map(([key, value]) => (
                        <div key={key} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{titleize(key)}</dt>
                          <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{formatValue(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="mt-1 text-xs font-medium text-gray-500">{label}</div>
    </div>
  );
}
