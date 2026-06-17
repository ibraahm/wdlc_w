import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { apiGetCourseCertConfig, apiGetCourse, type CourseCertConfig } from '@/lib/api';
import CertificateDesigner from '@/components/CertificateDesigner';

export const dynamic = 'force-dynamic';

export default async function CourseCertificatePage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!['SUPER_ADMIN', 'COMPLIANCE_OFFICER'].includes(session.user.role)) {
    return <div className="text-sm text-gray-600">You don&apos;t have access to certificate settings.</div>;
  }

  let config: CourseCertConfig | null = null;
  let courseTitle = '';
  let fetchError = '';
  try {
    const [cfg, course] = await Promise.all([
      apiGetCourseCertConfig(session.accessToken, params.id),
      apiGetCourse(session.accessToken, params.id).catch(() => null),
    ]);
    config = cfg;
    courseTitle = course?.title ?? '';
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load certificate settings';
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/training/courses" className="text-sm text-gray-500 hover:text-gray-800">← Courses</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Course Certificate{courseTitle ? ` — ${courseTitle}` : ''}</h1>
        <p className="text-gray-500 text-sm mt-1">
          Set a certificate specific to this course. When saved, it overrides the global default for this course only.
          Use <Link href="/training/certificate" className="underline">the global certificate</Link> to change the default for every course.
        </p>
      </div>
      {fetchError && <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{fetchError}</div>}
      {config && (
        <CertificateDesigner
          initial={{ templateImage: config.templateImage, layout: config.layout }}
          scope="course"
          courseId={params.id}
          hasOverride={config.hasOverride}
        />
      )}
    </div>
  );
}
