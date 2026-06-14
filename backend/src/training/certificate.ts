import PDFDocument from 'pdfkit';

export interface CertificateData {
  learnerName: string;
  courseTitle: string;
  category: string;
  score: number;
  completedAt: Date;
  branchCode?: string | null;
  certificateId: string;
}

// A clean, regulator-presentable completion certificate.
export async function buildCertificatePdf(data: CertificateData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margin: 0 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(Buffer.from(c)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const H = doc.page.height;
    const navy = '#0f2742';
    const gold = '#c8960c';

    // Border
    doc.rect(24, 24, W - 48, H - 48).lineWidth(2).stroke(navy);
    doc.rect(34, 34, W - 68, H - 68).lineWidth(0.5).stroke(gold);

    doc.fillColor(navy).font('Helvetica-Bold').fontSize(28)
      .text('World Direct Link, Corp.', 0, 70, { align: 'center' });
    doc.fillColor(gold).font('Helvetica').fontSize(11)
      .text('CERTIFICATE OF COMPLETION', 0, 108, { align: 'center', characterSpacing: 3 });

    doc.fillColor('#444').font('Helvetica').fontSize(13)
      .text('This certifies that', 0, 165, { align: 'center' });

    doc.fillColor(navy).font('Helvetica-Bold').fontSize(30)
      .text(data.learnerName, 0, 190, { align: 'center' });

    doc.fillColor('#444').font('Helvetica').fontSize(13)
      .text('has successfully completed the training course', 0, 240, { align: 'center' });

    doc.fillColor(navy).font('Helvetica-Bold').fontSize(20)
      .text(data.courseTitle, 72, 268, { align: 'center', width: W - 144 });

    doc.fillColor('#444').font('Helvetica').fontSize(12)
      .text(
        `${data.category}  •  Score ${data.score}%  •  ${data.completedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        0, 320, { align: 'center' },
      );

    const footY = H - 96;
    doc.moveTo(120, footY).lineTo(330, footY).lineWidth(0.5).stroke('#999');
    doc.moveTo(W - 330, footY).lineTo(W - 120, footY).stroke('#999');
    doc.fillColor('#666').fontSize(9)
      .text('World Direct Link, Corp. — NMLS #1119263', 120, footY + 6, { width: 210, align: 'center' });
    doc.text(`Certificate ID: ${data.certificateId}`, W - 330, footY + 6, { width: 210, align: 'center' });
    if (data.branchCode) {
      doc.text(`Branch: ${data.branchCode}`, 0, footY + 22, { align: 'center' });
    }

    doc.end();
  });
}
