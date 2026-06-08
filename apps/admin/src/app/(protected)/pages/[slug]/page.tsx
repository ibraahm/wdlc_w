import { getSession } from '@/lib/auth';
import { apiGetPage } from '@/lib/api';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import PageForm from '@/components/PageForm';
import StatusBadge from '@/components/StatusBadge';
import { publishPageAction, unpublishPageAction, deletePageAction } from '@/lib/actions';
import DeletePageButton from '@/components/DeletePageButton';

interface Props {
  params: { slug: string };
}

export default async function EditPagePage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect('/login');

  let page: Awaited<ReturnType<typeof apiGetPage>>;
  try {
    page = await apiGetPage(session.accessToken, params.slug);
  } catch {
    notFound();
  }

  const canDelete =
    session.user.role === 'SUPER_ADMIN' || session.user.role === 'COMPLIANCE_OFFICER';

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/pages" className="text-sm text-gray-500 hover:text-primary">
              Pages
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-900">{page.title}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{page.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={page.status} />
            <span className="text-sm text-gray-400 font-mono">/{page.slug}</span>
            <a
              href={`${process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000'}/${page.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-700 underline"
            >
              View on site ↗
            </a>
          </div>
        </div>

        {/* Status controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {page.status === 'PUBLISHED' ? (
            <form
              action={async () => {
                'use server';
                await unpublishPageAction(page.slug);
              }}
            >
              <button
                type="submit"
                className="px-4 py-2 border border-yellow-300 text-yellow-700 text-sm font-medium rounded-lg hover:bg-yellow-50 transition-colors"
              >
                Unpublish
              </button>
            </form>
          ) : (
            <form
              action={async () => {
                'use server';
                await publishPageAction(page.slug);
              }}
            >
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Publish
              </button>
            </form>
          )}

          {canDelete && (
            <DeletePageButton
              slug={page.slug}
              title={page.title}
              className="px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
              action={async () => {
                'use server';
                await deletePageAction(page.slug);
              }}
            />
          )}
        </div>
      </div>

      <PageForm page={page} mode="edit" />
    </div>
  );
}
