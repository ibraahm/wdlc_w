import { PageHero, Section } from '@/components/ui';
import { getCmsPage, cmsMetadata } from '@/lib/cms';

export async function generateMetadata() {
  const page = await getCmsPage('news');
  return cmsMetadata(page, {
    title: 'Newsroom | World Direct Link',
    description: 'Stay up to date on World Direct Link news, community initiatives, and service updates.',
  });
}

export default function NewsroomPage() {
  return (
    <>
      <PageHero
        eyebrow="News & Support"
        title="Newsroom"
        subtitle="Stay up to date on World Direct Link news, community initiatives, and service updates."
      />

      <Section>
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="w-16 h-16 rounded-full bg-[#f5f7fa] border border-[#d9e0e8] flex items-center justify-center mx-auto mb-4 text-2xl">
            📰
          </div>
          <h2 className="text-xl font-bold text-primary-strong">Check back soon</h2>
          <p className="mt-2 text-muted">
            Latest World Direct Link updates and community news will appear here.
          </p>
        </div>
      </Section>
    </>
  );
}
