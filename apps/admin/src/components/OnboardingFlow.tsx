import Link from 'next/link';

const STEPS = [
  {
    key: 'applications',
    href: '/applications',
    label: 'Applications',
    helper: 'Review new leads',
    detail: 'Check owner, address, products, and review flags.',
  },
  {
    key: 'dd',
    href: '/agent-dd',
    label: 'Due Diligence',
    helper: 'Complete the file',
    detail: 'Track documents, risk, expiry, and review dates.',
  },
  {
    key: 'locations',
    href: '/agents',
    label: 'Agent Locations',
    helper: 'Publish to map',
    detail: 'Keep public addresses, phone numbers, and pins accurate.',
  },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

export default function OnboardingFlow({ active }: { active: StepKey }) {
  const activeIndex = STEPS.findIndex((step) => step.key === active);

  return (
    <nav className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm" aria-label="Agent onboarding workflow">
      <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Agents and onboarding</p>
          <p className="mt-1 text-sm text-gray-700">
            One workflow from public application to compliance file to published map location.
          </p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
          Step {activeIndex + 1} of {STEPS.length}
        </span>
      </div>

      <ol className="mt-4 grid gap-3 md:grid-cols-3">
        {STEPS.map((step, index) => {
          const isActive = active === step.key;
          const isDone = index < activeIndex;

          return (
            <li key={step.key}>
              <Link
                href={step.href}
                aria-current={isActive ? 'step' : undefined}
                className={`group flex h-full gap-3 rounded-lg border p-3 transition-colors ${
                  isActive
                    ? 'border-navy bg-navy text-white shadow-sm'
                    : isDone
                      ? 'border-green-200 bg-green-50 text-green-950 hover:border-green-300'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-navy/30 hover:bg-gray-50'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                    isActive
                      ? 'border-white/30 bg-white text-navy'
                      : isDone
                        ? 'border-green-700 bg-green-700 text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-500'
                  }`}
                >
                  {isDone ? 'OK' : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{step.label}</span>
                  <span className={`mt-0.5 block text-xs ${isActive ? 'text-white/80' : isDone ? 'text-green-700' : 'text-gray-500'}`}>
                    {step.helper}
                  </span>
                  <span className={`mt-2 block text-xs leading-5 ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                    {step.detail}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
