import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // ── Admin user ────────────────────────────────────────────────────────────
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@worlddirectlink.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeThisOnFirstLogin!';
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, name: 'WDLC Administrator', role: 'SUPER_ADMIN' },
  });
  console.log(`Seeded admin: ${admin.email}`);

  // ── Site settings ─────────────────────────────────────────────────────────
  const settings: Record<string, unknown> = {
    siteName: 'World Direct Link',
    legalName: 'World Direct Link, Corp.',
    tagline: 'Your Direct Link Home.',
    nmlsId: '1119263',
    description: 'Licensed money transmitter headquartered in Stone Mountain, Georgia, serving diaspora families with reliable in-person money transfer services.',
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value: JSON.stringify(value) },
      create: { key, value: JSON.stringify(value) },
    });
  }
  console.log('Seeded site settings');

  // ── Header navigation ─────────────────────────────────────────────────────
  const headerCount = await prisma.navItem.count({ where: { location: 'HEADER' } });
  if (headerCount === 0) {
    const about = await prisma.navItem.create({ data: { label: 'About Us', href: '/company-overview', location: 'HEADER', order: 1 } });
    await prisma.navItem.createMany({ data: [
      { label: 'Company Overview', href: '/company-overview', parentId: about.id, location: 'HEADER', order: 1 },
      { label: 'Our Network', href: '/our-network', parentId: about.id, location: 'HEADER', order: 2 },
      { label: 'Licenses & Registrations', href: '/licenses-registrations', parentId: about.id, location: 'HEADER', order: 3 },
      { label: 'Contact Us', href: '/contact', parentId: about.id, location: 'HEADER', order: 4 },
    ]});

    await prisma.navItem.create({ data: { label: 'Services', href: '/services', location: 'HEADER', order: 2 } });

    const agents = await prisma.navItem.create({ data: { label: 'Agents & Partners', href: '/become-agent', location: 'HEADER', order: 3 } });
    await prisma.navItem.createMany({ data: [
      { label: 'Become an Agent', href: '/become-agent', parentId: agents.id, location: 'HEADER', order: 1 },
      { label: 'Agent Resources', href: '/agent-resources', parentId: agents.id, location: 'HEADER', order: 2 },
      { label: 'Partners', href: '/partners', parentId: agents.id, location: 'HEADER', order: 3 },
    ]});

    const compliance = await prisma.navItem.create({ data: { label: 'Compliance', href: '/compliance-overview', location: 'HEADER', order: 4 } });
    await prisma.navItem.createMany({ data: [
      { label: 'Compliance Overview', href: '/compliance-overview', parentId: compliance.id, location: 'HEADER', order: 1 },
      { label: 'Fraud & Consumer Scams', href: '/fraud-consumer-scams', parentId: compliance.id, location: 'HEADER', order: 2 },
      { label: 'Report Suspicious Activity', href: '/report-suspicious-activity', parentId: compliance.id, location: 'HEADER', order: 3 },
      { label: 'Agent Regulatory Notices', href: '/agent-regulatory-notices', parentId: compliance.id, location: 'HEADER', order: 4 },
      { label: 'Law Enforcement Requests', href: '/law-enforcement-requests', parentId: compliance.id, location: 'HEADER', order: 5 },
      { label: 'Compliance Resources', href: '/compliance-resources', parentId: compliance.id, location: 'HEADER', order: 6 },
    ]});
    console.log('Seeded header navigation');
  }

  // ── Sample page ───────────────────────────────────────────────────────────
  await prisma.page.upsert({
    where: { slug: 'about' },
    update: {},
    create: {
      slug: 'about',
      title: 'About World Direct Link',
      description: 'Company overview, network, licenses, and contact details.',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      authorId: admin.id,
      seoTitle: 'About World Direct Link, Corp.',
      seoDescription: 'Company overview, network, licenses, and contact details for World Direct Link.',
      blocks: JSON.stringify([
        { type: 'hero', data: { eyebrow: 'About Us', heading: 'About World Direct Link', sub: 'Connecting communities since 1999.' } },
        { type: 'richText', data: { html: '<p>World Direct Link, Corp. is a licensed money transmitter headquartered in Stone Mountain, Georgia.</p>' } },
        { type: 'table', data: { columns: ['Field', 'Detail'], rows: [['Founded', 'November 2, 1999'], ['Headquarters', 'Stone Mountain, Georgia, USA'], ['Registration', 'FinCEN-registered MSB / NMLS ID 1119263']] } },
      ]),
    },
  });
  console.log('Seeded sample page: /about');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
