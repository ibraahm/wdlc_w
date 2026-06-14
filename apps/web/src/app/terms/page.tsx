import { PageHero, Section, Prose } from '@/components/ui';
import { company } from '@/lib/site';
import { getCmsPage, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('terms');
  return cmsMetadata(page, {
    title: 'Terms of Use | World Direct Link',
    description: 'Terms of use for the World Direct Link, Corp. website.',
  });
}

export default async function TermsPage() {
  const cmsPage = await getCmsPage('terms');
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage.blocks.length > 0 ? cmsPage.blocks as {type:string;data:Record<string,unknown>}[] : null;
  return (
    <>
      {cmsBlocks ? <BlockRenderer blocks={cmsBlocks} /> : (
        <>
      <PageHero title="Terms of Use" />

      <Section>
        <div className="max-w-3xl">
          <Prose>
            <h2>Use of this website</h2>
            <p>This website is provided by {company.legalName} for informational purposes. By accessing or using this site, you agree to these terms. We reserve the right to update this page at any time; continued use constitutes acceptance of any changes.</p>

            <h2>Money transmission services</h2>
            <p>Money transfer services are governed by the terms and conditions disclosed to you at the time of your transaction - including the pre-payment disclosure and receipt you receive from your authorized delegate. This website does not constitute an offer or agreement to transmit funds.</p>

            <h2>Licensing</h2>
            <p>{company.legalName} is a licensed money transmitter. NMLS ID #{company.nmls}. Money transmission is offered only in states where {company.shortName} holds an active license. See our <a href="/licenses">Licenses &amp; Regulatory Disclosures</a> page for current license details.</p>

            <h2>Limitation of liability</h2>
            <p>This website is provided &ldquo;as is&rdquo; without warranties of any kind. {company.legalName} is not liable for any damages arising from your use of this site or reliance on its content. Liability arising from money transfer transactions is governed by your transaction agreement and applicable law.</p>

            <h2>Governing law</h2>
            <p>These terms are governed by the laws of the State of Georgia, without regard to its conflict-of-law provisions.</p>

            <h2>Contact</h2>
            <p>Questions about these terms? Contact us at <a href={`mailto:${company.email}`}>{company.email}</a>.</p>
          </Prose>
        </div>
      </Section>
        </>
      )}
    </>
  );
}
