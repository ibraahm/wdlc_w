import { getSession } from '@/lib/auth';
import TrainingTabs from '@/components/TrainingTabs';

const ALL_TABS = [
  { label: 'Courses', href: '/training/courses' },
  { label: 'Assignments', href: '/training/assignments' },
  { label: 'Compliance', href: '/training/compliance' },
  { label: 'Exceptions', href: '/training/exceptions' },
  { label: 'Certificate', href: '/training/certificate' },
  { label: 'Resources', href: '/training/resources' },
  { label: 'Reports', href: '/training/reports' },
];

// Tabs replace the long sidebar list for the Training section. Regional officers
// only have Reports, so they don't see a tab strip.
export default async function TrainingLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const officer = session?.user.role === 'REGIONAL_OFFICER';
  const tabs = officer ? ALL_TABS.filter((t) => t.href === '/training/reports') : ALL_TABS;
  return (
    <div>
      <TrainingTabs tabs={tabs} />
      {children}
    </div>
  );
}
