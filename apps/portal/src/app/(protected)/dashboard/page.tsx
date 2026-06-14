import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { apiCourses, type CourseSummary } from '@/lib/api';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let courses: CourseSummary[] = [];
  try {
    courses = await apiCourses(session.accessToken);
  } catch {
    courses = [];
  }

  return <DashboardClient agent={session.agent} courses={courses} />;
}

