import { PageHero, Section, Prose } from '@/components/ui';
import { company } from '@/lib/site';
import { getCmsPage, cmsMetadata } from '@/lib/cms';

export async function generateMetadata() {
  const page = await getCmsPage('privacy');
  return cmsMetadata(page, {
    title: 'Privacy Policy | World Direct Link',
    description: 'Privacy policy for World Direct Link, Corp.',
  });
}

export default function PrivacyPage() {
  return (
    <>
      <PageHero title="Privacy Policy" />

      <Section>
        <div className="max-w-3xl">
          <Prose>
            <p><em>This is a summary privacy notice. The full policy is available upon request.</em></p>

            <h2>Information we collect</h2>
            <p>We collect information you provide when initiating a money transfer, including your name, address, government-issued ID details, and contact information, as well as information about your recipient. We may also collect transaction details such as amounts, dates, and reference numbers.</p>

            <h2>How we use your information</h2>
            <p>We use your information to process and deliver money transfers, comply with applicable law (including identity verification, recordkeeping, and reporting requirements under the Bank Secrecy Act and USA PATRIOT Act), prevent fraud, and communicate with you about your transactions.</p>

            <h2>Sharing and disclosure</h2>
            <p>We may share your information with our authorized agents, foreign correspondent partners necessary to complete your transfer, and regulatory or law enforcement authorities as required by law. We do not sell personal information to third parties for marketing purposes.</p>

            <h2>Data security</h2>
            <p>We maintain administrative, technical, and physical safeguards to protect your personal information against unauthorized access, disclosure, or misuse. Transaction records are retained for a minimum of five years as required by applicable regulations.</p>

            <h2>Contact us</h2>
            <p>
              For privacy questions or to request a copy of our full privacy policy, contact us at{' '}
              <a href={`mailto:${company.email}`}>{company.email}</a> or write to:<br />
              {company.legalName}<br />
              {company.address.line1}<br />
              {company.address.city}, {company.address.state} {company.address.zip}
            </p>
          </Prose>
        </div>
      </Section>
    </>
  );
}
