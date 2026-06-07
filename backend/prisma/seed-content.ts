/**
 * One-time content migration: moves the previously hard-coded page copy into
 * CMS blocks so pages render from the CMS and are editable in the admin Puck
 * editor. Safe & idempotent — it only writes blocks for a page whose blocks are
 * still empty, so it never overwrites content authored in the admin.
 *
 * Run:  npx ts-node prisma/seed-content.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const legalName = 'World Direct Link, Corp.';
const shortName = 'World Direct Link';
const nmls = '1119263';
const email = 'wdlc@worlddirectlink.com';
const addr = '5405 Memorial Drive, Suite A104';
const cityStateZip = 'Stone Mountain, GA 30083';

type Block = { type: string; data: Record<string, unknown> };

const content: Record<string, Block[]> = {
  terms: [
    { type: 'Hero', data: { eyebrow: 'Legal', heading: 'Terms of Use' } },
    {
      type: 'RichText',
      data: {
        html: `
<h2>Use of this website</h2>
<p>This website is provided by ${legalName} for informational purposes. By accessing or using this site, you agree to these terms. We reserve the right to update this page at any time; continued use constitutes acceptance of any changes.</p>
<h2>Money transmission services</h2>
<p>Money transfer services are governed by the terms and conditions disclosed to you at the time of your transaction — including the pre-payment disclosure and receipt you receive from your authorized agent. This website does not constitute an offer or agreement to transmit funds.</p>
<h2>Licensing</h2>
<p>${legalName} is a licensed money transmitter. NMLS ID #${nmls}. Money transmission is offered only in states where ${shortName} holds an active license. See our <a href="/about/licenses">Licenses &amp; Registrations</a> page for current license details.</p>
<h2>Limitation of liability</h2>
<p>This website is provided &ldquo;as is&rdquo; without warranties of any kind. ${legalName} is not liable for any damages arising from your use of this site or reliance on its content. Liability arising from money transfer transactions is governed by your transaction agreement and applicable law.</p>
<h2>Governing law</h2>
<p>These terms are governed by the laws of the State of Georgia, without regard to its conflict-of-law provisions.</p>
<h2>Contact</h2>
<p>Questions about these terms? Contact us at <a href="mailto:${email}">${email}</a>.</p>`.trim(),
      },
    },
  ],

  privacy: [
    { type: 'Hero', data: { eyebrow: 'Legal', heading: 'Privacy Policy' } },
    {
      type: 'RichText',
      data: {
        html: `
<p><em>This is a summary privacy notice. The full policy is available upon request.</em></p>
<h2>Information we collect</h2>
<p>We collect information you provide when initiating a money transfer, including your name, address, government-issued ID details, and contact information, as well as information about your recipient. We may also collect transaction details such as amounts, dates, and reference numbers.</p>
<h2>How we use your information</h2>
<p>We use your information to process and deliver money transfers, comply with applicable law (including identity verification, recordkeeping, and reporting requirements under the Bank Secrecy Act and USA PATRIOT Act), prevent fraud, and communicate with you about your transactions.</p>
<h2>Sharing and disclosure</h2>
<p>We may share your information with our authorized agents, foreign correspondent partners necessary to complete your transfer, and regulatory or law enforcement authorities as required by law. We do not sell personal information to third parties for marketing purposes.</p>
<h2>Data security</h2>
<p>We maintain administrative, technical, and physical safeguards to protect your personal information against unauthorized access, disclosure, or misuse. Transaction records are retained for a minimum of five years as required by applicable regulations.</p>
<h2>Contact us</h2>
<p>For privacy questions or to request a copy of our full privacy policy, contact us at <a href="mailto:${email}">${email}</a> or write to:<br/>${legalName}<br/>${addr}<br/>${cityStateZip}</p>`.trim(),
      },
    },
  ],
};

async function main() {
  let written = 0;
  let skipped = 0;
  for (const [slug, blocks] of Object.entries(content)) {
    const page = await prisma.page.findUnique({ where: { slug }, select: { blocks: true } });
    if (!page) {
      console.log(`- ${slug}: page not found, skipping`);
      continue;
    }
    let existing: unknown = [];
    try {
      existing = JSON.parse(page.blocks || '[]');
    } catch {
      existing = [];
    }
    const isEmpty = Array.isArray(existing) ? existing.length === 0 : !existing;
    if (!isEmpty) {
      console.log(`- ${slug}: already has content, leaving untouched`);
      skipped++;
      continue;
    }
    await prisma.page.update({ where: { slug }, data: { blocks: JSON.stringify(blocks) } });
    console.log(`- ${slug}: migrated ${blocks.length} blocks`);
    written++;
  }
  console.log(`Content migration done. Written: ${written}, skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
