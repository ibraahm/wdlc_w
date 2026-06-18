import PDFDocument from 'pdfkit';

export interface CertificateData {
  learnerName: string;
  courseTitle: string;
  category: string;
  description?: string | null;
  score: number;
  completedAt: Date;
  branchCode?: string | null;
  certificateId: string;
  address?: string | null; // company address line, shown in the footer
}

// ── Template-driven layout ──────────────────────────────────────────────────
// Admins can upload a background image and position the dynamic fields on it.
// Positions are percentages of the page so they survive any page size and map
// 1:1 to the admin's live HTML preview.
export type CertAlign = 'left' | 'center' | 'right';

export interface CertField {
  show: boolean;
  yPct: number; // vertical anchor, 0–100
  xPct?: number; // horizontal anchor for left/right align, 0–100
  fontSize: number;
  color: string;
  align: CertAlign;
  bold?: boolean;
}

export interface CertLayout {
  name: CertField;
  course: CertField;
  details: CertField;
  certId: CertField;
}

export const DEFAULT_CERT_LAYOUT: CertLayout = {
  name: { show: true, yPct: 38, fontSize: 30, color: '#0f2742', align: 'center', bold: true },
  course: { show: true, yPct: 55, fontSize: 20, color: '#0f2742', align: 'center', bold: true },
  details: { show: true, yPct: 66, fontSize: 12, color: '#444444', align: 'center' },
  certId: { show: true, yPct: 90, fontSize: 9, color: '#666666', align: 'center' },
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function drawField(doc: PDFKit.PDFDocument, f: CertField | undefined, text: string, W: number) {
  if (!f || f.show === false) return;
  const y = (f.yPct / 100) * doc.page.height;
  doc.fillColor(f.color || '#0f2742').font(f.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(f.fontSize);
  // The field anchors at xPct; the alignment decides which edge of the text the
  // anchor is (left edge / centre / right edge). This matches the admin drag
  // editor, where a centred field is centred on the point you drop it.
  const defaultX = f.align === 'left' ? 8 : f.align === 'right' ? 92 : 50;
  const ax = ((f.xPct ?? defaultX) / 100) * W;
  const tw = doc.widthOfString(text);
  const x = f.align === 'left' ? ax : f.align === 'right' ? ax - tw : ax - tw / 2;
  doc.text(text, x, y, { lineBreak: false });
}

// A clean, regulator-presentable completion certificate. When a template image
// is supplied it is used as the full-page background and the dynamic fields are
// placed per the layout; otherwise the built-in World Direct Link design is drawn.
export async function buildCertificatePdf(
  data: CertificateData,
  template?: { image: Buffer; layout: CertLayout },
  brand?: { logo?: Buffer },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margin: 0 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(Buffer.from(c)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const H = doc.page.height;

    if (template?.image) {
      try {
        doc.image(template.image, 0, 0, { width: W, height: H });
      } catch {
        // If the image is unreadable, fall through to a blank page rather than crash.
      }
      const L = template.layout;
      drawField(doc, L.name, data.learnerName, W);
      drawField(doc, L.course, data.courseTitle, W);
      drawField(doc, L.details, `${data.category}  •  Score ${data.score}%  •  ${fmtDate(data.completedAt)}`, W);
      drawField(doc, L.certId, `Certificate ID: ${data.certificateId}${data.branchCode ? `  •  Branch: ${data.branchCode}` : ''}`, W);
      doc.end();
      return;
    }

    // ── Built-in design (clean, corporate; used when no template is uploaded) ──
    const navy = '#0f2742';
    const gold = '#c8960c';
    const ink = '#3a3a3a';
    const cx = W / 2;

    // Double frame with gold corner accents.
    doc.rect(26, 26, W - 52, H - 52).lineWidth(2.5).stroke(navy);
    doc.rect(36, 36, W - 72, H - 72).lineWidth(0.75).stroke(gold);
    const corner = (x: number, y: number, dx: number, dy: number) => {
      doc.moveTo(x, y + dy * 16).lineTo(x, y).lineTo(x + dx * 16, y).lineWidth(2).stroke(gold);
    };
    corner(46, 46, 1, 1); corner(W - 46, 46, -1, 1); corner(46, H - 46, 1, -1); corner(W - 46, H - 46, -1, -1);

    // Brand lockup: uploaded logo, else a typographic wordmark.
    let logoDrawn = false;
    if (brand?.logo) {
      try { doc.image(brand.logo, cx - 100, 52, { fit: [200, 56], align: 'center' }); logoDrawn = true; } catch { /* fall back */ }
    }
    if (!logoDrawn) {
      doc.fillColor(navy).font('Helvetica-Bold').fontSize(26).text('WORLD DIRECT LINK, CORP.', 0, 60, { align: 'center', characterSpacing: 1 });
      doc.fillColor(gold).font('Helvetica').fontSize(8.5).text('MONEY SERVICES COMPLIANCE TRAINING', 0, 92, { align: 'center', characterSpacing: 3 });
    }

    doc.moveTo(cx - 150, 116).lineTo(cx + 150, 116).lineWidth(0.75).stroke(gold);
    doc.fillColor(gold).font('Helvetica-Bold').fontSize(12).text('CERTIFICATE OF COMPLETION', 0, 126, { align: 'center', characterSpacing: 4 });

    doc.fillColor(ink).font('Helvetica').fontSize(12).text('This is to certify that', 0, 166, { align: 'center' });

    doc.fillColor(navy).font('Helvetica-Bold').fontSize(30).text(data.learnerName, 0, 188, { align: 'center' });
    doc.moveTo(cx - 150, 230).lineTo(cx + 150, 230).lineWidth(0.5).stroke('#cbb26a');

    doc.fillColor(ink).font('Helvetica').fontSize(12).text('has successfully completed the training course', 0, 244, { align: 'center' });

    doc.fillColor(navy).font('Helvetica-Bold').fontSize(19).text(data.courseTitle, 80, 268, { align: 'center', width: W - 160 });

    const description = (data.description ?? '').trim();
    if (description) {
      doc.fillColor('#666').font('Helvetica-Oblique').fontSize(10.5)
        .text(description, 130, 296, { align: 'center', width: W - 260, height: 26, ellipsis: true });
    }
    doc.fillColor(ink).font('Helvetica').fontSize(11.5)
      .text(`${data.category}    •    Score ${data.score}%    •    ${fmtDate(data.completedAt)}`, 0, description ? 326 : 318, { align: 'center' });

    // Seal medallion (centered, lower third).
    const sy = 408;
    doc.circle(cx, sy, 30).lineWidth(2).stroke(gold);
    doc.circle(cx, sy, 24).lineWidth(0.6).stroke(gold);
    doc.moveTo(cx - 11, sy + 1).lineTo(cx - 3, sy + 10).lineTo(cx + 13, sy - 10).lineWidth(3).lineJoin('round').stroke(navy);

    // Signature lines flanking the seal.
    const lineY = sy + 8;
    doc.moveTo(110, lineY).lineTo(300, lineY).lineWidth(0.5).stroke('#999');
    doc.moveTo(W - 300, lineY).lineTo(W - 110, lineY).stroke('#999');
    doc.fillColor('#555').font('Helvetica').fontSize(9)
      .text('Compliance Department', 110, lineY + 5, { width: 190, align: 'center' });
    doc.text(`Issued ${fmtDate(data.completedAt)}`, W - 300, lineY + 5, { width: 190, align: 'center' });

    // Footer: NMLS, address, certificate id.
    const address = (data.address ?? '').trim();
    doc.fillColor('#777').font('Helvetica').fontSize(8.5)
      .text(`World Direct Link, Corp.    •    NMLS #1119263${address ? `    •    ${address}` : ''}`, 60, H - 58, { width: W - 120, align: 'center' });
    doc.fillColor('#999').fontSize(8)
      .text(`Certificate ID: ${data.certificateId}${data.branchCode ? `    •    Branch: ${data.branchCode}` : ''}`, 60, H - 46, { width: W - 120, align: 'center' });

    doc.end();
  });
}
