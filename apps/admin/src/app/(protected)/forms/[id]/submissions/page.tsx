import { getSession } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { apiGetForm, apiListSubmissions, type BuilderForm, type FormSubmission } from '@/lib/api';
import SubmissionsViewer from '@/components/SubmissionsViewer';
import Link from 'next/link';

export default async function FormSubmissionsPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect('/login');

  let form: BuilderForm | null = null;
  let submissions: FormSubmission[] = [];
  try {
    [form, submissions] = await Promise.all([
      apiGetForm(session.accessToken, params.id),
      apiListSubmissions(session.accessToken, params.id),
    ]);
  } catch {
    notFound();
  }

  if (!form) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="admin-page-title">{form.name} — Submissions</h1>
          <p className="admin-page-sub text-sm text-gray-500 mt-1">
            {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href={`/forms/${params.id}`}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          ← Edit form
        </Link>
      </div>

      <SubmissionsViewer formId={params.id} initialSubmissions={submissions} />
    </div>
  );
}
