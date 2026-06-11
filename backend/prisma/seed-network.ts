export type NetworkCountrySeed = {
  name: string;
  payoutTypes: string[];
  payoutDetails?: {
    mobileMoney?: string[];
    cashPartner?: string;
    bankName?: string;
  };
  flagUrl?: string | null;
  active?: boolean;
};

export const networkCountries: NetworkCountrySeed[] = [
  { name: 'Angola', payoutTypes: ['Cash Collection'] },
  { name: 'Australia', payoutTypes: ['Cash Collection'] },
  { name: 'Austria', payoutTypes: ['Cash Collection'] },
  { name: 'Belgium', payoutTypes: ['Cash Collection'] },
  { name: 'Benin', payoutTypes: ['Cash Collection'] },
  { name: 'Canada', payoutTypes: ['Cash Collection'] },
  { name: 'Chad', payoutTypes: ['Cash Collection'] },
  { name: 'China', payoutTypes: ['Cash Collection'] },
  { name: 'Congo, the Democratic Republic of the', payoutTypes: ['Cash Collection'] },
  { name: "Cote d'Ivoire", payoutTypes: ['Cash Collection'] },
  { name: 'Denmark', payoutTypes: ['Cash Collection'] },
  { name: 'Djibouti', payoutTypes: ['Cash Collection'] },
  { name: 'Egypt', payoutTypes: ['Cash Collection'] },
  { name: 'Finland', payoutTypes: ['Cash Collection'] },
  { name: 'France', payoutTypes: ['Cash Collection'] },
  { name: 'Germany', payoutTypes: ['Cash Collection'] },
  { name: 'Ghana', payoutTypes: ['Cash Collection'] },
  { name: 'Greece', payoutTypes: ['Cash Collection'] },
  { name: 'India', payoutTypes: ['Cash Collection'] },
  { name: 'Indonesia', payoutTypes: ['Cash Collection'] },
  { name: 'Ireland', payoutTypes: ['Cash Collection'] },
  { name: 'Italy', payoutTypes: ['Cash Collection'] },
  { name: 'Kenya', payoutTypes: ['Cash Collection', 'Mobile Money'] },
  { name: 'Kuwait', payoutTypes: ['Cash Collection'] },
  { name: 'Malaysia', payoutTypes: ['Cash Collection'] },
  { name: 'Malta', payoutTypes: ['Cash Collection'] },
  { name: 'Mozambique', payoutTypes: ['Cash Collection'] },
  { name: 'Netherlands', payoutTypes: ['Cash Collection'] },
  { name: 'Nigeria', payoutTypes: ['Cash Collection'] },
  { name: 'Norway', payoutTypes: ['Cash Collection'] },
  { name: 'Oman', payoutTypes: ['Cash Collection'] },
  { name: 'Saudi Arabia', payoutTypes: ['Cash Collection'] },
  { name: 'Senegal', payoutTypes: ['Cash Collection'] },
  { name: 'Somalia', payoutTypes: ['Bank Transfer', 'Cash Collection', 'Mobile Money'] },
  { name: 'South Africa', payoutTypes: ['Cash Collection'] },
  { name: 'South Sudan', payoutTypes: ['Cash Collection'] },
  { name: 'Sudan', payoutTypes: ['Cash Collection'] },
  { name: 'Sweden', payoutTypes: ['Cash Collection'] },
  { name: 'Switzerland', payoutTypes: ['Cash Collection'] },
  { name: 'Tanzania', payoutTypes: ['Cash Collection'] },
  { name: 'Thailand', payoutTypes: ['Cash Collection'] },
  { name: 'Togo', payoutTypes: ['Cash Collection'] },
  { name: 'Turkey', payoutTypes: ['Bank Transfer', 'Cash Collection'] },
  { name: 'Uganda', payoutTypes: ['Cash Collection', 'Mobile Money'] },
  { name: 'United Arab Emirates', payoutTypes: ['Cash Collection'] },
  { name: 'United Kingdom', payoutTypes: ['Cash Collection'] },
  { name: 'United States of America', payoutTypes: ['Cash Collection'] },
  { name: 'Yemen', payoutTypes: ['Cash Collection'] },
  { name: 'Zambia', payoutTypes: ['Cash Collection'] },
];
