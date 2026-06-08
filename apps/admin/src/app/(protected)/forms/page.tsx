import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiListForms, type BuilderForm } from '@/lib/api';
import FormsManager from '@/components/FormsManager';

export default async function FormsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let forms: BuilderForm[] = [];
  let error = '';

  try {
    forms = await apiListForms(session.accessToken);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load forms';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Forms</h1>
        <p className="text-sm text-gray-500 mt-1">
          Build and manage public forms with the drag-and-drop builder. Each form is
          available on the website at <code>/forms/&lt;slug&gt;</code>.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <FormsManager forms={forms} />
      )}
    </div>
  );
}
