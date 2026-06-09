import { PageHero, Section, Prose } from '@/components/ui';
import { company } from '@/lib/site';
import { getCmsPage, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('accessibility');
  return cmsMetadata(page, {
    title: 'Accessibility Statement | World Direct Link',
    description: 'World Direct Link, Corp. is committed to digital accessibility for all users.',
  });
}

export default async function AccessibilityPage() {
  const cmsPage = await getCmsPage('accessibility');
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
          <PageHero title="Accessibility Statement" />
          <Section>
            <div className="max-w-3xl">
              <Prose>
                <p>
                  {company.legalName} is committed to ensuring that this website is accessible to people of
                  all abilities, including those who rely on assistive technologies.
                </p>

                <h2>Our standard</h2>
                <p>
                  We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA. These
                  guidelines explain how to make web content more accessible for people with disabilities and
                  more usable for everyone.
                </p>

                <h2>Measures we take</h2>
                <ul>
                  <li>Semantic, keyboard-navigable page structure;</li>
                  <li>Sufficient color contrast and resizable text;</li>
                  <li>Descriptive labels on forms and interactive controls;</li>
                  <li>Standard system cursor and focus indicators.</li>
                </ul>

                <h2>Ongoing effort</h2>
                <p>
                  Accessibility is an ongoing effort. Some content may not yet fully meet our target standard;
                  we continue to test and improve. Third-party components (such as embedded maps and the
                  reCAPTCHA security check) may not be fully under our control.
                </p>

                <h2>Need help, or found a barrier?</h2>
                <p>
                  If you have difficulty using any part of this website, or need information in an alternative
                  format, please contact us and we will work to provide the information or service you need:
                </p>
                <p>
                  {company.tollFree} · <a href={`mailto:${company.email}`}>{company.email}</a> ·{' '}
                  {company.address.line1}, {company.address.city}, {company.address.state}{' '}
                  {company.address.zip}
                </p>
              </Prose>
            </div>
          </Section>
        </>
      )}
    </>
  );
}
