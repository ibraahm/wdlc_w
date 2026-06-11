import PDFDocument from 'pdfkit';

type PdfApplication = {
  id: string;
  applicantType: string;
  firstName: string;
  lastName: string;
  company: string | null;
  businessStreet: string;
  businessCountry: string;
  businessState: string | null;
  businessCity: string;
  businessZip: string;
  businessPhone: string;
  email: string;
  howFound: string | null;
  howFoundOther: string | null;
  businessType: string | null;
  businessTypeOther: string | null;
  productsOffered: string | null;
  currentlyProvides: boolean;
  currentProvider: string | null;
  providedPast: boolean;
  pastProvider: string | null;
  declinedBefore: boolean;
  declinedExplain: string | null;
  preferredLanguage: string | null;
  preferredLanguageOther: string | null;
  monthlyVolume: string | null;
  totalLocations: string | null;
  comments: string | null;
  signatureName: string | null;
  signatureTitle: string | null;
  signatureConsent: boolean;
  signatureConsentText: string | null;
  signatureClientTimestamp: Date | null;
  signatureAcceptedAt: Date | null;
  signatureIp: string | null;
  signatureUserAgent: string | null;
  createdAt: Date;
};

function value(input: unknown): string {
  if (input === null || input === undefined || input === '') return 'Not provided';
  if (input instanceof Date) return input.toISOString();
  if (typeof input === 'boolean') return input ? 'Yes' : 'No';
  return String(input);
}

function choice(primary: string | null, other?: string | null): string {
  if (primary === 'Other' && other) return other;
  return value(primary);
}

function addSection(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.8);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#0B1F3A').text(title);
  doc.moveDown(0.2);
  doc.strokeColor('#d9e0e8').moveTo(doc.x, doc.y).lineTo(540, doc.y).stroke();
  doc.moveDown(0.5);
}

function addRow(doc: PDFKit.PDFDocument, label: string, rowValue: unknown) {
  const startY = doc.y;
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#4b5563').text(label, 54, startY, { width: 155 });
  doc.font('Helvetica').fontSize(9).fillColor('#111827').text(value(rowValue), 215, startY, { width: 325 });
  doc.moveDown(0.55);
}

export async function buildAgentApplicationPdf(app: PdfApplication): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 54 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Helvetica-Bold').fontSize(18).fillColor('#0B1F3A').text('World Direct Link');
    doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text('Become an Agent Application');
    doc.moveDown();

    addSection(doc, 'Application');
    addRow(doc, 'Application ID', app.id);
    addRow(doc, 'Submitted', app.createdAt);
    addRow(doc, 'Applicant type', app.applicantType === 'INDIVIDUAL' ? 'Individual' : 'Business');
    addRow(doc, 'Owner / principal', `${app.firstName} ${app.lastName}`.trim());
    addRow(doc, 'Company / business', app.company);
    addRow(doc, 'Business type', choice(app.businessType, app.businessTypeOther));

    addSection(doc, 'Contact & Location');
    addRow(doc, 'Email', app.email);
    addRow(doc, 'Phone', app.businessPhone);
    addRow(doc, 'Street', app.businessStreet);
    addRow(doc, 'City', app.businessCity);
    addRow(doc, 'State', app.businessState);
    addRow(doc, 'ZIP', app.businessZip);
    addRow(doc, 'Country', app.businessCountry);

    addSection(doc, 'Products & Experience');
    addRow(doc, 'Products to offer', app.productsOffered);
    addRow(doc, 'Currently offers money transfer', app.currentlyProvides);
    addRow(doc, 'Current company name', app.currentProvider);
    addRow(doc, 'Offered money transfer in past', app.providedPast);
    addRow(doc, 'Previous company name', app.pastProvider);
    addRow(doc, 'Declined / cancelled before', app.declinedBefore);
    addRow(doc, 'Decline explanation', app.declinedExplain);
    addRow(doc, 'Preferred language', choice(app.preferredLanguage, app.preferredLanguageOther));
    addRow(doc, 'Monthly volume', app.monthlyVolume);
    addRow(doc, 'Total locations', app.totalLocations);
    addRow(doc, 'How found', choice(app.howFound, app.howFoundOther));
    addRow(doc, 'Comments', app.comments);

    addSection(doc, 'Electronic Signature Audit');
    addRow(doc, 'Signature name', app.signatureName);
    addRow(doc, 'Title / role', app.signatureTitle);
    addRow(doc, 'Consent accepted', app.signatureConsent);
    addRow(doc, 'Consent text', app.signatureConsentText);
    addRow(doc, 'Client timestamp', app.signatureClientTimestamp);
    addRow(doc, 'Server accepted at', app.signatureAcceptedAt);
    addRow(doc, 'IP address', app.signatureIp);
    addRow(doc, 'User agent', app.signatureUserAgent);

    doc.moveDown();
    doc.font('Helvetica').fontSize(8).fillColor('#6b7280').text(
      'This document is an application intake record. Approval is subject to World Direct Link review, due diligence, and applicable compliance requirements.',
      { align: 'left' },
    );

    doc.end();
  });
}
