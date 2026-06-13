// Seed definitions for the pre-existing public forms, expressed in the
// drag-drop form builder's field schema. Imported by seed.ts and re-usable
// for ad-hoc reseeding.
//
// Field schema (one object per field):
//   { id, type, name, label, placeholder?, required?, options?, width?, helpText? }
// type ∈ text | email | tel | number | textarea | select | radio | checkbox | yesno | heading

export type BuilderField = {
  id: string;
  type: string;
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  width?: 'full' | 'half';
  helpText?: string;
};

export type BuilderForm = {
  slug: string;
  name: string;
  description?: string;
  status: 'DRAFT' | 'PUBLISHED';
  submitLabel?: string;
  successMessage?: string;
  recaptcha?: boolean;
  fields: BuilderField[];
};

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois',
  'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
  'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
  'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Puerto Rico', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
];

const BUSINESS_TYPES = [
  'Check Casher', 'Convenience Store', 'Ethnic Grocery', 'Grocery', 'Liquor Store',
  'Multi Service', 'Pharmacy', 'Port', 'Biller (Receiving Payments)', 'Other',
];

const PRODUCTS = [
  'Money Transfer - Sends Only',
  'Money Transfer - Sends and Receives',
];

const HOW_FOUND = [
  'Advertisement in newspaper / publication', 'Social media (eg Facebook)', 'Word of mouth',
  'World Direct Link sales representative', 'World Direct Link website', 'Other',
];

export const builderForms: BuilderForm[] = [
  {
    slug: 'agent-application',
    name: 'Agent Application',
    description: 'Public "Become an Agent" lead form.',
    status: 'PUBLISHED',
    submitLabel: 'Submit application',
    successMessage:
      'Thank you — your application has been received. Our agent onboarding team will be in touch shortly.',
    recaptcha: true,
    fields: [
      { id: 'f_contact', type: 'heading', name: 'h_contact', label: 'Business contact' },
      { id: 'f_first', type: 'text', name: 'firstName', label: 'First Name', required: true, width: 'half' },
      { id: 'f_last', type: 'text', name: 'lastName', label: 'Last Name', required: true, width: 'half' },
      { id: 'f_company', type: 'text', name: 'company', label: 'Company / Business Name', required: true, width: 'full' },
      { id: 'f_btype', type: 'select', name: 'businessType', label: 'Type of Business', required: true, width: 'half', options: BUSINESS_TYPES },
      { id: 'f_phone', type: 'tel', name: 'businessPhone', label: 'Phone', required: true, width: 'half' },
      { id: 'f_email', type: 'email', name: 'email', label: 'Email Address', required: true, width: 'half' },
      { id: 'f_loc', type: 'heading', name: 'h_loc', label: 'Business location' },
      { id: 'f_street', type: 'text', name: 'businessStreet', label: 'Street Address', required: true, width: 'full' },
      { id: 'f_city', type: 'text', name: 'businessCity', label: 'City', required: true, width: 'half' },
      { id: 'f_state', type: 'select', name: 'businessState', label: 'State', required: true, width: 'half', options: US_STATES },
      { id: 'f_zip', type: 'text', name: 'businessZip', label: 'ZIP / Postal Code', required: true, width: 'half' },
      { id: 'f_prod', type: 'heading', name: 'h_prod', label: 'Products & experience' },
      { id: 'f_products', type: 'select', name: 'productsOffered', label: 'Products you plan to offer', required: true, width: 'full', options: PRODUCTS },
      { id: 'f_volume', type: 'select', name: 'monthlyVolume', label: 'Anticipated monthly volume', width: 'half', options: ['1 - 50 items', '51 - 250 items', '251 - 1,000 items', 'Over 1,000 items'] },
      { id: 'f_total', type: 'text', name: 'totalLocations', label: 'Total number of locations', width: 'half' },
      { id: 'f_more', type: 'heading', name: 'h_more', label: 'A little more' },
      { id: 'f_how', type: 'select', name: 'howFound', label: 'How did you find out about us?', required: true, width: 'full', options: HOW_FOUND },
      { id: 'f_comments', type: 'textarea', name: 'comments', label: 'Comments or notes for our team', required: true, width: 'full' },
    ],
  },
  {
    slug: 'contact-us',
    name: 'Contact Us',
    description: 'Single public contact form for general questions, tracking, refunds, claims, and agent support.',
    status: 'PUBLISHED',
    submitLabel: 'Send message',
    successMessage: 'Thanks for reaching out — we will get back to you shortly.',
    recaptcha: true,
    fields: [
      { id: 'c_name', type: 'text', name: 'name', label: 'Full Name', required: true, width: 'half' },
      { id: 'c_email', type: 'email', name: 'email', label: 'Email Address', required: true, width: 'half' },
      { id: 'c_phone', type: 'tel', name: 'phone', label: 'Phone', width: 'half' },
      { id: 'c_topic', type: 'select', name: 'topic', label: 'Topic', required: true, width: 'half', options: ['General', 'Tracking', 'Refund', 'Claims', 'Agent support', 'Other'] },
      { id: 'c_transaction', type: 'text', name: 'transactionId', label: 'Transaction ID', width: 'half' },
      { id: 'c_subject', type: 'text', name: 'subject', label: 'Subject', width: 'full' },
      { id: 'c_message', type: 'textarea', name: 'message', label: 'Message', required: true, width: 'full' },
    ],
  },
  {
    slug: 'suspicious-activity-report',
    name: 'Report or Complaint',
    description: 'Single public intake for fraud, suspicious activity, transaction complaints, refund issues, and agent conduct.',
    status: 'PUBLISHED',
    submitLabel: 'Submit report or complaint',
    successMessage:
      'Thank you. Your report or complaint has been received and will be reviewed by the appropriate World Direct Link team.',
    recaptcha: true,
    fields: [
      { id: 'sar_type', type: 'select', name: 'issueType', label: 'What are you reporting?', required: true, width: 'full', options: ['Fraud or scam', 'Suspicious activity', 'Transaction issue', 'Refund or fee issue', 'Agent conduct', 'Other complaint'] },
      { id: 'sar_reporter', type: 'text', name: 'reporterName', label: 'Your name', width: 'full' },
      { id: 'sar_email', type: 'email', name: 'email', label: 'Email', width: 'half' },
      { id: 'sar_phone', type: 'tel', name: 'phone', label: 'Phone', width: 'half' },
      { id: 'sar_location', type: 'text', name: 'location', label: 'Agent / location involved', width: 'full' },
      { id: 'sar_dates', type: 'text', name: 'dates', label: 'Date(s)', width: 'full' },
      { id: 'sar_txn', type: 'text', name: 'transactionIds', label: 'Transaction ID(s) if known', width: 'full' },
      { id: 'sar_description', type: 'textarea', name: 'description', label: 'What happened?', required: true, width: 'full' },
    ],
  },
];
