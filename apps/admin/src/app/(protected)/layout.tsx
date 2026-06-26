import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AdminLayout from '@/components/AdminLayout';
import { FeedbackProvider } from '@/components/ui/Feedback';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <FeedbackProvider>
      <AdminLayout user={session.user}>{children}</AdminLayout>
    </FeedbackProvider>
  );
}
