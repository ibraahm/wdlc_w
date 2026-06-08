import { getSession } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { apiGetForm, apiListSubmissions, type BuilderForm, type FormSubmission } from '@/lib/api';
import FormBuilder from '@/components/FormBuilder';

export default async function FormEditorPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect('/login');

  let form: BuilderForm | null = null;
  let submissions: FormSubmission[] = [];
  try {
    form = await apiGetForm(session.accessToken, params.id);
    submissions = await apiListSubmissions(session.accessToken, params.id);
  } catch {
    notFound();
  }

  if (!form) notFound();

  return <FormBuilder form={form} submissions={submissions} />;
}
