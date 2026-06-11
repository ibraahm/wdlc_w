import { PageHero, Section, Prose } from '@/components/ui';
import { company } from '@/lib/site';
import { getCmsPage, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('legal/cookies');
  return cmsMetadata(page, {
    title: 'Cookie Policy | World Direct Link',
    description: 'How World Direct Link, Corp. uses cookies and similar technologies on this website.',
  });
}

export default async function CookiePolicyPage() {
  const cmsPage = await getCmsPage('legal/cookies');
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
          <PageHero title="Cookie Policy" />
          <Section>
            <div className="max-w-3xl">
              <Prose>
                <p>
                  <em>Last updated: {new Date().getFullYear()}.</em> This Cookie Policy explains how{' '}
                  {company.legalName} (&ldquo;we&rdquo;) uses cookies and similar technologies when you
                  visit this website.
                </p>

                <h2>What cookies are</h2>
                <p>
                  Cookies are small text files placed on your device by a website. They are widely used to
                  make websites work, to improve security, and to provide reporting information.
                </p>

                <h2>How we use cookies</h2>
                <p>We use a limited set of cookies and similar technologies:</p>
                <ul>
                  <li>
                    <strong>Strictly necessary</strong> — required for the site to function and to keep it
                    secure. This includes the session and security tokens used by our agent and admin
                    portals.
                  </li>
                  <li>
                    <strong>Security / anti-fraud</strong> — we use Google reCAPTCHA on our public forms to
                    protect against automated abuse. reCAPTCHA may set cookies and collect device
                    information under{' '}
                    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                      Google&apos;s Privacy Policy
                    </a>
                    .
                  </li>
                </ul>
                <p>
                  We do not use this website to set advertising cookies or to sell personal information.
                </p>

                <h2>Managing cookies</h2>
                <p>
                  Most browsers let you refuse or delete cookies through their settings. Blocking strictly
                  necessary cookies may prevent parts of the site (such as the agent or admin portals) from
                  working. For reCAPTCHA, disabling cookies may prevent you from submitting our forms.
                </p>

                <h2>Changes</h2>
                <p>
                  We may update this policy from time to time. Material changes will be posted on this page.
                </p>

                <h2>Contact</h2>
                <p>
                  Questions about this policy: <a href={`mailto:${company.email}`}>{company.email}</a> or{' '}
                  {company.address.line1}, {company.address.city}, {company.address.state}{' '}
                  {company.address.zip}.
                </p>
              </Prose>
            </div>
          </Section>
        </>
      )}
    </>
  );
}
