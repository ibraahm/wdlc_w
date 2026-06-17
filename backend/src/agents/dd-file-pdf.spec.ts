import { buildDdFilePdf, type DdFilePdfData } from './dd-file-pdf';

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const data: DdFilePdfData = {
  generatedAt: new Date('2026-06-17T12:00:00Z'),
  generatedBy: 'compliance@wdlc.test',
  agentName: 'Acme Money Services',
  entityType: 'BUSINESS',
  branchCode: 'USWDLC',
  states: 'GA, FL',
  stage: 'ACTIVE',
  riskRating: 'MEDIUM',
  onboardedAt: new Date('2026-01-10T00:00:00Z'),
  lastReviewedAt: new Date('2026-03-01T00:00:00Z'),
  reviewedBy: 'Officer A',
  nextReviewDueAt: new Date('2027-03-01T00:00:00Z'),
  business: { company: 'Acme LLC', address: '1 Main St · Atlanta, GA 30301 · US', email: 'ops@acme.test', phone: '+1 555 0100' },
  documents: [
    { section: 'DOCUMENTATION', label: 'Signed application', status: 'OK', present: true, expiry: null },
    { section: 'COMPLIANCE', label: 'BSA training (initial)', status: 'MISSING', present: false, expiry: null },
    { section: 'ONGOING', label: 'OFAC re-screen (annual)', status: 'EXPIRED', present: true, expiry: new Date('2025-06-16T00:00:00Z') },
  ],
};

function isPdf(buf: Buffer): boolean {
  return buf.length > 0 && buf.subarray(0, 5).toString('latin1') === '%PDF-';
}

describe('buildDdFilePdf', () => {
  it('renders a PDF without a logo', async () => {
    expect(isPdf(await buildDdFilePdf(data))).toBe(true);
  });

  it('renders a PDF with a brand logo', async () => {
    expect(isPdf(await buildDdFilePdf(data, { logo: PNG_1x1 }))).toBe(true);
  });

  it('renders with no documents', async () => {
    expect(isPdf(await buildDdFilePdf({ ...data, documents: [] }))).toBe(true);
  });
});
