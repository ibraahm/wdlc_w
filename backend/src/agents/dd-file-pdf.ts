import PDFDocument from 'pdfkit';

// ── Row in the agent's DD file: one tracked document and its current status ──
export interface DdFileDocRow {
  section: 'DOCUMENTATION' | 'COMPLIANCE' | 'ONGOING';
  label: string;
  status: 'OK' | 'EXPIRING' | 'EXPIRED' | 'MISSING' | 'NA';
  present: boolean;
  expiry: Date | null;
}

// ── Everything needed to render the file record ─────────────────────────────
export interface DdFilePdfData {
  generatedAt: Date;
  generatedBy: string;          // admin name/email
  agentName: string;
  entityType: string;           // 'BUSINESS' | 'INDIVIDUAL'
  branchCode?: string | null;
  states?: string | null;
  stage: string;
  riskRating?: string | null;
  onboardedAt?: Date | null;
  lastReviewedAt?: Date | null;
  reviewedBy?: string | null;
  nextReviewDueAt?: Date | null;
  business: { company?: string | null; address?: string | null; email?: string | null; phone?: string | null };
  documents: DdFileDocRow[];
}

// Brand palette (matches certificate.ts).
const NAVY = '#0f2742';
const GOLD = '#c8960c';
const GRAY = '#6b7280';

// Status text colors.
const STATUS_COLOR: Record<DdFileDocRow['status'], string> = {
  OK: '#166534',
  EXPIRING: '#b45309',
  EXPIRED: '#b91c1c',
  MISSING: '#6b7280',
  NA: '#9ca3af',
};

