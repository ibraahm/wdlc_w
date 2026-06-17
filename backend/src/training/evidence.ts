import PDFDocument from 'pdfkit';

export interface EvidenceRow {
  learnerName: string;
  email: string;
  courseTitle: string;
  category: string;
  score: number;
  passed: boolean;
  attempt: number;
  branchCode: string | null;
  agentState: string | null;
  completedAt: Date;
  acknowledgedAt: Date | null;
}

export interface EvidencePacketData {
  generatedAt: Date;
  generatedBy: string; // admin name/email who exported
  filterSummary: string; // human description of the filters
  rows: EvidenceRow[];
}

// A regulator-presentable packet listing training completions on file.
export async function buildEvidencePacketPdf(data: EvidencePacketData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', layout: 'portrait', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(Buffer.from(c)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const navy = '#0f2742';
    const gold = '#c8960c';
    const left = doc.page.margins.left; // 48
    const usable = doc.page.width - doc.page.margins.left - doc.page.margins.right; // ~516
    const bottomLimit = doc.page.height - 60;

    // Fixed column layout (x offsets from `left`, widths sum to ~516).
    const cols = {
      learner: { x: 0, w: 110, label: 'Learner' },
      course: { x: 110, w: 124, label: 'Course' },
      score: { x: 234, w: 38, label: 'Score' },
      result: { x: 272, w: 44, label: 'Result' },
      branch: { x: 316, w: 50, label: 'Branch' },
      completed: { x: 366, w: 78, label: 'Completed' },
      acknowledged: { x: 444, w: 72, label: 'Acknowl.' },
    };

    const fmtDate = (d: Date) =>
      d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    // --- Header ---
    doc.fillColor(navy).font('Helvetica-Bold').fontSize(20)
      .text('Training Evidence Packet', left, 48);
    doc.fillColor(gold).font('Helvetica').fontSize(11)
      .text('World Direct Link, Corp. — NMLS #1119263', left, 76);

    // --- Metadata block ---
    let y = 100;
    doc.fillColor('#666').font('Helvetica').fontSize(9.5);
    doc.text(
      `Generated: ${data.generatedAt.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      left, y,
    );
    y += 13;
    doc.text(`By: ${data.generatedBy}`, left, y);
    y += 13;
    doc.text(`Filters: ${data.filterSummary}`, left, y, { width: usable });
    y = doc.y + 2;
    doc.text(`Records: ${data.rows.length}`, left, y);
    y = doc.y + 14;

    // Empty state: centered gray message instead of a table.
    if (data.rows.length === 0) {
      doc.fillColor('#999').font('Helvetica').fontSize(12)
        .text('No matching training records.', left, y + 40, { width: usable, align: 'center' });
      doc.end();
      return;
    }

    // Draws the column header row at the current `y`; returns the new y below it.
    const drawColumnHeader = (atY: number): number => {
      doc.rect(left, atY - 2, usable, 16).fill('#f0f2f5'); // light background
      doc.fillColor(navy).font('Helvetica-Bold').fontSize(8);
      for (const c of Object.values(cols)) {
        doc.text(c.label, left + c.x + 2, atY + 2, { width: c.w - 4, lineBreak: false, ellipsis: true });
      }
      const below = atY + 16;
      doc.moveTo(left, below).lineTo(left + usable, below).lineWidth(0.5).stroke(gold);
      return below + 4;
    };

    y = drawColumnHeader(y);

    // --- Rows ---
    doc.font('Helvetica').fontSize(8);
    for (const r of data.rows) {
      // Pagination: start a fresh page + re-draw the header when out of room.
      if (y + 12 > bottomLimit) {
        doc.addPage();
        y = drawColumnHeader(48);
        doc.font('Helvetica').fontSize(8);
      }

      const cell = (text: string, c: { x: number; w: number }, color = '#222') => {
        doc.fillColor(color).text(text, left + c.x + 2, y, {
          width: c.w - 4,
          lineBreak: false,
          ellipsis: true,
        });
      };

      cell(r.learnerName, cols.learner);
      cell(r.courseTitle, cols.course);
      cell(`${r.score}%`, cols.score);
      cell(r.passed ? 'Pass' : 'Fail', cols.result, r.passed ? '#1a7f37' : '#b3261e');
      cell(r.branchCode ?? '—', cols.branch);
      cell(fmtDate(r.completedAt), cols.completed);
      cell(r.acknowledgedAt ? fmtDate(r.acknowledgedAt) : '—', cols.acknowledged);

      y += 13;
    }

    // --- Footer note (inline after the last row) ---
    y += 10;
    if (y + 24 > bottomLimit) {
      doc.addPage();
      y = 48;
    }
    doc.fillColor('#888').font('Helvetica').fontSize(8)
      .text(
        'This document was generated from World Direct Link compliance records and reflects training completions on file as of the generation date.',
        left, y, { width: usable },
      );

    doc.end();
  });
}
