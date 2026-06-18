import { buildAgentApplicationPdf } from './application-pdf';

const app = {
  id: 'app_1234567890',
  applicantType: 'BUSINESS',
  firstName: 'Jordan',
  lastName: 'Sample',
  company: 'Acme Money Services LLC',
  businessStreet: '1 Main St',
  businessCountry: 'US',
  businessState: 'GA',
  businessCity: 'Atlanta',
  businessZip: '30301',
  businessPhone: '+1 555 0100',
  email: 'ops@acme.test',
  howFound: 'Other',
  howFoundOther: 'Referral',
  businessType: 'Other',
  businessTypeOther: 'Convenience store',
  productsOffered: 'Money transfer',
  currentlyProvides: true,
  currentProvider: 'Provider X',
  providedPast: false,
  pastProvider: null,
  declinedBefore: false,
  declinedExplain: null,
  preferredLanguage: 'English',
  preferredLanguageOther: null,
  monthlyVolume: '$50k-$100k',
  totalLocations: '2',
  comments: 'Looking forward to partnering.',
  signatureName: 'Jordan Sample',
  signatureTitle: 'Owner',
  signatureConsent: true,
  signatureConsentText: 'I agree to sign electronically.',
  signatureAcceptedAt: new Date('2026-06-17T00:00:00Z'),
  createdAt: new Date('2026-06-16T00:00:00Z'),
  // present in the DB record but must NOT be rendered:
  signatureIp: '203.0.113.5',
  signatureUserAgent: 'node',
} as any;

function isPdf(buf: Buffer): boolean {
  return buf.length > 0 && buf.subarray(0, 5).toString('latin1') === '%PDF-';
}

describe('buildAgentApplicationPdf', () => {
  it('produces a valid PDF', async () => {
    expect(isPdf(await buildAgentApplicationPdf(app))).toBe(true);
  });

  it('does not reference the signer IP or user-agent in the rendered text', async () => {
    const buf = await buildAgentApplicationPdf(app);
    // pdfkit writes text uncompressed by default, so the literal strings would
    // appear in the byte stream if they were drawn.
    const text = buf.toString('latin1');
    expect(text).not.toContain('203.0.113.5');
    expect(text).not.toContain('User agent');
    expect(text).not.toContain('IP address');
  });
});
