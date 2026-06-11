import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiListNewsPosts, type NewsPost } from '@/lib/api';
import NewsManager from '@/components/NewsManager';

export default async function NewsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let posts: NewsPost[] = [];
  let error = '';

  try {
    posts = await apiListNewsPosts(session.accessToken);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load posts';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">News & Press Releases</h1>
        <p className="text-sm text-gray-500 mt-1">
          Publish news articles and official press releases. Set category to NEWS or PRESS to control which section they appear in on the public site.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : (
        <NewsManager posts={posts} />
      )}
    </div>
  );
}
