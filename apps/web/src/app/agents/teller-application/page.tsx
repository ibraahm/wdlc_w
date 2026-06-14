import type { Metadata } from 'next';
import { PageHero, Section } from '@/components/ui';
import TellerApplicationForm from '@/components/TellerApplicationForm';

export const metadata: Metadata = {
  title: 'Teller Application | World Direct Link',
  description: 'Apply to work as a teller at an authorized World Direct Link agent branch.',
};

export default function TellerApplicationPage() {
  return (
    <>
      <PageHero
        eyebrow="Agents & Partners"
        title="Teller Application"
        subtitle="For employees of an existing World Direct Link agent branch. You will need your branch code - ask your agent principal."
      />
      <Section>
        <div className="max-w-2xl">
          <TellerApplicationForm />
        </div>
      </Section>
    </>
  );
}
