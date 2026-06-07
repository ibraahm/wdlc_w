import { Section, PageHero, SectionHeading, Card, CtaBand, ButtonOnDark } from '@/components/ui';
import { getCmsPage, cmsMetadata } from '@/lib/cms';

export async function generateMetadata() {
  const page = await getCmsPage('agents/partners');
  return cmsMetadata(page, {
    title: 'Our Partners | World Direct Link',
    description: 'World Direct Link works with established correspondent partners, led by Taaj Financial Services, to deliver funds reliably worldwide.',
  });
}

export default function PartnersPage() {
  return (
    <>
      <PageHero eyebrow="Agents & Partners" title="Our Partners" />

      <Section>
        <p className="text-lg text-gray-700 leading-relaxed max-w-3xl">
          World Direct Link works with established correspondent partners to deliver funds reliably
          worldwide. Our lead correspondent, Taaj Financial Services, extends our reach to regions
          where traditional financial institutions are limited. All partners are subject to due
          diligence and ongoing monitoring under our compliance program.
        </p>
      </Section>

      <Section>
        <SectionHeading title="Lead correspondent" />
        <div className="max-w-2xl">
          <Card title="Taaj Financial Services">
            Lead foreign correspondent. Enables reliable delivery to regions where conventional
            banking is limited, including East Africa.
          </Card>
        </div>
      </Section>

      <Section muted>
        <SectionHeading title="Partner network" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-center h-24 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 text-sm"
            >
              [ Partner logo ]
            </div>
          ))}
        </div>
      </Section>

      <CtaBand heading="Interested in partnering?">
        <ButtonOnDark href="/about/contact">Contact Us</ButtonOnDark>
      </CtaBand>
    </>
  );
}
