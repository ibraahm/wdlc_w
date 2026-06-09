import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { builderForms } from './seed-forms';
import { homeBlocks } from './seed-home';

const prisma = new PrismaClient();

/**
 * Seed ledger: records which named seed steps have already run (stored as
 * SiteSetting keys prefixed `__seed__:`). Lets us add NEW seed data over time
 * without re-running — and therefore without overwriting — content that was
 * already seeded and possibly edited in the admin. Bump the `version` suffix
 * when a step's data genuinely needs to be re-applied.
 */
async function seedOnce(name: string, fn: () => Promise<void>) {
  const key = `__seed__:${name}`;
  const existing = await prisma.siteSetting.findUnique({ where: { key } });
  if (existing) {
    console.log(`Skipping seed step (already applied): ${name}`);
    return;
  }
  await fn();
  await prisma.siteSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(new Date().toISOString()) },
    create: { key, value: JSON.stringify(new Date().toISOString()) },
  });
  console.log(`Applied seed step: ${name}`);
}

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
    tagline: 'A Quarter Century of Financial',
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

  // ── Utility bar (always-visible links above the primary nav) ───────────────
  // Seeded once: after first run, admin edits/additions are preserved.
  await seedOnce('nav.utility.v1', async () => {
    await prisma.navItem.deleteMany({ where: { location: 'UTILITY' } });
    await prisma.navItem.createMany({ data: [
      { label: 'Licenses', href: '/licenses', location: 'UTILITY', order: 1 },
      { label: 'Report Fraud', href: '/compliance/report', location: 'UTILITY', order: 2 },
      { label: 'Agent Application', href: '/agents/become-an-agent', location: 'UTILITY', order: 3 },
      { label: 'Contact Us', href: '/about/contact', location: 'UTILITY', order: 4 },
    ]});
  });

  // ── Header navigation ─────────────────────────────────────────────────────
  // Seeded once: hrefs match Next.js routes at first run; later admin edits stay.
  await seedOnce('nav.header.v1', async () => {
    await prisma.navItem.deleteMany({ where: { location: 'HEADER' } });

    // About Us is a plain top-level link (no dropdown). Licenses is its own top-level item.
    await prisma.navItem.create({ data: { label: 'About Us', href: '/about', location: 'HEADER', order: 1 } });
    await prisma.navItem.create({ data: { label: 'Licenses', href: '/licenses', location: 'HEADER', order: 2 } });

    await prisma.navItem.create({ data: { label: 'Services', href: '/services', location: 'HEADER', order: 3 } });
    // Services children omitted from header dropdown to keep it clean — accessible via /services page

    const agents = await prisma.navItem.create({ data: { label: 'Agents & Partners', href: '/agents/become-an-agent', location: 'HEADER', order: 4 } });
    await prisma.navItem.createMany({ data: [
      { label: 'Find an Agent', href: '/find-an-agent', parentId: agents.id, location: 'HEADER', order: 1 },
      { label: 'Become an Agent', href: '/agents/become-an-agent', parentId: agents.id, location: 'HEADER', order: 2 },
      { label: 'Agent Resources', href: '/agents/resources', parentId: agents.id, location: 'HEADER', order: 3 },
      { label: 'Partners', href: '/agents/partners', parentId: agents.id, location: 'HEADER', order: 4 },
    ]});

    const compliance = await prisma.navItem.create({ data: { label: 'Compliance', href: '/compliance', location: 'HEADER', order: 5 } });
    await prisma.navItem.createMany({ data: [
      { label: 'Compliance Overview', href: '/compliance', parentId: compliance.id, location: 'HEADER', order: 1 },
      { label: 'Fraud & Consumer Scams', href: '/compliance/fraud', parentId: compliance.id, location: 'HEADER', order: 2 },
      { label: 'Report Suspicious Activity', href: '/compliance/report', parentId: compliance.id, location: 'HEADER', order: 3 },
      { label: 'Agent Regulatory Notices', href: '/compliance/notices', parentId: compliance.id, location: 'HEADER', order: 4 },
      { label: 'Law Enforcement Requests', href: '/compliance/law-enforcement', parentId: compliance.id, location: 'HEADER', order: 5 },
      { label: 'Compliance Resources', href: '/compliance/resources', parentId: compliance.id, location: 'HEADER', order: 6 },
    ]});
  });

  // ── All frontend pages ────────────────────────────────────────────────────
  const pages = [
    { slug: 'home',                      title: 'Home',                                  description: 'Fast, affordable, and reliable money transfers for immigrant, refugee, and diaspora families.' },
    { slug: 'about',                     title: 'About World Direct Link',               description: 'Connecting communities with the people they love since 1999.' },
    { slug: 'licenses',                  title: 'Licenses & Regulatory Disclosures',     description: 'Licensed, registered, and verifiable. NMLS ID 1119263.' },
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
    { slug: 'legal/cookies',             title: 'Cookie Policy',                         description: 'How World Direct Link, Corp. uses cookies and similar technologies.' },
    { slug: 'legal/electronic-communications', title: 'Electronic Communications Consent', description: 'Consent to receive disclosures and communications electronically.' },
    { slug: 'accessibility',             title: 'Accessibility Statement',               description: 'World Direct Link, Corp. is committed to digital accessibility for all users.' },
  ];

  // Additive: only create pages that don't exist yet. Existing pages — including
  // any edited in the admin (home blocks, copy, SEO) — are left untouched, so
  // re-running the seed to add NEW pages never clobbers previously seeded ones.
  let createdPages = 0;
  for (const p of pages) {
    const existing = await prisma.page.findUnique({ where: { slug: p.slug }, select: { id: true } });
    if (existing) continue;
    const blocks = p.slug === 'home' ? JSON.stringify(homeBlocks) : JSON.stringify([]);
    await prisma.page.create({
      data: {
        slug: p.slug,
        title: p.title,
        description: p.description,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        authorId: admin.id,
        seoTitle: p.title + ' | World Direct Link',
        seoDescription: p.description,
        blocks,
      },
    });
    createdPages++;
  }
  console.log(`Seeded ${createdPages} new page(s); ${pages.length - createdPages} already existed`);

  // ── Demo agent locations for the public "Find an Agent" map ────────────────
  // The public map reads only from AgentLocation (single source of truth).
  const demoLocations = [
    { importKey: 'demo-atlanta', businessName: 'Direct Link Money Center — Atlanta', addressLine: '5405 Memorial Dr, Suite A104', city: 'Stone Mountain', state: 'GA', zip: '30083', publicPhone: '404-909-8197', latitude: 33.8053, longitude: -84.1702 },
    { importKey: 'demo-columbus', businessName: 'Horn Express Services', addressLine: '1234 Cleveland Ave', city: 'Columbus', state: 'OH', zip: '43211', publicPhone: '614-555-0142', latitude: 39.9612, longitude: -82.9988 },
    { importKey: 'demo-minneapolis', businessName: 'Cedar Riverside Remittance', addressLine: '500 Cedar Ave S', city: 'Minneapolis', state: 'MN', zip: '55454', publicPhone: '612-555-0188', latitude: 44.9685, longitude: -93.2473 },
    { importKey: 'demo-seattle', businessName: 'Rainier Money Transfer', addressLine: '7301 Martin Luther King Jr Way S', city: 'Seattle', state: 'WA', zip: '98118', publicPhone: '206-555-0173', latitude: 47.5392, longitude: -122.2876 },
  ];

  // Additive: create only missing demo locations so admin edits/removals stick.
  for (const l of demoLocations) {
    const existing = await prisma.agentLocation.findUnique({ where: { importKey: l.importKey }, select: { id: true } });
    if (existing) continue;
    await prisma.agentLocation.create({ data: { ...l, country: 'USA', active: true } });
  }
  console.log(`Seeded demo agent locations (additive)`);

  // ── Form builder: seed the pre-existing public forms ───────────────────────
  for (const f of builderForms) {
    await prisma.form.upsert({
      where: { slug: f.slug },
      update: {
        name: f.name,
        description: f.description ?? null,
        fields: JSON.stringify(f.fields),
        status: f.status,
        submitLabel: f.submitLabel ?? 'Submit',
        successMessage: f.successMessage ?? 'Thank you — your submission has been received.',
        recaptcha: f.recaptcha ?? true,
      },
      create: {
        slug: f.slug,
        name: f.name,
        description: f.description ?? null,
        fields: JSON.stringify(f.fields),
        status: f.status,
        submitLabel: f.submitLabel ?? 'Submit',
        successMessage: f.successMessage ?? 'Thank you — your submission has been received.',
        recaptcha: f.recaptcha ?? true,
      },
    });
  }
  console.log(`Seeded ${builderForms.length} forms`);

  // ── Default site settings (editable in admin → Settings) ───────────────────
  // Draft auto-save timeout for the public agent application (minutes of
  // inactivity before the locally saved draft is considered expired).
  await prisma.siteSetting.upsert({
    where: { key: 'application.draftTimeoutMinutes' },
    update: {},
    create: { key: 'application.draftTimeoutMinutes', value: JSON.stringify(30) },
  });
  console.log('Seeded default site settings');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
