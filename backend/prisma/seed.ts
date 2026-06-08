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
  await prisma.navItem.deleteMany({ where: { location: 'UTILITY' } });
  await prisma.navItem.createMany({ data: [
    { label: 'Report Fraud', href: '/compliance/report', location: 'UTILITY', order: 1 },
    { label: 'Contact Us', href: '/about/contact', location: 'UTILITY', order: 2 },
    { label: 'Agent Application', href: '/agents/become-an-agent', location: 'UTILITY', order: 3 },
  ]});
  console.log('Seeded utility navigation');

  // ── Header navigation ─────────────────────────────────────────────────────
  // Always fix nav hrefs to match actual Next.js routes
  await prisma.navItem.deleteMany({ where: { location: 'HEADER' } });

  const about = await prisma.navItem.create({ data: { label: 'About Us', href: '/about', location: 'HEADER', order: 1 } });
  await prisma.navItem.createMany({ data: [
    { label: 'About Us', href: '/about', parentId: about.id, location: 'HEADER', order: 1 },
    { label: 'Company Overview', href: '/about/company', parentId: about.id, location: 'HEADER', order: 2 },
    { label: 'Our Network', href: '/about/network', parentId: about.id, location: 'HEADER', order: 3 },
    { label: 'Licenses & Registrations', href: '/about/licenses', parentId: about.id, location: 'HEADER', order: 4 },
    { label: 'Contact Us', href: '/about/contact', parentId: about.id, location: 'HEADER', order: 5 },
  ]});

  await prisma.navItem.create({ data: { label: 'Services', href: '/services', location: 'HEADER', order: 2 } });
  // Services children omitted from header dropdown to keep it clean — accessible via /services page

  const agents = await prisma.navItem.create({ data: { label: 'Agents & Partners', href: '/agents/become-an-agent', location: 'HEADER', order: 3 } });
  await prisma.navItem.createMany({ data: [
    { label: 'Find an Agent', href: '/find-an-agent', parentId: agents.id, location: 'HEADER', order: 1 },
    { label: 'Become an Agent', href: '/agents/become-an-agent', parentId: agents.id, location: 'HEADER', order: 2 },
    { label: 'Agent Resources', href: '/agents/resources', parentId: agents.id, location: 'HEADER', order: 3 },
    { label: 'Partners', href: '/agents/partners', parentId: agents.id, location: 'HEADER', order: 4 },
  ]});

  const compliance = await prisma.navItem.create({ data: { label: 'Compliance', href: '/compliance', location: 'HEADER', order: 4 } });
  await prisma.navItem.createMany({ data: [
    { label: 'Compliance Overview', href: '/compliance', parentId: compliance.id, location: 'HEADER', order: 1 },
    { label: 'Fraud & Consumer Scams', href: '/compliance/fraud', parentId: compliance.id, location: 'HEADER', order: 2 },
    { label: 'Report Suspicious Activity', href: '/compliance/report', parentId: compliance.id, location: 'HEADER', order: 3 },
    { label: 'Agent Regulatory Notices', href: '/compliance/notices', parentId: compliance.id, location: 'HEADER', order: 4 },
    { label: 'Law Enforcement Requests', href: '/compliance/law-enforcement', parentId: compliance.id, location: 'HEADER', order: 5 },
    { label: 'Compliance Resources', href: '/compliance/resources', parentId: compliance.id, location: 'HEADER', order: 6 },
  ]});
  console.log('Seeded header navigation');

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

  // ── Demo agent locations for the public "Find an Agent" map ────────────────
  const agentPassword = await bcrypt.hash('AgentPass123!', 12);
  const demoAgents = [
    { email: 'atlanta.agent@example.com', firstName: 'Amina', lastName: 'Hassan', businessName: 'Direct Link Money Center — Atlanta', addressLine: '5405 Memorial Dr, Suite A104', city: 'Stone Mountain', state: 'GA', zip: '30083', publicPhone: '404-909-8197', latitude: 33.8053, longitude: -84.1702 },
    { email: 'columbus.agent@example.com', firstName: 'Ahmed', lastName: 'Yusuf', businessName: 'Horn Express Services', addressLine: '1234 Cleveland Ave', city: 'Columbus', state: 'OH', zip: '43211', publicPhone: '614-555-0142', latitude: 39.9612, longitude: -82.9988 },
    { email: 'minneapolis.agent@example.com', firstName: 'Fatima', lastName: 'Omar', businessName: 'Cedar Riverside Remittance', addressLine: '500 Cedar Ave S', city: 'Minneapolis', state: 'MN', zip: '55454', publicPhone: '612-555-0188', latitude: 44.9685, longitude: -93.2473 },
    { email: 'seattle.agent@example.com', firstName: 'Khalid', lastName: 'Ali', businessName: 'Rainier Money Transfer', addressLine: '7301 Martin Luther King Jr Way S', city: 'Seattle', state: 'WA', zip: '98118', publicPhone: '206-555-0173', latitude: 47.5392, longitude: -122.2876 },
  ];

  for (const a of demoAgents) {
    await prisma.agentUser.upsert({
      where: { email: a.email },
      update: {
        businessName: a.businessName, addressLine: a.addressLine, city: a.city,
        state: a.state, zip: a.zip, publicPhone: a.publicPhone,
        latitude: a.latitude, longitude: a.longitude, showOnMap: true, status: 'ACTIVE',
        active: true, emailVerified: true,
      },
      create: {
        email: a.email, passwordHash: agentPassword, firstName: a.firstName, lastName: a.lastName,
        status: 'ACTIVE', active: true, emailVerified: true,
        businessName: a.businessName, addressLine: a.addressLine, city: a.city, state: a.state,
        zip: a.zip, country: 'USA', publicPhone: a.publicPhone,
        latitude: a.latitude, longitude: a.longitude, showOnMap: true,
      },
    });
  }
  console.log(`Seeded ${demoAgents.length} demo agent locations`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
