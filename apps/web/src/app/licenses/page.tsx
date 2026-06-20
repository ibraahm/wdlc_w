import {
  PageHero,
  Section,
  SectionHeading,
  Callout,
  Card,
  Steps,
  StatStrip,
  ButtonPrimary,
  ButtonSecondary,
} from '@/components/ui';
import { getCmsPage, cmsMetadata } from '@/lib/cms';
import {
  company,
  licenses,
  regulators,
  stateDisclosures,
  licenseDisclosureGeneral,
  activeJurisdictionCount,
} from '@/lib/site';
import LicensesExplorer, { type LicenseRow } from '@/components/LicensesExplorer';

// Verification + regulator links (researched, canonical URLs).
const NMLS_RECORD_URL = `https://www.nmlsconsumeraccess.org/EntityDetails.aspx/COMPANY/${company.nmls}`;
const FINCEN_MSB_URL = 'https://msb.fincen.gov/';
const CFPB_COMPLAINT_URL = 'https://www.consumerfinance.gov/complaint/';
const CFPB_REMITTANCE_URL =
  'https://www.consumerfinance.gov/ask-cfpb/what-is-a-remittance-transfer-and-what-are-my-rights-en-1161/';

// Bump when license data or disclosures change.
const LAST_UPDATED = 'June 20, 2026';

export async function generateMetadata() {
  const page = await getCmsPage('licenses');
  return cmsMetadata(page, {
    title: 'Licenses & Regulatory Disclosures | World Direct Link',
    description:
      'World Direct Link is a FinCEN-registered Money Services Business and a state-licensed money transmitter (NMLS ID 1119263). View our licenses by state, your consumer rights, required disclosures, and how to file a complaint.',
  });
}

