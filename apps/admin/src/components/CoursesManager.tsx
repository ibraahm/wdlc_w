'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Course, CourseInput, QuizQuestion } from '@/lib/api';
import { createCourseAction, updateCourseAction, deleteCourseAction } from '@/lib/actions';
import RichTextEditor from './RichTextEditor';
import CurriculumEditor from './CurriculumEditor';

const LANGUAGES = [
  { code: 'en', name: 'English' }, { code: 'es', name: 'Español' }, { code: 'fr', name: 'Français' },
  { code: 'pt', name: 'Português' }, { code: 'zh', name: '中文' }, { code: 'ar', name: 'العربية' },
  { code: 'vi', name: 'Tiếng Việt' }, { code: 'ht', name: 'Kreyòl' },
];

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

// A titled section so the long form reads as clear, ordered steps.
function Section({ step, title, hint, children }: { step: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-baseline gap-2 mb-3">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-semibold shrink-0">{step}</span>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {hint && <p className="text-xs text-gray-500 -mt-2 mb-3 ml-7">{hint}</p>}
      <div className="ml-7">{children}</div>
    </section>
  );
}

const EMPTY: CourseInput = {
  title: '', slug: '', category: 'General', description: '', contentHtml: '',
  questions: [], passingScore: 80, audience: 'ALL', targetStates: '', targetBranches: '', status: 'DRAFT', order: 0,
  language: 'en', translationGroup: '', dueAt: null, requireLessons: false,
  requireAck: false, policyStatement: '',
};

function parseQuestions(json: string): QuizQuestion[] {
  try { const p = JSON.parse(json || '[]'); return Array.isArray(p) ? p : []; } catch { return []; }
}

// Audience targeting block shared with the resource form (kept local for simplicity).
const AUDIENCE_CHOICES = [
  { value: 'ALL', label: 'Everyone', desc: 'All agents and tellers' },
  { value: 'STATE', label: 'Certain states', desc: 'Only branches in chosen states' },
  { value: 'AGENT', label: 'Certain agents', desc: 'Only specific branch codes' },
];

function AudienceFields({
  audience, targetStates, targetBranches, onChange,
}: {
  audience: string; targetStates: string; targetBranches: string;
  onChange: (patch: { audience?: string; targetStates?: string; targetBranches?: string }) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {AUDIENCE_CHOICES.map((c) => {
          const active = audience === c.value;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => onChange({ audience: c.value })}
              className={`text-left rounded-lg border p-3 transition ${active ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-3.5 h-3.5 rounded-full border-2 ${active ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`} />
                <span className="text-sm font-medium text-gray-900">{c.label}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{c.desc}</p>
            </button>
          );
        })}
      </div>
      {audience === 'STATE' && (
        <div>
          <label className={labelCls}>Which states? Enter 2-letter codes, separated by commas.</label>
          <input value={targetStates} onChange={(e) => onChange({ targetStates: e.target.value })} placeholder="e.g. GA, TX, FL" className={inputCls} />
          <p className="text-xs text-gray-500 mt-1">An agent sees this if their branch operates in any of these states.</p>
        </div>
      )}
      {audience === 'AGENT' && (
        <div>
          <label className={labelCls}>Which agents? Enter their branch codes, separated by commas.</label>
          <input value={targetBranches} onChange={(e) => onChange({ targetBranches: e.target.value })} placeholder="e.g. uswdlc, abc123" className={inputCls} />
          <p className="text-xs text-gray-500 mt-1">Only users belonging to these branches will see it.</p>
        </div>
      )}
    </div>
  );
}

