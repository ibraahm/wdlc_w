import { PageHero, Section, Prose } from '@/components/ui';
import { company } from '@/lib/site';
import { getCmsPage, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('legal/electronic-communications');
  return cmsMetadata(page, {
    title: 'Electronic Communications Consent | World Direct Link',
    description:
      'Consent to receive disclosures and communications electronically from World Direct Link, Corp.',
  });
}

export default async function ElectronicCommunicationsPage() {
  const cmsPage = await getCmsPage('legal/electronic-communications');
  const cmsBlocks =
    Array.isArray(cmsPage?.blocks) && cmsPage.blocks.length > 0
      ? (cmsPage.blocks as { type: string; data: Record<string, unknown> }[])
      : null;
  return (
    <>
      {cmsBlocks ? (
        <BlockRenderer blocks={cmsBlocks} />
      ) : (
        <>
          <PageHero title="Electronic Communications Consent" />
          <Section>
            <div className="max-w-3xl">
              <Prose>
                <p>
                  <em>Last updated: {new Date().getFullYear()}.</em> This Electronic Communications Consent
                  (the &ldquo;E-SIGN Consent&rdquo;) describes how {company.legalName} provides notices,
                  disclosures, and other communications to you electronically. By submitting a form on this
                  website, creating an agent portal account, or otherwise consenting where indicated, you
                  agree to the terms below.
                </p>

                <h2>Your consent</h2>
                <p>
                  You consent to receive communications, agreements, disclosures, and notices
                  (&ldquo;Communications&rdquo;) from us electronically - by email, by messages within our
                  portals, or by posting to this website - rather than on paper. Your consent applies to the
                  Communications associated with the request, account, or service for which you provide it.
                </p>

                <h2>Hardware and software you need</h2>
                <p>To access and retain Communications electronically, you need:</p>
                <ul>
                  <li>a device with internet access and a current web browser;</li>
                  <li>a valid email address that you check regularly;</li>
                  <li>software able to view PDF documents; and</li>
                  <li>the ability to download or print pages for your records.</li>
                </ul>

                <h2>Keeping your information current</h2>
                <p>
                  You are responsible for keeping your email address and contact information up to date. Agent
                  portal users can update their details in their profile; for other inquiries, contact us
                  using the details below.
                </p>

                <h2>Withdrawing consent</h2>
                <p>
                  You may withdraw your consent to receive Communications electronically at any time by
                  contacting us at <a href={`mailto:${company.email}`}>{company.email}</a>. Withdrawing
                  consent may delay or prevent our ability to respond to a request or to provide certain
                  services. Withdrawal is effective only after we have had a reasonable period to act on it.
                </p>

                <h2>Paper copies</h2>
                <p>
                  You may request a paper copy of any Communication by contacting us. We may charge a
                  reasonable fee for paper copies except where prohibited by law.
                </p>

                <h2>Contact</h2>
                <p>
                  {company.legalName}, {company.address.line1}, {company.address.city},{' '}
                  {company.address.state} {company.address.zip} · {company.tollFree} ·{' '}
                  <a href={`mailto:${company.email}`}>{company.email}</a>
                </p>
              </Prose>
            </div>
          </Section>
        </>
      )}
    </>
  );
}
