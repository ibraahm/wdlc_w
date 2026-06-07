import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { apiListPages } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import { publishPageAction, unpublishPageAction, deletePageAction } from '@/lib/actions';

export default async function PagesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let pages: Awaited<ReturnType<typeof apiListPages>> = [];
  let fetchError = '';

  try {
    pages = await apiListPages(session.accessToken);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load pages';
  }

  const canDelete =
    session.user.role === 'SUPER_ADMIN' || session.user.role === 'COMPLIANCE_OFFICER';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
          <p className="text-gray-500 text-sm mt-1">{pages.length} pages total</p>
        </div>
        <Link
          href="/pages/new"
          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          New Page
        </Link>
      </div>

      {fetchError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {pages.length === 0 && !fetchError ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-sm mb-4">No pages yet.</p>
          <Link
            href="/pages/new"
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create your first page
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/pages/${page.slug}`}
                      className="font-medium text-gray-900 hover:text-primary text-sm"
                    >
                      {page.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{page.slug}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={page.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                    {page.updatedAt
                      ? new Date(page.updatedAt).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/pages/${page.slug}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Edit
                      </Link>

                      {page.status === 'PUBLISHED' ? (
                        <form
                          action={async () => {
                            'use server';
                            await unpublishPageAction(page.slug);
                          }}
                        >
                          <button
                            type="submit"
                            className="text-sm text-yellow-600 hover:text-yellow-800"
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
                            className="text-sm text-green-600 hover:text-green-800"
                          >
                            Publish
                          </button>
                        </form>
                      )}

                      {canDelete && (
                        <form
                          action={async () => {
                            'use server';
                            await deletePageAction(page.slug);
                          }}
                        >
                          <button
                            type="submit"
                            className="text-sm text-red-500 hover:text-red-700"
                            onClick={(e) => {
                              if (!confirm(`Delete "${page.title}"? This cannot be undone.`)) {
                                e.preventDefault();
                              }
                            }}
                          >
                            Delete
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
