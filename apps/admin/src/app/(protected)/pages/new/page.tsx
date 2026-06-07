import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PageForm from '@/components/PageForm';

export default async function NewPagePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Page</h1>
        <p className="text-gray-500 text-sm mt-1">Create a new CMS page.</p>
      </div>
      <PageForm mode="create" />
    </div>
  );
}
