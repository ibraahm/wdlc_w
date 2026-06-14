import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { apiCourse } from '@/lib/api';
import CourseClient from './CourseClient';

export const dynamic = 'force-dynamic';

export default async function CoursePage({ params }: { params: { slug: string } }) {
  const session = await getSession();
  if (!session) redirect('/login');

  let course;
  try {
    course = await apiCourse(session.accessToken, params.slug);
  } catch {
    notFound();
  }

  return <CourseClient course={course} />;
}