// Date + time, local — used for the "Generated" stamp.
function fmtDateTime(d: Date): string {
  return d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Date only, rendered in UTC so stored date-only values don't drift a day.
function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// Section order + human titles.
const SECTIONS: { key: DdFileDocRow['section']; title: string }[] = [
  { key: 'DOCUMENTATION', title: 'Business and principal documentation' },
  { key: 'COMPLIANCE', title: 'Compliance documentation' },
  { key: 'ONGOING', title: 'Ongoing due diligence' },
];

// A clean, regulator-presentable Agent Due Diligence File. Streams a pdfkit
// document and resolves the assembled Buffer.
export async function buildDdFilePdf(
  data: DdFilePdfData,
  brand?: { logo?: Buffer },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', layout: 'portrait', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(Buffer.from(c)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const M = 48;                          // page margin
    const W = doc.page.width;
    const usable = W - M * 2;              // ~516pt
    const bottom = () => doc.page.height - 60; // pagination threshold

    // ── Header ───────────────────────────────────────────────────────────────
    let titleX = M;
    if (brand?.logo) {
      try {
        doc.image(brand.logo, M, M, { fit: [150, 48] });
        titleX = M + 162; // logo width + gap
      } catch {
        // A bad/unreadable logo shouldn't crash the render.
      }
    }
    const titleW = W - M - titleX;
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(20)
      .text('Agent Due Diligence File', titleX, M, { width: titleW });
    doc.fillColor(GOLD).font('Helvetica').fontSize(10)
      .text('World Direct Link, Corp. — NMLS #1119263', titleX, doc.y + 2, { width: titleW });

    // Thin rule below the header.
    let y = Math.max(doc.y, M + 48) + 12;
    doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.75).stroke('#d1d5db');
    y += 12;

    // ── Metadata line ────────────────────────────────────────────────────────
    doc.fillColor(GRAY).font('Helvetica').fontSize(9)
      .text(`Generated: ${fmtDateTime(data.generatedAt)}  ·  By: ${data.generatedBy}`, M, y, { width: usable });
    y = doc.y + 14;

    // Small key/value helper: bold gray label, then a value beneath.
    const kv = (label: string, value: string, x: number, w: number, atY: number): number => {
      doc.fillColor(GRAY).font('Helvetica-Bold').fontSize(8)
        .text(label.toUpperCase(), x, atY, { width: w });
      doc.fillColor('#111827').font('Helvetica').fontSize(10)
        .text(value || '—', x, doc.y + 1, { width: w });
      return doc.y + 8;
    };

    // Two-column layout for key/value blocks.
    const colW = (usable - 24) / 2;
    const colX = [M, M + colW + 24];

    // Draws rows of key/value pairs across two columns; returns the new y.
    const kvBlock = (rows: [string, string][], startY: number): number => {
      let leftY = startY;
      let rightY = startY;
      rows.forEach((row, i) => {
        const col = i % 2;
        const atY = col === 0 ? leftY : rightY;
        const next = kv(row[0], row[1], colX[col], colW, atY);
        if (col === 0) leftY = next; else rightY = next;
      });
      return Math.max(leftY, rightY);
    };

    // ── Identity block ───────────────────────────────────────────────────────
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(11).text('Agent', M, y, { width: usable });
    y = doc.y + 6;
    y = kvBlock([
      [data.entityType === 'BUSINESS' ? 'Business name' : 'Agent name', data.agentName],
      ['Entity type', data.entityType],
      ['Branch code', data.branchCode || '—'],
      ['State(s)', data.states || '—'],
      ['Company', data.business.company || '—'],
      ['Address', data.business.address || '—'],
      ['Email', data.business.email || '—'],
      ['Phone', data.business.phone || '—'],
    ], y);
    y += 10;

    // ── Status block ─────────────────────────────────────────────────────────
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(11).text('Status', M, y, { width: usable });
    y = doc.y + 6;
    const lastReviewed = data.lastReviewedAt
      ? `${fmtDate(data.lastReviewedAt)}${data.reviewedBy ? ` by ${data.reviewedBy}` : ''}`
      : '—';
    y = kvBlock([
      ['Stage', data.stage],
      ['Risk rating', data.riskRating || 'Not assessed'],
      ['Onboarded', fmtDate(data.onboardedAt)],
      ['Last reviewed', lastReviewed],
      ['Next review due', fmtDate(data.nextReviewDueAt)],
    ], y);
    y += 14;

    // ── Documents ────────────────────────────────────────────────────────────
    // Fixed column x positions within the usable width.
    const cDoc = M;
    const cStatus = M + usable - 150;
    const cExpiry = M + usable - 70;
    const wDoc = cStatus - cDoc - 8;

    // Page-break helper.
    const ensure = (need: number) => {
      if (y + need > bottom()) {
        doc.addPage();
        y = M;
      }
    };

    for (const sec of SECTIONS) {
      const rows = data.documents.filter((d) => d.section === sec.key);
      if (rows.length === 0) continue;

      // Don't orphan a section header at the very bottom.
      ensure(40);
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(11).text(sec.title, M, y, { width: usable });
      y = doc.y + 6;

      // Column headers.
      doc.fillColor(GRAY).font('Helvetica-Bold').fontSize(8);
      doc.text('DOCUMENT', cDoc, y, { width: wDoc, lineBreak: false });
      doc.text('STATUS', cStatus, y, { width: 70, lineBreak: false });
      doc.text('EXPIRY', cExpiry, y, { width: 70, lineBreak: false });
      y = doc.y + 4;
      doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.5).stroke('#e5e7eb');
      y += 5;

      for (const row of rows) {
        ensure(16);
        doc.fillColor('#111827').font('Helvetica').fontSize(8.5)
          .text(row.label, cDoc, y, { width: wDoc, lineBreak: false, ellipsis: true });
        doc.fillColor(STATUS_COLOR[row.status]).font('Helvetica-Bold').fontSize(8.5)
          .text(row.status, cStatus, y, { width: 70, lineBreak: false });
        doc.fillColor('#374151').font('Helvetica').fontSize(8.5)
          .text(fmtDate(row.expiry), cExpiry, y, { width: 70, lineBreak: false });
        y += 14;
      }
      y += 8;
    }

    // ── Footer note ──────────────────────────────────────────────────────────
    ensure(40);
    doc.fillColor(GRAY).font('Helvetica').fontSize(8)
      .text(
        'This file record was generated from World Direct Link compliance records as of the generation date. Documents are retained in the secure DD file.',
        M, y, { width: usable },
      );

    doc.end();
  });
}
