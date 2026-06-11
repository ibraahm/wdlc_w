import {
  PageHero,
  Section,
  SectionHeading,
  Callout,
  ButtonPrimary,
} from '@/components/ui';
import { getCmsPage, cmsMetadata } from '@/lib/cms';
import { licenses, regulators, stateDisclosures, licenseDisclosureGeneral } from '@/lib/site';
import LicensesExplorer, { type LicenseRow } from '@/components/LicensesExplorer';

export async function generateMetadata() {
  const page = await getCmsPage('licenses');
  return cmsMetadata(page, {
    title: 'Licenses & Regulatory Disclosures | World Direct Link',
    description:
      'World Direct Link is a FinCEN-registered Money Services Business and a state-licensed money transmitter (NMLS ID 1119263). View our licenses by state and required consumer disclosures.',
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

  return (
    <>
      <PageHero
        eyebrow="Licenses & Regulatory Disclosures"
        title="Licenses & Regulatory Disclosures"
        subtitle="Licensed, registered, and verifiable. NMLS ID 1119263."
      />

      <Section>
        <SectionHeading title="Licenses & Registrations" />
        <p className="max-w-3xl text-lg text-gray-700 leading-relaxed mb-6">
          World Direct Link, Corp. is a FinCEN-registered Money Services Business and a
          state-licensed money transmitter. Our NMLS unique identifier is 1119263. You
          can verify our licenses on the NMLS Consumer Access website.
        </p>
        <div className="mb-8">
          <ButtonPrimary href="https://www.nmlsconsumeraccess.org" external>
            Verify on NMLS Consumer Access
          </ButtonPrimary>
        </div>

        <LicensesExplorer rows={licenseRows} generalDisclosure={licenseDisclosureGeneral} />

        <div className="mt-8">
          <Callout variant="info">
            <em>
              World Direct Link, Corp. offers money transmission only in states where it
              holds an active license. License details are current as of publication;
              please verify the latest status on NMLS Consumer Access. Select a state above
              to view its regulator contact and any required consumer disclosure.
            </em>
          </Callout>
        </div>
      </Section>
    </>
  );
}
