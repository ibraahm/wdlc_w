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
  currentProviderOther?: string | null;
  providedPast: boolean;
  pastProvider: string | null;
  pastProviderOther?: string | null;
  declinedBefore: boolean;
  declinedExplain: string | null;
  preferredLanguage: string | null;
  preferredLanguageOther: string | null;
  monthlyVolume: string | null;
  anticipatedDollarVolume?: string | null;
  totalLocations: string | null;
  comments: string | null;
  signatureName: string | null;
  signatureTitle: string | null;
  signatureConsent: boolean;
  signatureConsentText: string | null;
  signatureAcceptedAt: Date | null;
  signatureClientTimestamp: Date | null;
  createdAt: Date;
  // NOTE: signer IP and user-agent are intentionally NOT rendered on this form.
};

const NAVY = '#0f2742';
const GOLD = '#c8960c';
const M = 48;

function fmtDate(d?: Date | null): string {
  return d ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
}

function fmtDateTime(d?: Date | null): string {
  return d
    ? d.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
    : '—';
}

function choice(primary: string | null, other?: string | null): string {
  if (primary === 'Other' && other) return other.trim();
  return (primary ?? '').trim() || '—';
}

function yesNo(flag: boolean, detail?: string | null): string {
  if (!flag) return 'No';
  const d = (detail ?? '').trim();
  return d ? `Yes — ${d}` : 'Yes';
}

// A clean, professional one-page rendering of the agent application form.
// Intentionally excludes signer IP and user-agent (server/network metadata).
export async function buildAgentApplicationPdf(app: PdfApplication, brand?: { logo?: Buffer; address?: string | null }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: M });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(Buffer.from(c)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const right = W - M;
    const contentW = right - M;
    let y = M;

    // ── Header ────────────────────────────────────────────────────────────────
    let logoBottom = M;
    if (brand?.logo) {
      try {
        doc.image(brand.logo, M, M, { fit: [150, 46] });
        logoBottom = M + 46;
      } catch {
        /* ignore unreadable logo */
      }
    }
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(18).text('Agent Application', M, M + 2, { width: contentW, align: 'right' });
    doc.fillColor(GOLD).font('Helvetica').fontSize(9).text(`World Direct Link, Corp.  ·  NMLS #1119263${brand?.address ? `  ·  ${brand.address}` : ''}`, M, M + 25, { width: contentW, align: 'right', lineBreak: false });
    doc.fillColor('#666').font('Helvetica').fontSize(8.5)
      .text(`Application ${app.id.slice(-8).toUpperCase()}   ·   Submitted ${fmtDate(app.createdAt)}`, M, M + 39, { width: contentW, align: 'right' });

    y = Math.max(logoBottom, M + 52) + 8;
    doc.moveTo(M, y).lineTo(right, y).lineWidth(1).strokeColor(NAVY).stroke();
    y += 10;

    // ── Layout helpers ─────────────────────────────────────────────────────────
    const colW = (contentW - 16) / 2;
    const col2X = M + colW + 16;

    function heading(title: string) {
      doc.rect(M, y, contentW, 14).fill(NAVY);
      doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8.5).text(title.toUpperCase(), M + 6, y + 3.8, { characterSpacing: 1 });
      y += 19;
    }

    function fieldAt(x: number, w: number, label: string, val?: string | null): number {
      const v = (val ?? '').toString().trim() || '—';
      doc.fillColor('#8a8a8a').font('Helvetica-Bold').fontSize(6.5).text(label.toUpperCase(), x, y, { width: w, characterSpacing: 0.5 });
      const lh = doc.heightOfString(label.toUpperCase(), { width: w, characterSpacing: 0.5 });
      doc.fillColor('#1a1a1a').font('Helvetica').fontSize(9).text(v, x, y + lh + 0.5, { width: w });
      const vh = doc.heightOfString(v, { width: w });
      return lh + vh + 6;
    }

    function row(l1: string, v1?: string | null, l2?: string, v2?: string | null) {
      const h1 = fieldAt(M, l2 ? colW : contentW, l1, v1);
      const h2 = l2 ? fieldAt(col2X, colW, l2, v2) : 0;
      y += Math.max(h1, h2);
    }

    const address = [
      app.businessStreet,
      [app.businessCity, app.businessState, app.businessZip].filter(Boolean).join(', '),
      app.businessCountry,
    ].filter(Boolean).join(' · ');

    // ── Applicant ──────────────────────────────────────────────────────────────
    heading('Applicant');
    row('Applicant type', app.applicantType === 'INDIVIDUAL' ? 'Individual' : 'Business',
      'Business / legal name', app.company || `${app.firstName} ${app.lastName}`.trim());
    row('Contact name', `${app.firstName} ${app.lastName}`.trim(), 'Preferred language', choice(app.preferredLanguage, app.preferredLanguageOther));
    row('Email', app.email, 'Business phone', app.businessPhone);

    // ── Business location ───────────────────────────────────────────────────────
    heading('Business location');
    row('Business address', address);
    row('Business type', choice(app.businessType, app.businessTypeOther), 'How they found us', choice(app.howFound, app.howFoundOther));

    // ── Operations ──────────────────────────────────────────────────────────────
    heading('Operations');
    row('Products to offer', app.productsOffered, 'Anticipated monthly volume (USD)', app.anticipatedDollarVolume || app.monthlyVolume);
    row('Total locations', app.totalLocations);

    // ── Money-services history ──────────────────────────────────────────────────
    heading('Money-services history');
    row('Currently provides money services', yesNo(app.currentlyProvides, choice(app.currentProvider, app.currentProviderOther) === '—' ? null : choice(app.currentProvider, app.currentProviderOther)),
      'Provided in the past', yesNo(app.providedPast, choice(app.pastProvider, app.pastProviderOther) === '—' ? null : choice(app.pastProvider, app.pastProviderOther)));
    row('Previously declined by a provider', yesNo(app.declinedBefore, app.declinedExplain));
    // Always rendered (with a "—" fallback) so every application — new or
    // legacy — shows the same set of fields.
    row('Additional comments', app.comments);

    // ── Certification & signature (no IP / user-agent) ──────────────────────────
    heading('Certification & electronic signature');
    row('Signed by', [app.signatureName, app.signatureTitle].filter(Boolean).join(' — ') || '—', 'Accepted on', fmtDate(app.signatureAcceptedAt));
    row('Signed on the signer’s device', fmtDateTime(app.signatureClientTimestamp));
    if ((app.signatureConsentText ?? '').trim()) {
      doc.fillColor('#555').font('Helvetica-Oblique').fontSize(8).text(app.signatureConsentText!.trim(), M, y, { width: contentW });
      y += doc.heightOfString(app.signatureConsentText!.trim(), { width: contentW }) + 6;
    }
    doc.fillColor(app.signatureConsent ? '#166534' : '#b91c1c').font('Helvetica-Bold').fontSize(9)
      .text(app.signatureConsent ? '✓ Consent to electronic signature provided' : 'Consent to electronic signature not recorded', M, y);

    // ── Footer ──────────────────────────────────────────────────────────────────
    // Keep it inside the printable area, otherwise pdfkit spills onto a 2nd page.
    const footY = doc.page.height - M - 40;
    doc.fillColor('#999').font('Helvetica').fontSize(7.5)
      .text(
        'This document reproduces the application submitted to World Direct Link, Corp. Approval is subject to review, due diligence, and applicable compliance requirements.',
        M, footY, { width: contentW, align: 'center', lineBreak: false },
      );

    doc.end();
  });
}