export default async function LicensesPage() {
  // Merge license rows with their state regulator contact and any required disclosure.
  const regulatorMap = new Map(regulators.map((r) => [r.state, r.contact]));
  const licenseRows: LicenseRow[] = licenses.map((lic) => ({
    ...lic,
    regulator: regulatorMap.get(lic.state),
    disclosure: stateDisclosures[lic.state],
  }));

  // Organization structured data so the licensing identity is machine-readable.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FinancialService',
    name: company.legalName,
    url: 'https://worlddirectlink.com',
    telephone: company.tollFree,
    foundingDate: '1999-11-02',
    areaServed: 'US',
    identifier: { '@type': 'PropertyValue', propertyID: 'NMLS', value: company.nmls },
    sameAs: [NMLS_RECORD_URL, FINCEN_MSB_URL],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHero
        eyebrow="Licenses & Regulatory Disclosures"
        title="Licenses & Regulatory Disclosures"
        subtitle="Licensed, registered, and independently verifiable. NMLS ID 1119263."
      />

      <Section>
        <StatStrip
          stats={[
            { value: company.nmls, label: 'NMLS Unique ID' },
            { value: String(activeJurisdictionCount), label: 'Licensed Jurisdictions' },
            { value: 'Registered', label: 'FinCEN MSB' },
            { value: '1999', label: 'Trusted Since' },
          ]}
        />

        <div className="mt-10">
          <SectionHeading title="Licenses & Registrations" />
          <p className="max-w-3xl text-lg text-gray-700 leading-relaxed mb-6">
            {company.legalName} is a FinCEN-registered Money Services Business and a state-licensed
            money transmitter. Our NMLS unique identifier is {company.nmls}. You don&rsquo;t have to
            take our word for it — verify our credentials directly with the regulators below.
          </p>
          <div className="mb-8 flex flex-wrap gap-3">
            <ButtonPrimary href={NMLS_RECORD_URL} external>
              Verify on NMLS Consumer Access
            </ButtonPrimary>
            <ButtonSecondary href={FINCEN_MSB_URL} external>
              Search the FinCEN MSB registry
            </ButtonSecondary>
          </div>

          <LicensesExplorer rows={licenseRows} generalDisclosure={licenseDisclosureGeneral} />

          <div className="mt-8">
            <Callout variant="info">
              <em>
                {company.legalName} offers money transmission only in states where it holds an active
                license. License details are current as of publication; please verify the latest
                status on NMLS Consumer Access. Select a state above to view its regulator contact and
                any required consumer disclosure.
              </em>
            </Callout>
          </div>
        </div>
      </Section>

      {/* ── Consumer rights (Remittance Transfer Rule) ─────────────────────── */}
      <Section className="bg-[#f7f5ef]">
        <SectionHeading
          eyebrow="Federal consumer protection"
          title="Your rights when you send money"
          subtitle="International money transfers are protected by the Remittance Transfer Rule (Regulation E), enforced by the Consumer Financial Protection Bureau (CFPB)."
        />
        <div className="grid gap-6 md:grid-cols-3 mt-2">
          <Card title="Clear up-front disclosures">
            Before you pay — and again on your receipt — you receive the exchange rate, all fees and
            taxes, the exact amount your recipient will get, and the date the money will be available.
          </Card>
          <Card title="A window to cancel">
            You generally have at least 30 minutes after paying to cancel a transfer for a full refund
            of the money and fees, as long as it hasn&rsquo;t already been picked up or deposited. The
            exact window is shown on your receipt.
          </Card>
          <Card title="Help if something goes wrong">
            You have 180 days from the disclosed availability date to report a problem or error. We
            investigate promptly (generally within 90 days) and, where required, refund or re-send
            your transfer.
          </Card>
        </div>
        <div className="mt-8">
          <Callout variant="info">
            These are general rights; the disclosures and receipt for your specific transfer always
            govern. Learn more at the{' '}
            <a href={CFPB_REMITTANCE_URL} target="_blank" rel="noopener noreferrer" className="underline font-medium">
              CFPB&rsquo;s guide to remittance transfers
            </a>
            .
          </Callout>
        </div>
      </Section>

      {/* ── Complaints & escalation ────────────────────────────────────────── */}
      <Section>
        <SectionHeading
          eyebrow="We're here to help"
          title="Questions or complaints"
          subtitle="If something isn't right, here's exactly how to get it resolved — in order."
        />
        <Steps
          items={[
            {
              title: 'Contact us first',
              body: (
                <>
                  Our consumer assistance team resolves most issues directly. Call{' '}
                  <strong>{company.tollFree}</strong> or email{' '}
                  <a href={`mailto:${company.emails.compliance}`} className="underline">
                    {company.emails.compliance}
                  </a>
                  . Please have your transaction details ready.
                </>
              ),
            },
            {
              title: 'Escalate to the CFPB',
              body: (
                <>
                  If your issue isn&rsquo;t resolved, submit a complaint to the Consumer Financial
                  Protection Bureau at{' '}
                  <a href={CFPB_COMPLAINT_URL} target="_blank" rel="noopener noreferrer" className="underline">
                    consumerfinance.gov/complaint
                  </a>{' '}
                  or call (855) 411-2372 (TTY/TDD 711).
                </>
              ),
            },
            {
              title: 'Contact your state regulator',
              body: (
                <>
                  Each state&rsquo;s financial regulator is listed with its license in the table above.
                  Several states also require a specific consumer notice — select your state to read it.
                </>
              ),
            },
          ]}
        />
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonPrimary href="/compliance/report">File or report a complaint</ButtonPrimary>
          <ButtonSecondary href="/support/contact">Contact support</ButtonSecondary>
        </div>
      </Section>

      {/* ── Fraud awareness ────────────────────────────────────────────────── */}
      <Section className="bg-[#f7f5ef]">
        <Callout variant="warning">
          <strong>Protect yourself from fraud.</strong> A money transfer is like cash — once funds are
          picked up, they usually cannot be recovered. Never send money to someone you haven&rsquo;t met
          in person, or to claim a prize, loan, job, or unexpected refund. If you believe you are the
          target of a scam, stop and call us immediately at <strong>{company.tollFree}</strong>.
        </Callout>
        <p className="mt-6 text-sm text-gray-500">Last updated: {LAST_UPDATED}.</p>
      </Section>
    </>
  );
}