function QuizBuilder({ questions, onChange }: { questions: QuizQuestion[]; onChange: (q: QuizQuestion[]) => void }) {
  function addQuestion() {
    onChange([...questions, { q: '', options: ['', ''], answer: 0 }]);
  }
  function updateQuestion(qi: number, patch: Partial<QuizQuestion>) {
    onChange(questions.map((q, i) => (i === qi ? { ...q, ...patch } : q)));
  }
  function removeQuestion(qi: number) {
    onChange(questions.filter((_, i) => i !== qi));
  }
  function addOption(qi: number) {
    updateQuestion(qi, { options: [...questions[qi].options, ''] });
  }
  function updateOption(qi: number, oi: number, val: string) {
    updateQuestion(qi, { options: questions[qi].options.map((o, i) => (i === oi ? val : o)) });
  }
  function removeOption(qi: number, oi: number) {
    const q = questions[qi];
    if (q.options.length <= 2) return;
    const options = q.options.filter((_, i) => i !== oi);
    const answer = q.answer >= options.length ? 0 : q.answer > oi ? q.answer - 1 : q.answer;
    updateQuestion(qi, { options, answer });
  }

  return (
    <div className="space-y-3">
      {questions.length === 0 && (
        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-3">
          No questions yet. Add at least one to give this course a quiz - or leave it empty for a read-only course with no test.
        </p>
      )}
      {questions.map((q, qi) => (
        <div key={qi} className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-xs font-semibold text-gray-500 mt-2.5 shrink-0">Q{qi + 1}</span>
            <input value={q.q} onChange={(e) => updateQuestion(qi, { q: e.target.value })} placeholder="Type the question" className={inputCls} />
            <button type="button" onClick={() => removeQuestion(qi)} className="px-2 py-2 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 shrink-0">Remove</button>
          </div>
          <p className="text-xs text-gray-500 pl-7">Tick the circle next to the correct answer:</p>
          <div className="space-y-1.5 pl-7">
            {q.options.map((opt, oi) => {
              const correct = q.answer === oi;
              return (
                <div key={oi} className={`flex items-center gap-2 rounded-lg border px-2 py-1 ${correct ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'}`}>
                  <button
                    type="button"
                    onClick={() => updateQuestion(qi, { answer: oi })}
                    title="Mark as the correct answer"
                    className={`flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 ${correct ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 text-transparent hover:border-green-400'}`}
                  >
                    ✓
                  </button>
                  <input value={opt} onChange={(e) => updateOption(qi, oi, e.target.value)} placeholder={`Answer choice ${oi + 1}`} className="flex-1 bg-transparent text-sm focus:outline-none" />
                  {correct && <span className="text-xs font-medium text-green-700 shrink-0">Correct</span>}
                  {q.options.length > 2 && (
                    <button type="button" onClick={() => removeOption(qi, oi)} title="Remove this choice" aria-label="Remove this choice" className="text-xs text-gray-500 hover:text-red-600 shrink-0">✕</button>
                  )}
                </div>
              );
            })}
            <button type="button" onClick={() => addOption(qi)} className="text-xs text-blue-600 hover:underline">+ Add another answer choice</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={addQuestion} className="w-full py-2 text-sm font-medium text-blue-700 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50">
        + Add {questions.length === 0 ? 'a' : 'another'} question
      </button>
    </div>
  );
}

function CourseForm({
  initial, submitLabel, busy, onSubmit, onCancel, courseId,
}: {
  initial: CourseInput; submitLabel: string; busy: boolean;
  onSubmit: (data: CourseInput) => void; onCancel: () => void; courseId?: string;
}) {
  const [form, setForm] = useState<CourseInput>(initial);
  function set<K extends keyof CourseInput>(key: K, value: CourseInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit(form);
  }
  const isPublishing = form.status === 'PUBLISHED';
  return (
    <form onSubmit={submit} className="space-y-3 bg-gray-100 border border-gray-200 rounded-lg p-4">
      <Section step={1} title="Course details" hint="What the course is called and where it's grouped.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Course title *</label>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} required placeholder="e.g. BSA/AML Basics" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g. Compliance" className={inputCls} />
            <p className="text-xs text-gray-500 mt-1">Courses are grouped by category in the portal.</p>
          </div>
        </div>
        <div className="mt-3">
          <label className={labelCls}>Short description</label>
          <input value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="One line shown in the course list" className={inputCls} />
        </div>
      </Section>

      <Section step={2} title="Overview" hint="A short intro shown above the curriculum. Use the buttons to format - no coding needed.">
        <RichTextEditor value={form.contentHtml} onChange={(html) => set('contentHtml', html)} />
      </Section>

      <Section step={3} title="Curriculum" hint="Modules and their lessons (video/text) - the Udemy-style course outline.">
        {courseId ? (
          <CurriculumEditor courseId={courseId} />
        ) : (
          <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-3">
            Save the course first, then reopen it to add modules and lessons (video + text).
          </p>
        )}
      </Section>

      <Section step={4} title="Language" hint="Offer the course in multiple languages. Use the same Translation group code across languages so agents can switch.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Course language</label>
            <select value={form.language || 'en'} onChange={(e) => set('language', e.target.value)} className={inputCls}>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Translation group (optional)</label>
            <input value={form.translationGroup || ''} onChange={(e) => set('translationGroup', e.target.value)} placeholder="e.g. bsa-aml-basics" className={inputCls} />
            <p className="text-xs text-gray-500 mt-1">Same code on each language variant links them as one course.</p>
          </div>
        </div>
      </Section>

      <Section step={5} title="Quiz" hint="Optional. Add questions to test understanding; mark the correct answer for each.">
        <QuizBuilder questions={form.questions} onChange={(q) => set('questions', q)} />
        {form.questions.length > 0 && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
            <div>
              <label className={labelCls}>Score needed to pass</label>
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={100} value={form.passingScore} onChange={(e) => set('passingScore', Number(e.target.value))} className={inputCls} />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 self-end pb-2">
              <input type="checkbox" checked={!!form.requireLessons} onChange={(e) => set('requireLessons', e.target.checked)} />
              Require all lessons before the quiz
            </label>
          </div>
        )}

        {/* Phase 2: policy acknowledgment (HIPAA/EEOC/FINRA evidence) */}
        <div className="mt-4 border-t border-gray-100 pt-4 max-w-2xl">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={!!form.requireAck} onChange={(e) => set('requireAck', e.target.checked)} />
            Require a signed policy acknowledgment before completion
          </label>
          {form.requireAck && (
            <div className="mt-3">
              <label className={labelCls}>Acknowledgment statement (optional)</label>
              <textarea
                value={form.policyStatement ?? ''}
                onChange={(e) => set('policyStatement', e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="e.g. I have read and agree to comply with the WDLC Anti-Money-Laundering Policy."
                className={inputCls}
              />
              <p className="text-xs text-gray-500 mt-1">
                Shown to the user verbatim. Leave blank to use a default statement that names the course, version,
                and effective date. Each acknowledgment is recorded immutably against the exact content version.
              </p>
            </div>
          )}
        </div>
      </Section>

      <Section step={6} title="Assignment & publish" hint="Set a deadline for compliance, then publish. Drafts stay hidden from agents.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
              <option value="DRAFT">Draft - hidden</option>
              <option value="PUBLISHED">Published - visible</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Complete-by date (optional)</label>
            <input type="date" value={form.dueAt ? String(form.dueAt).slice(0, 10) : ''} onChange={(e) => set('dueAt', e.target.value || null)} className={inputCls} />
            <p className="text-xs text-gray-500 mt-1">Overdue agents are flagged in reports.</p>
          </div>
          <div>
            <label className={labelCls}>Order in list</label>
            <input type="number" value={form.order ?? 0} onChange={(e) => set('order', Number(e.target.value))} className={inputCls} />
          </div>
        </div>
        {isPublishing && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-3">
            This course will be visible to its audience as soon as you save.
          </p>
        )}
      </Section>

      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 bg-white">Cancel</button>
        <button type="submit" disabled={busy} className="px-5 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

const AUDIENCE_LABEL: Record<string, string> = { ALL: 'Everyone', STATE: 'By state', AGENT: 'By agent' };

export default function CoursesManager({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  function handleCreate(data: CourseInput) {
    setError('');
    startTransition(async () => {
      const res = await createCourseAction(data);
      if (res.ok) { setCreating(false); router.refresh(); }
      else setError(res.error ?? 'Create failed');
    });
  }
  function handleUpdate(id: string, data: CourseInput) {
    setError('');
    startTransition(async () => {
      const res = await updateCourseAction(id, data);
      if (res.ok) { setEditingId(null); router.refresh(); }
      else setError(res.error ?? 'Update failed');
    });
  }
  function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This also removes its completion records. This cannot be undone.`)) return;
    setError('');
    startTransition(async () => {
      const res = await deleteCourseAction(id);
      if (res.ok) router.refresh();
      else setError(res.error ?? 'Delete failed');
    });
  }

  function toInput(c: Course): CourseInput {
    return {
      title: c.title, slug: c.slug, category: c.category, description: c.description || '',
      contentHtml: c.contentHtml, questions: parseQuestions(c.questions), passingScore: c.passingScore,
      audience: c.audience, targetStates: c.targetStates || '', targetBranches: c.targetBranches || '',
      status: c.status, order: c.order,
      language: c.language || 'en', translationGroup: c.translationGroup || '',
      dueAt: c.dueAt ?? null, requireLessons: !!c.requireLessons,
      requireAck: !!c.requireAck, policyStatement: c.policyStatement ?? '',
    };
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      {!creating && (
        <div className="flex justify-end">
          <button onClick={() => setCreating(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">+ New Course</button>
        </div>
      )}

      {creating && (
        <CourseForm initial={EMPTY} submitLabel="Create Course" busy={isPending} onSubmit={handleCreate} onCancel={() => setCreating(false)} />
      )}

      {courses.length === 0 && !creating ? (
        <div className="border border-dashed border-gray-300 rounded-lg py-12 text-center text-gray-500 text-sm">
          No courses yet. Click "New Course" to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((c) =>
            editingId === c.id ? (
              <CourseForm key={c.id} courseId={c.id} initial={toInput(c)} submitLabel="Save Changes" busy={isPending} onSubmit={(d) => handleUpdate(c.id, d)} onCancel={() => setEditingId(null)} />
            ) : (
              <div key={c.id} className="flex items-start gap-3 border border-gray-200 rounded-lg px-4 py-3 bg-white">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 truncate">{c.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{c.category}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">{AUDIENCE_LABEL[c.audience] ?? c.audience}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium uppercase">{c.language || 'en'}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 space-x-2">
                    <span>/{c.slug}</span>
                    <span>· {c.sectionCount ?? 0} sections, {c.lessonCount ?? 0} lessons</span>
                    <span>· {c.questionCount ?? 0} questions</span>
                    <span>· {c.passedCount ?? 0} passed</span>
                    {c.dueAt && <span>· due {new Date(c.dueAt).toLocaleDateString()}</span>}
                    {c.audience === 'STATE' && c.targetStates && <span>· {c.targetStates}</span>}
                    {c.audience === 'AGENT' && c.targetBranches && <span>· {c.targetBranches}</span>}
                  </div>
                  {c.description && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{c.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditingId(c.id)} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Edit</button>
                  <button onClick={() => handleDelete(c.id, c.title)} disabled={isPending} className="px-3 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50 disabled:opacity-50">Delete</button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
