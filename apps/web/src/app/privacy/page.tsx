import { PageHero, Section, Prose } from '@/components/ui';
import { company } from '@/lib/site';
import { getCmsPage, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('privacy');
  return cmsMetadata(page, {
    title: 'Privacy Policy | World Direct Link',
    description: 'Privacy policy for World Direct Link, Corp.',
  });
}

export default async function PrivacyPage() {
  const cmsPage = await getCmsPage('privacy');
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage.blocks.length > 0 ? cmsPage.blocks as {type:string;data:Record<string,unknown>}[] : null;
  return (
    <>
      {cmsBlocks ? <BlockRenderer blocks={cmsBlocks} /> : (
        <>
      <PageHero title="Privacy Policy" />

      <Section>
        <div className="max-w-3xl">
          <Prose>
            <p><em>Last updated: {new Date().getFullYear()}.</em> This Privacy Policy explains how {company.legalName} (&ldquo;we,&rdquo; &ldquo;us&rdquo;) collects, uses, shares, and protects personal information in connection with this website and our services.</p>

            <h2>Information we collect</h2>
            <p>We collect information you provide directly to us, including:</p>
            <ul>
              <li><strong>When you contact us or submit a website form</strong> - your name, email address, phone number, and the contents of your message (for example, support requests, complaints, or fraud reports).</li>
              <li><strong>When you apply to become an agent</strong> - business and principal contact details, business type and history, and related information you provide on the application.</li>
              <li><strong>When you use a money transfer service at an authorized delegate</strong> - your name, address, government-issued ID details, contact information, recipient information, and transaction details. This information is collected by the delegate and maintained through our regulated transaction records, not through this website.</li>
              <li><strong>Automatically</strong> - limited technical data and security cookies as described in our <a href="/legal/cookies">Cookie Policy</a>.</li>
            </ul>

            <h2>How we use your information</h2>
            <p>We use your information to respond to your inquiries and process website-form submissions; to evaluate agent applications; to operate and secure our website and portals; to prevent fraud and abuse; and, for money transfer transactions conducted at our agents, to comply with applicable law - including identity verification, recordkeeping, and reporting requirements under the Bank Secrecy Act and USA PATRIOT Act.</p>

            <h2>Sharing and disclosure</h2>
            <p>We may share your information with service providers who support our operations; with authorized delegates in our network and, for money transfers, the foreign correspondent partners necessary to complete a transfer; and with regulatory or law enforcement authorities as required by law. We do <strong>not</strong> sell personal information to third parties for marketing purposes.</p>

            <h2>Data security</h2>
            <p>We maintain administrative, technical, and physical safeguards designed to protect personal information against unauthorized access, disclosure, or misuse. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.</p>

            <h2>Data retention</h2>
            <p>We retain personal information for as long as needed for the purposes described above and to meet our legal obligations. Money transfer transaction records are retained for at least five years as required by applicable regulations. Website-form submissions are retained for as long as needed to handle your request and then in accordance with our records-retention schedule.</p>

            <h2>Your choices and rights</h2>
            <p>You may request access to, correction of, or deletion of personal information you have provided to us, subject to legal recordkeeping obligations. Depending on your state of residence, you may have additional rights under applicable privacy law. To exercise a right, contact us using the details below. You can manage cookies through your browser as described in our <a href="/legal/cookies">Cookie Policy</a>.</p>

            <h2>Electronic communications</h2>
            <p>When you submit a form or create a portal account, you may consent to receive communications electronically. See our <a href="/legal/electronic-communications">Electronic Communications Consent</a> for details, including how to withdraw consent and request paper copies.</p>

            <h2>Children&apos;s privacy</h2>
            <p>This website is not directed to children, and we do not knowingly collect personal information from children.</p>

            <h2>Changes to this policy</h2>
            <p>We may update this Privacy Policy from time to time. Material changes will be posted on this page with an updated date.</p>

            <h2>Contact us</h2>
            <p>
              For privacy questions or to exercise a privacy right, contact us at{' '}
              <a href={`mailto:${company.email}`}>{company.email}</a> or write to:<br />
              {company.legalName}<br />
              {company.address.line1}<br />
              {company.address.city}, {company.address.state} {company.address.zip}
            </p>
          </Prose>
        </div>
      </Section>
        </>
      )}
    </>
  );
}
