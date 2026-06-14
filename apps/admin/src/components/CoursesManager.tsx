'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Course, CourseInput, QuizQuestion } from '@/lib/api';
import { createCourseAction, updateCourseAction, deleteCourseAction } from '@/lib/actions';

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

const EMPTY: CourseInput = {
  title: '', slug: '', category: 'General', description: '', contentHtml: '',
  questions: [], passingScore: 80, audience: 'ALL', targetStates: '', targetBranches: '', status: 'DRAFT', order: 0,
};

function parseQuestions(json: string): QuizQuestion[] {
  try { const p = JSON.parse(json || '[]'); return Array.isArray(p) ? p : []; } catch { return []; }
}

// Audience targeting block shared with the resource form (kept local for simplicity).
function AudienceFields({
  audience, targetStates, targetBranches, onChange,
}: {
  audience: string; targetStates: string; targetBranches: string;
  onChange: (patch: { audience?: string; targetStates?: string; targetBranches?: string }) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div>
        <label className={labelCls}>Assign to</label>
        <select value={audience} onChange={(e) => onChange({ audience: e.target.value })} className={inputCls}>
          <option value="ALL">Everyone</option>
          <option value="STATE">Specific state(s)</option>
          <option value="AGENT">Specific agent(s)</option>
        </select>
      </div>
      {audience === 'STATE' && (
        <div className="md:col-span-2">
          <label className={labelCls}>State codes (comma-separated, e.g. GA, TX, FL)</label>
          <input value={targetStates} onChange={(e) => onChange({ targetStates: e.target.value })} placeholder="GA, TX" className={inputCls} />
        </div>
      )}
      {audience === 'AGENT' && (
        <div className="md:col-span-2">
          <label className={labelCls}>Branch codes (comma-separated, e.g. uswdlc, abc123)</label>
          <input value={targetBranches} onChange={(e) => onChange({ targetBranches: e.target.value })} placeholder="uswdlc, abc123" className={inputCls} />
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
      <div className="flex items-center justify-between">
        <label className={labelCls} style={{ marginBottom: 0 }}>Quiz questions ({questions.length})</label>
        <button type="button" onClick={addQuestion} className="px-3 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700">+ Add question</button>
      </div>
      {questions.length === 0 && (
        <p className="text-xs text-gray-400">No questions yet. A course with no questions is informational only (no quiz).</p>
      )}
      {questions.map((q, qi) => (
        <div key={qi} className="border border-gray-200 rounded-lg p-3 bg-white space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-xs font-semibold text-gray-500 mt-2">{qi + 1}.</span>
            <input value={q.q} onChange={(e) => updateQuestion(qi, { q: e.target.value })} placeholder="Question text" className={inputCls} />
            <button type="button" onClick={() => removeQuestion(qi)} className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 shrink-0">Remove</button>
          </div>
          <div className="space-y-1.5 pl-6">
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${qi}`}
                  checked={q.answer === oi}
                  onChange={() => updateQuestion(qi, { answer: oi })}
                  title="Mark as correct answer"
                />
                <input value={opt} onChange={(e) => updateOption(qi, oi, e.target.value)} placeholder={`Option ${oi + 1}`} className={inputCls} />
                {q.options.length > 2 && (
                  <button type="button" onClick={() => removeOption(qi, oi)} className="text-xs text-gray-400 hover:text-red-600 shrink-0">✕</button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => addOption(qi)} className="text-xs text-blue-600 hover:underline">+ Add option</button>
            <p className="text-xs text-gray-400">Select the radio button next to the correct answer.</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CourseForm({
  initial, submitLabel, busy, onSubmit, onCancel,
}: {
  initial: CourseInput; submitLabel: string; busy: boolean;
  onSubmit: (data: CourseInput) => void; onCancel: () => void;
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
  return (
    <form onSubmit={submit} className="space-y-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Title *</label>
          <input value={form.title} onChange={(e) => set('title', e.target.value)} required placeholder="Course title" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g. BSA/AML, Compliance" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Short description (shown in the catalogue)</label>
        <input value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="One-line summary" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Lesson content (HTML)</label>
        <textarea value={form.contentHtml} onChange={(e) => set('contentHtml', e.target.value)} rows={8} placeholder="<h2>Section</h2><p>…</p>" className={`${inputCls} font-mono`} />
      </div>

      <AudienceFields
        audience={form.audience}
        targetStates={form.targetStates || ''}
        targetBranches={form.targetBranches || ''}
        onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
      />

      <QuizBuilder questions={form.questions} onChange={(q) => set('questions', q)} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Pass mark (%)</label>
          <input type="number" min={1} max={100} value={form.passingScore} onChange={(e) => set('passingScore', Number(e.target.value))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Display order</label>
          <input type="number" value={form.order ?? 0} onChange={(e) => set('order', Number(e.target.value))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={busy} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
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
        <div className="border border-dashed border-gray-300 rounded-lg py-12 text-center text-gray-400 text-sm">
          No courses yet. Click "New Course" to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((c) =>
            editingId === c.id ? (
              <CourseForm key={c.id} initial={toInput(c)} submitLabel="Save Changes" busy={isPending} onSubmit={(d) => handleUpdate(c.id, d)} onCancel={() => setEditingId(null)} />
            ) : (
              <div key={c.id} className="flex items-start gap-3 border border-gray-200 rounded-lg px-4 py-3 bg-white">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 truncate">{c.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{c.category}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">{AUDIENCE_LABEL[c.audience] ?? c.audience}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 space-x-2">
                    <span>/{c.slug}</span>
                    <span>· {c.questionCount ?? 0} questions</span>
                    <span>· pass {c.passingScore}%</span>
                    <span>· {c.passedCount ?? 0} passed</span>
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
