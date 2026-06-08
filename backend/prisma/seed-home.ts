// Default home page content in Puck format. Kept in sync with
// apps/web/src/lib/homeBlocks.ts (the runtime fallback). Seeded into the `home`
// CMS page so it renders and is editable in the admin Puck editor.
export const homeBlocks = {
  root: { props: {} },
  content: [
    {
      type: 'HomeHero',
      props: {
        eyebrow: 'Global Money Transfer · Est. 1999 · NMLS 1119263',
        headingHtml: 'Connecting<br>the World,<br><em>since 1999.</em>',
        primaryText: 'Send Money Now',
        primaryHref: '/find-an-agent',
        secondaryText: 'Become an Agent',
        secondaryHref: '/agents/become-an-agent',
        backgroundImage: '',
        stats: [
          { value: '1999', label: 'Founded' },
          { value: '1M+', label: 'Customers' },
          { value: '50+', label: 'Countries' },
        ],
      },
    },
    {
      type: 'HomeAbout',
      props: {
        label: 'Our Story',
        headingHtml: 'Trusted by Families <em>Across the Globe</em>',
        body: 'World Direct Link, Corp. has been connecting people with their loved ones since 1999. From our headquarters in Stone Mountain, Georgia, we operate a network of licensed agents across North America, Africa, Europe, the Middle East, and Asia.\nWe are a federally registered Money Services Business (MSB), licensed in all required states, and committed to the highest standards of compliance, security, and customer service.',
        image: '',
        stats: [
          { title: 'Same-Day Transfers', desc: 'Our signature quick service, now even faster.' },
          { title: 'Trusted Service', desc: "The reliability you've known for decades." },
          { title: 'Global Network', desc: 'Our established worldwide payout network.' },
        ],
        buttonText: 'Learn More',
        buttonHref: '/about',
      },
    },
    {
      type: 'NetworkMap',
      props: {
        label: 'Payout Network',
        headingHtml: 'Where Your <em>Money Can Go</em>',
      },
    },
    {
      type: 'HomeWhy',
      props: {
        label: 'Why World Direct Link',
        headingHtml: 'Built on Trust, <em>Driven by Purpose</em>',
        items: [
          { title: 'Speed', desc: 'Most transfers complete within minutes. Real-time tracking keeps senders and recipients informed every step of the way.' },
          { title: 'Security', desc: 'Bank-grade encryption and 24/7 monitoring protect every transaction. Every transfer is OFAC-screened regardless of amount.' },
          { title: 'Compliance', desc: 'Fully licensed MSB, FinCEN registered, and state-licensed. We exceed regulatory requirements in every market we serve.' },
          { title: 'Affordability', desc: 'Competitive exchange rates and low flat fees. We believe everyone deserves access to affordable international transfers.' },
        ],
        buttonText: 'View Coverage',
        buttonHref: '/about',
      },
    },
    {
      type: 'HomeStats',
      props: {
        items: [
          { value: '1,000,000+', label: 'Customers Served' },
          { value: '$300M+', label: 'Remittances Annually' },
          { value: '$300', label: 'Average Transaction' },
          { value: '50+', label: 'Payout Network Countries' },
        ],
      },
    },
    {
      type: 'HomeAgentCta',
      props: {
        label: 'Agent Opportunity',
        headingHtml: 'Grow Your Business <em>With Our Network</em>',
        body: 'Join hundreds of entrepreneurs who have built successful businesses as World Direct Link agents. We provide training, compliance support, technology, and a trusted brand.',
        features: [
          { title: 'Training', desc: 'Full onboarding, compliance training, and ongoing support from our regional team.' },
          { title: 'Technology', desc: 'Access to our platform, agent tools, and real-time reporting dashboard.' },
          { title: 'Revenue', desc: 'Competitive commission structure with performance bonuses and growth incentives.' },
          { title: 'Brand Trust', desc: 'Leverage 25+ years of brand equity and customer trust in your community.' },
        ],
        buttonText: 'Apply Now',
        buttonHref: '/agents/become-an-agent',
      },
    },
  ],
};
