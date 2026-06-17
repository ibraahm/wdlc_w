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
  if (f.align === 'left') {
    const x = ((f.xPct ?? 8) / 100) * W;
    doc.text(text, x, y, { width: W - x, align: 'left', lineBreak: false });
  } else if (f.align === 'right') {
    const x = ((f.xPct ?? 92) / 100) * W;
    doc.text(text, 0, y, { width: x, align: 'right', lineBreak: false });
  } else {
    doc.text(text, 0, y, { width: W, align: 'center', lineBreak: false });
  }
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

    // ── Built-in design (fallback when no template is uploaded) ───────────────
    const navy = '#0f2742';
    const gold = '#c8960c';

    doc.rect(24, 24, W - 48, H - 48).lineWidth(2).stroke(navy);
    doc.rect(34, 34, W - 68, H - 68).lineWidth(0.5).stroke(gold);

    // Brand: the uploaded company logo if available, otherwise the wordmark.
    if (brand?.logo) {
      try {
        doc.image(brand.logo, W / 2 - 110, 46, { fit: [220, 70], align: 'center' });
      } catch {
        doc.fillColor(navy).font('Helvetica-Bold').fontSize(28).text('World Direct Link, Corp.', 0, 70, { align: 'center' });
      }
    } else {
      doc.fillColor(navy).font('Helvetica-Bold').fontSize(28).text('World Direct Link, Corp.', 0, 70, { align: 'center' });
    }
    doc.fillColor(gold).font('Helvetica').fontSize(11)
      .text('CERTIFICATE OF COMPLETION', 0, 124, { align: 'center', characterSpacing: 3 });

    doc.fillColor('#444').font('Helvetica').fontSize(13)
      .text('This certifies that', 0, 168, { align: 'center' });

    doc.fillColor(navy).font('Helvetica-Bold').fontSize(30)
      .text(data.learnerName, 0, 190, { align: 'center' });

    doc.fillColor('#444').font('Helvetica').fontSize(13)
      .text('has successfully completed the training course', 0, 238, { align: 'center' });

    doc.fillColor(navy).font('Helvetica-Bold').fontSize(20)
      .text(data.courseTitle, 72, 264, { align: 'center', width: W - 144 });

    // Optional course description (kept short so the layout stays balanced).
    const description = (data.description ?? '').trim();
    if (description) {
      doc.fillColor('#555').font('Helvetica-Oblique').fontSize(11)
        .text(description, 120, 296, { align: 'center', width: W - 240, height: 30, ellipsis: true, lineGap: 1 });
    }

    doc.fillColor('#444').font('Helvetica').fontSize(12)
      .text(
        `${data.category}  •  Score ${data.score}%  •  ${fmtDate(data.completedAt)}`,
        0, description ? 332 : 322, { align: 'center' },
      );

    const footY = H - 96;
    doc.moveTo(120, footY).lineTo(330, footY).lineWidth(0.5).stroke('#999');
    doc.moveTo(W - 330, footY).lineTo(W - 120, footY).stroke('#999');
    doc.fillColor('#666').fontSize(9)
      .text('World Direct Link, Corp. - NMLS #1119263', 120, footY + 6, { width: 210, align: 'center' });
    doc.text(`Certificate ID: ${data.certificateId}`, W - 330, footY + 6, { width: 210, align: 'center' });
    if (data.branchCode) {
      doc.text(`Branch: ${data.branchCode}`, 0, footY + 22, { align: 'center' });
    }

    doc.end();
  });
}
