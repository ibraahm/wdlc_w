import { PageHero, Section, Callout, ButtonPrimary } from '@/components/ui';
import { licenses } from '@/lib/site';

export const metadata = {
  title: 'Licenses & Registrations | World Direct Link',
  description:
    'World Direct Link, Corp. is a FinCEN-registered Money Services Business and state-licensed money transmitter. NMLS ID 1119263.',
};

export default function LicensesPage() {
  return (
    <>
      <PageHero
        eyebrow="About Us"
        title="Licenses & Registrations"
        subtitle="Licensed, registered, and verifiable."
      />

      <Section>
        <p className="max-w-3xl text-lg text-gray-700 leading-relaxed">
          World Direct Link, Corp. is a FinCEN-registered Money Services Business and a
          state-licensed money transmitter. Our NMLS unique identifier is 1119263. You
          can verify our licenses on the NMLS Consumer Access website.
        </p>

        <div className="mt-8">
          <ButtonPrimary href="https://www.nmlsconsumeraccess.org" external>
            Verify on NMLS Consumer Access
          </ButtonPrimary>
        </div>

        <div className="mt-10 overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left font-semibold text-gray-900">State</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-900">
                  License / Registration #
                </th>
                <th className="px-5 py-3 text-left font-semibold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {licenses.map((lic) => (
                <tr key={lic.state} className="odd:bg-white even:bg-gray-50">
                  <td className="px-5 py-3 text-gray-900">{lic.state}</td>
                  <td className="px-5 py-3 text-gray-700">{lic.number}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8">
          <Callout variant="info">
            <em>
              World Direct Link, Corp. offers money transmission only in states where it
              holds an active license. License details are current as of publication;
              please verify the latest status on NMLS Consumer Access.
            </em>
          </Callout>
        </div>
      </Section>
    </>
  );
}
