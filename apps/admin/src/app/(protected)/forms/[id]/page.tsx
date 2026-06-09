import { getSession } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { apiGetForm, apiListSubmissions, type BuilderForm } from '@/lib/api';
import FormBuilder from '@/components/FormBuilder';
import Link from 'next/link';

export default async function FormEditorPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect('/login');

  let form: BuilderForm | null = null;
  let submissionCount = 0;
  try {
    const [f, subs] = await Promise.all([
      apiGetForm(session.accessToken, params.id),
      apiListSubmissions(session.accessToken, params.id),
    ]);
    form = f;
    submissionCount = subs.length;
  } catch {
    notFound();
  }

  if (!form) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="admin-page-title">{form.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            <code className="text-xs bg-gray-100 rounded px-1 py-0.5">/forms/{form.slug}</code>
          </p>
        </div>
        <Link
          href={`/forms/${params.id}/submissions`}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Submissions {submissionCount > 0 && <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">{submissionCount}</span>}
        </Link>
      </div>

      <FormBuilder form={form} />
    </div>
  );
}
