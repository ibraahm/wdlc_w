'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setDDStageAction } from '@/lib/actions';
import { useToast, useConfirm } from '@/components/ui/Feedback';

const PIPELINE = ['APPLICATION', 'UNDER_REVIEW', 'DD_IN_PROGRESS', 'ACTIVE'] as const;

const LABEL: Record<string, string> = {
  APPLICATION: 'Application',
  UNDER_REVIEW: 'Under review',
  DD_IN_PROGRESS: 'Due diligence',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  TERMINATED: 'Terminated',
  REJECTED: 'Rejected',
};

type Intent = 'primary' | 'success' | 'warn' | 'danger' | 'neutral';
type ActionDesc = { label: string; intent: Intent; gatedByBlockers?: boolean; confirm?: { title: string; message: string; confirmLabel?: string; danger?: boolean } };

function describe(target: string, from: string): ActionDesc {
  switch (target) {
    case 'UNDER_REVIEW':
      if (from === 'APPLICATION') return { label: 'Start review', intent: 'primary' };
      if (from === 'REJECTED') return { label: 'Reopen for review', intent: 'neutral' };
      return { label: 'Move back to review', intent: 'neutral' };
    case 'DD_IN_PROGRESS':
      if (from === 'UNDER_REVIEW') return { label: 'Begin due diligence', intent: 'primary' };
      return { label: 'Resume due diligence', intent: 'neutral' };
    case 'ACTIVE':
      if (from === 'SUSPENDED') return { label: 'Reactivate', intent: 'success' };
      return { label: 'Activate agent', intent: 'success', gatedByBlockers: true };
    case 'SUSPENDED':
      return { label: 'Suspend', intent: 'warn', confirm: { title: 'Suspend agent', message: 'Temporarily halt this agent? Their branch is marked suspended until reactivated.', confirmLabel: 'Suspend' } };
    case 'TERMINATED':
      return { label: 'Terminate', intent: 'danger', confirm: { title: 'Terminate agent', message: 'Offboard this agent? This ends the relationship and cannot be reopened — create a new file to re-onboard.', danger: true, confirmLabel: 'Terminate' } };
    case 'REJECTED':
      return { label: 'Reject', intent: 'danger', confirm: { title: 'Reject application', message: 'Reject this agent application?', danger: true, confirmLabel: 'Reject' } };
    case 'APPLICATION':
      return { label: 'Move back to application', intent: 'neutral' };
    default:
      return { label: LABEL[target] ?? target, intent: 'neutral' };
  }
}

const INTENT_CLS: Record<Intent, string> = {
  primary: 'bg-navy text-white hover:opacity-90',
  success: 'bg-green-700 text-white hover:bg-green-800',
  warn: 'border border-amber-300 text-amber-700 hover:bg-amber-50',
  danger: 'border border-red-300 text-red-700 hover:bg-red-50',
  neutral: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
};

export default function LifecyclePipeline({
  fileId,
  stage,
  allowedStages,
  blockers,
  onboardedAt,
  canManage,
}: {
  fileId: string;
  stage: string;
  allowedStages: string[];
  blockers: string[];
  onboardedAt?: string | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [pending, start] = useTransition();

  const inPipeline = (PIPELINE as readonly string[]).includes(stage);
  const currentIndex = inPipeline ? PIPELINE.indexOf(stage as (typeof PIPELINE)[number]) : -1;
  // Suspended sits "at" the active stage; terminal states stop the track.
  const trackIndex = stage === 'SUSPENDED' ? PIPELINE.indexOf('ACTIVE') : currentIndex;
  const isTerminal = stage === 'TERMINATED' || stage === 'REJECTED';

  async function go(target: string, desc: ActionDesc) {
    if (desc.gatedByBlockers && blockers.length > 0) return;
    if (desc.confirm && !(await confirmDialog(desc.confirm))) return;
    start(async () => {
      const res = await setDDStageAction(fileId, target);
      if (res.ok) { toast(`Moved to ${LABEL[target] ?? target}`, 'success'); router.refresh(); }
      else toast(res.error ?? 'Could not change stage', 'error');
    });
  }

  const actions = allowedStages.map((t) => ({ target: t, desc: describe(t, stage) }));
  // Prominent steps first (forward / activate), then the rest.
  const order: Record<Intent, number> = { primary: 0, success: 1, neutral: 2, warn: 3, danger: 4 };
  actions.sort((a, b) => order[a.desc.intent] - order[b.desc.intent]);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">Agent lifecycle</h2>
        {onboardedAt && <span className="text-xs text-gray-400">Onboarded {new Date(onboardedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
      </div>

      {/* Stepper */}
      <ol className="flex items-center">
        {PIPELINE.map((s, i) => {
          const done = trackIndex > i || (stage === 'ACTIVE' && i <= trackIndex);
          const current = stage === s || (stage === 'SUSPENDED' && s === 'ACTIVE');
          const dim = isTerminal;
          return (
            <li key={s} className={`flex items-center ${i < PIPELINE.length - 1 ? 'flex-1' : ''}`}>
              <div className="flex flex-col items-center text-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    dim ? 'bg-gray-200 text-gray-400'
                      : current ? (stage === 'SUSPENDED' ? 'bg-amber-500 text-white ring-4 ring-amber-100' : 'bg-navy text-white ring-4 ring-navy/15')
                      : done ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {done && !current ? '✓' : i + 1}
                </span>
                <span className={`mt-1 text-[11px] font-medium ${current ? 'text-gray-900' : 'text-gray-400'}`}>{LABEL[s]}</span>
              </div>
              {i < PIPELINE.length - 1 && (
                <div className={`mx-2 h-0.5 flex-1 rounded ${trackIndex > i && !dim ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </li>
          );
        })}
      </ol>

      {/* Status banner for off-track states */}
      {stage === 'SUSPENDED' && (
        <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">This agent is <strong>suspended</strong> — reactivate to resume, or terminate to offboard.</p>
      )}
      {stage === 'TERMINATED' && (
        <p className="mt-3 rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-xs text-gray-600">This file is <strong>terminated</strong>. Create a new file to re-onboard.</p>
      )}
      {stage === 'REJECTED' && (
        <p className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">This application was <strong>rejected</strong>.</p>
      )}

      {/* Activation blockers */}
      {canManage && blockers.length > 0 && allowedStages.includes('ACTIVE') && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs font-semibold text-amber-800">To activate, resolve:</p>
          <ul className="mt-1 list-disc pl-5 text-xs text-amber-700">
            {blockers.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </div>
      )}

      {/* Guided actions */}
      {canManage ? (
        actions.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.map(({ target, desc }) => {
              const blocked = !!desc.gatedByBlockers && blockers.length > 0;
              return (
                <button
                  key={target}
                  type="button"
                  disabled={pending || blocked}
                  onClick={() => go(target, desc)}
                  title={blocked ? 'Resolve the activation blockers first' : undefined}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${INTENT_CLS[desc.intent]}`}
                >
                  {desc.label}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-xs text-gray-400">No further lifecycle actions available.</p>
        )
      ) : (
        <p className="mt-3 text-xs text-gray-400">Compliance approval is required to change the lifecycle stage.</p>
      )}
    </section>
  );
}
