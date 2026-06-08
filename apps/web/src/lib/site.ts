// Central brand + structural config for the WDLC public site.
// Single source of truth for company facts, navigation, footer, and regulatory data.

export const company = {
  legalName: 'World Direct Link, Corp.',
  shortName: 'World Direct Link',
  tagline: 'A Quarter Century of Financial',
  nmls: '1119263',
  foundedDisplay: 'November 2, 1999',
  foundedState: 'Georgia',
  address: {
    line1: '5405 Memorial Drive, Suite A104',
    city: 'Stone Mountain',
    state: 'GA',
    zip: '30083',
  },
  tollFree: '800-939-7185',
  phone: '404-909-8197',
  fax: '404-297-4321',
  email: 'wdlc@worlddirectlink.com',
  emails: {
    general: 'wdlc@worlddirectlink.com',
    compliance: 'compliance@worlddirectlink.com',
    claims: 'claims@worlddirectlink.com',
    returns: 'returns@worlddirectlink.com',
  },
  complianceFax: '404-751-2809',
} as const;

export const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3001';

export type NavNode = { label: string; href: string; children?: { label: string; href: string }[] };

// Top utility bar (always visible, above the primary nav)
export const utilityNav: { label: string; href: string }[] = [
  { label: 'Licenses', href: '/licenses' },
  { label: 'Report Fraud', href: '/compliance/report' },
  { label: 'Agent Application', href: '/agents/become-an-agent' },
  { label: 'Contact Us', href: '/about/contact' },
];

// Primary header navigation
export const headerNav: NavNode[] = [
  {
    label: 'About Us',
    href: '/about',
  },
  {
    label: 'Licenses',
    href: '/licenses',
  },
  {
    label: 'Services',
    href: '/services',
    children: [
      { label: 'Services Overview', href: '/services' },
      { label: 'Send Money', href: '/services/send-money' },
      { label: 'Cash Pickup', href: '/services/cash-pickup' },
      { label: 'Bank Deposit', href: '/services/bank-deposit' },
      { label: 'Mobile Wallet Payout', href: '/services/mobile-wallet' },
      { label: 'Track Transfer', href: '/services/track' },
    ],
  },
  {
    label: 'Agents & Partners',
    href: '/agents/become-an-agent',
    children: [
      { label: 'Find an Agent', href: '/find-an-agent' },
      { label: 'Become an Agent', href: '/agents/become-an-agent' },
      { label: 'Agent Resources', href: '/agents/resources' },
      { label: 'Partners', href: '/agents/partners' },
    ],
  },
  {
    label: 'Compliance',
    href: '/compliance',
    children: [
      { label: 'Compliance Overview', href: '/compliance' },
      { label: 'Fraud & Consumer Scams', href: '/compliance/fraud' },
      { label: 'Report Suspicious Activity', href: '/compliance/report' },
      { label: 'Agent Regulatory Notices', href: '/compliance/notices' },
      { label: 'Law Enforcement Requests', href: '/compliance/law-enforcement' },
      { label: 'Compliance Resources', href: '/compliance/resources' },
    ],
  },
  {
    label: 'News & Support',
    href: '/support/help',
    children: [
      { label: 'Newsroom', href: '/news' },
      { label: 'Press Releases', href: '/news/press' },
      { label: 'Help Center', href: '/support/help' },
      { label: 'Contact Support', href: '/support/contact' },
      { label: 'Complaint Form', href: '/support/complaint' },
    ],
  },
];

// Footer columns
export const footerNav: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'World Direct Link',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Licenses & Regulatory Disclosures', href: '/licenses' },
      { label: 'Contact Us', href: '/about/contact' },
    ],
  },
  {
    title: 'Services',
    links: [
      { label: 'Services Overview', href: '/services' },
      { label: 'Send Money', href: '/services/send-money' },
      { label: 'Cash Pickup', href: '/services/cash-pickup' },
      { label: 'Bank Deposit', href: '/services/bank-deposit' },
      { label: 'Mobile Wallet Payout', href: '/services/mobile-wallet' },
      { label: 'Track Transfer', href: '/services/track' },
    ],
  },
  {
    title: 'Agents & Partners',
    links: [
      { label: 'Become an Agent', href: '/agents/become-an-agent' },
      { label: 'Agent Resources', href: '/agents/resources' },
      { label: 'Partners', href: '/agents/partners' },
    ],
  },
  {
    title: 'Compliance',
    links: [
      { label: 'Compliance Overview', href: '/compliance' },
      { label: 'Fraud & Consumer Scams', href: '/compliance/fraud' },
      { label: 'Report Suspicious Activity', href: '/compliance/report' },
      { label: 'Agent Regulatory Notices', href: '/compliance/notices' },
      { label: 'Law Enforcement Requests', href: '/compliance/law-enforcement' },
      { label: 'Compliance Resources', href: '/compliance/resources' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', href: '/support/help' },
      { label: 'Contact Support', href: '/support/contact' },
      { label: 'Complaint Form', href: '/support/complaint' },
    ],
  },
];

// State money transmitter licenses.
// `since` = date first licensed (per NMLS records); leave undefined if not on hand.
// `status` defaults to Active.
export type StateLicense = {
  state: string;
  number: string;
  status?: 'Active' | 'Pending' | 'Surrendered';
  since?: string;
  licenseType?: string;
};

