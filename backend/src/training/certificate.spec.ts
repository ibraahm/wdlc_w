import { buildCertificatePdf, DEFAULT_CERT_LAYOUT } from './certificate';

const sample = {
  learnerName: 'Jordan A. Sample',
  courseTitle: 'AML Essentials',
  category: 'Compliance',
  score: 95,
  completedAt: new Date('2026-06-17T00:00:00Z'),
  branchCode: 'USWDLC',
  certificateId: 'SAMPLE1234',
};

// A valid 1x1 transparent PNG.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

function isPdf(buf: Buffer): boolean {
  return buf.length > 0 && buf.subarray(0, 5).toString('latin1') === '%PDF-';
}

describe('buildCertificatePdf', () => {
  it('renders the built-in design when no template is supplied', async () => {
    const pdf = await buildCertificatePdf(sample);
    expect(isPdf(pdf)).toBe(true);
  });

  it('renders with an uploaded template + field layout', async () => {
    const pdf = await buildCertificatePdf(sample, { image: PNG_1x1, layout: DEFAULT_CERT_LAYOUT });
    expect(isPdf(pdf)).toBe(true);
  });
});
