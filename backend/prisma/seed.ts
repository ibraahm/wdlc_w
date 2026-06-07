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

  // ── All frontend pages ────────────────────────────────────────────────────
  const pages = [
    { slug: 'home',                      title: 'Home',                                  description: 'Fast, affordable, and reliable money transfers for immigrant, refugee, and diaspora families.' },
    { slug: 'about',                     title: 'About World Direct Link',               description: 'Connecting communities with the people they love since 1999.' },
    { slug: 'about/company',             title: 'Company Overview',                      description: 'A trusted money transmitter built for the communities we serve.' },
    { slug: 'about/network',             title: 'Our Network',                           description: 'Reliable delivery through a vetted correspondent network.' },
    { slug: 'about/licenses',            title: 'Licenses & Registrations',              description: 'Licensed, registered, and verifiable.' },
    { slug: 'about/contact',             title: 'Contact Us',                            description: "We're here to help — reach our headquarters or send us a message." },
    { slug: 'services',                  title: 'Our Services',                          description: 'One link. Every way to deliver.' },
    { slug: 'services/send-money',       title: 'Send Money',                            description: 'Send money quickly and affordably at any authorized WDL agent.' },
    { slug: 'services/cash-pickup',      title: 'Cash Pickup',                           description: 'Recipients can collect funds in U.S. dollars at a participating payout location.' },
    { slug: 'services/bank-deposit',     title: 'Bank Deposit',                          description: "Deliver funds directly to a recipient's bank account where available." },
    { slug: 'services/mobile-wallet',    title: 'Mobile Wallet Payout',                  description: 'Recipients can receive funds to a supported mobile wallet where available.' },
    { slug: 'services/track',            title: 'Track Your Transfer',                   description: 'Check the status of a transfer using your transaction ID.' },
    { slug: 'agents/become-an-agent',    title: 'Become a WDL Agent',                   description: 'Grow with a trusted principal.' },
    { slug: 'agents/resources',          title: 'Agent Resources',                       description: 'Tools and documents authorized World Direct Link agents need to stay compliant.' },
    { slug: 'agents/partners',           title: 'Our Partners',                          description: 'World Direct Link works with established correspondent partners to deliver funds reliably worldwide.' },
    { slug: 'compliance',                title: 'Compliance & Anti-Money Laundering',    description: 'Compliance you can count on.' },
    { slug: 'compliance/fraud',          title: 'Protect Yourself from Fraud',           description: 'Stay alert, stay safe.' },
    { slug: 'compliance/report',         title: 'Report Suspicious Activity',            description: 'Customers, agents, and the public can report directly to our compliance team.' },
    { slug: 'compliance/notices',        title: 'Agent Regulatory Notices',              description: 'Posting requirements and updates for authorized WDL agents.' },
    { slug: 'compliance/law-enforcement',title: 'Law Enforcement Requests',              description: 'World Direct Link cooperates fully with lawful requests from law enforcement.' },
    { slug: 'compliance/resources',      title: 'Compliance Resources',                  description: 'Helpful references for customers, agents, and partners.' },
    { slug: 'news',                      title: 'Newsroom',                              description: 'Stay up to date on World Direct Link news, community initiatives, and service updates.' },
    { slug: 'news/press',                title: 'Press Releases',                        description: 'Official announcements from World Direct Link, Corp.' },
    { slug: 'support/help',              title: 'Help Center',                           description: 'Find answers about sending, receiving, fees, refunds, and your consumer rights.' },
    { slug: 'support/complaint',         title: 'File a Complaint',                      description: 'We take every concern seriously. Submit a complaint or contact your state regulatory agency.' },
    { slug: 'support/contact',           title: 'Contact Support',                       description: "We're here to help with transfers, tracking, refunds, and general questions." },
    { slug: 'privacy',                   title: 'Privacy Policy',                        description: 'Privacy policy for World Direct Link, Corp.' },
    { slug: 'terms',                     title: 'Terms of Use',                          description: 'Terms of use for the World Direct Link, Corp. website.' },
  ];

  for (const p of pages) {
    await prisma.page.upsert({
      where: { slug: p.slug },
      update: { title: p.title, description: p.description },
      create: {
        slug: p.slug,
        title: p.title,
        description: p.description,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        authorId: admin.id,
        seoTitle: p.title + ' | World Direct Link',
        seoDescription: p.description,
        blocks: JSON.stringify([]),
      },
    });
  }
  console.log(`Seeded ${pages.length} pages`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