export const licenses: StateLicense[] = [
  { state: 'Alaska', number: 'AKMT-10045', status: 'Active' },
  { state: 'Arizona', number: 'MT-0907819', status: 'Active' },
  { state: 'Colorado', number: '500171', status: 'Active' },
  { state: 'District of Columbia', number: 'MTR1119263', status: 'Active' },
  { state: 'Georgia', number: '19028', status: 'Active', since: 'Nov 2, 1999', licenseType: 'Seller of Payment Instruments / Money Transmitter (home state)' },
  { state: 'Illinois', number: 'MT.0000238', status: 'Active' },
  { state: 'Kansas', number: 'MT.0000296', status: 'Active' },
  { state: 'Maine', number: '(state-assigned)', status: 'Active' },
  { state: 'Maryland', number: '1119263', status: 'Active' },
  { state: 'Michigan', number: 'MT0026529', status: 'Active' },
  { state: 'Minnesota', number: 'MN-MT-51987', status: 'Active' },
  { state: 'Missouri', number: 'MO-26-4255', status: 'Active' },
  { state: 'North Dakota', number: 'MT104978', status: 'Active' },
  { state: 'Ohio', number: 'OHMT056', status: 'Active' },
  { state: 'South Dakota', number: '1119263.MT', status: 'Active' },
  { state: 'Tennessee', number: '1119263', status: 'Active' },
  { state: 'Texas', number: '3097', status: 'Active' },
  { state: 'Utah', number: '76', status: 'Active' },
  { state: 'Washington', number: '550-MT-25829', status: 'Active' },
  { state: 'Wisconsin', number: '114MT', status: 'Active' },
];

// State-specific consumer complaint disclosures. Several states require a money
// transmitter to publish a specific notice telling consumers how to escalate a
// complaint to the state regulator. `general` applies in every state; keyed
// entries add or replace the wording where a state mandates exact language.
export const licenseDisclosureGeneral =
  'World Direct Link, Corp. is licensed as a money transmitter and is a FinCEN-registered Money Services Business (NMLS ID 1119263). Money transmission is offered only in the states listed above where the company holds an active license. License status and details can be verified on the NMLS Consumer Access website at nmlsconsumeraccess.org. If you have a complaint, first contact World Direct Link consumer assistance at 800-939-7185. If your complaint is not resolved, you may contact your state regulator using the information shown for each state.';

export const stateDisclosures: Record<string, string> = {
  Texas:
    'If you have a complaint, first contact the consumer assistance division of World Direct Link, Corp. at 800-939-7185. If you still have an unresolved complaint regarding the company’s money transmission or currency exchange activity, please direct your complaint to: Texas Department of Banking, 2601 North Lamar Boulevard, Austin, Texas 78705, 1-877-276-5554 (toll free), www.dob.texas.gov.',
  Washington:
    'Washington residents: if your complaint is not resolved by World Direct Link, you may file a complaint with the Washington State Department of Financial Institutions, Division of Consumer Services, at 1-877-746-4334 or dfi.wa.gov.',
  California:
    'California residents: if you have complaints about this money transmitter, please contact the California Department of Financial Protection and Innovation (DFPI) toll-free at 1-866-275-2677 or dfpi.ca.gov.',
};


// State regulator contacts (for complaint page)
export const regulators: { state: string; contact: string }[] = [
  { state: 'Alaska', contact: '(907) 269-8140 · commerce.alaska.gov/bsc' },
  { state: 'Arizona', contact: '(602) 771-2800 · azdfi.gov' },
  { state: 'Colorado', contact: '(303) 894-7575 · banking.colorado.gov' },
  { state: 'District of Columbia', contact: '(202) 727-8000 · disb.dc.gov' },
  { state: 'Georgia', contact: '(770) 986-1633 · dbf.georgia.gov' },
  { state: 'Illinois', contact: '(217) 785-0820 · idfpr.com' },
  { state: 'Kansas', contact: '(785) 380-3939 · osbckansas.gov' },
  { state: 'Maine', contact: '(207) 624-8570 · maine.gov/pfr' },
  { state: 'Maryland', contact: '(410) 230-6077 · labor.maryland.gov/finance' },
  { state: 'Michigan', contact: '(517) 241-7000 · michigan.gov/lara' },
  { state: 'Minnesota', contact: '(651) 539-1700 · mn.gov/commerce' },
  { state: 'Missouri', contact: '(573) 751-4126 · difp.mo.gov' },
  { state: 'North Dakota', contact: '(800) 613-6743 · ndfid (state portal)' },
  { state: 'Ohio', contact: '(614) 728-8400 · com.ohio.gov' },
  { state: 'South Dakota', contact: '(605) 773-3421 · dlr.sd.gov/banking' },
  { state: 'Tennessee', contact: '(615) 741-2236 · tennessee.gov/tdfi' },
  { state: 'Texas', contact: '(512) 475-1300 · dob.texas.gov' },
  { state: 'Utah', contact: '(801) 538-8830 · dfi.utah.gov' },
  { state: 'Washington', contact: '(877) 746-4334 · dfi.wa.gov' },
  { state: 'Wisconsin', contact: '(608) 261-9555 · wdfi.org' },
];
