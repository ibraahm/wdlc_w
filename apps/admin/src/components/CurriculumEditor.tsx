'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import type { CourseWithCurriculum, Section, Lesson, LessonInput } from '@/lib/api';
import {
  getCourseCurriculumAction,
  createSectionAction, updateSectionAction, deleteSectionAction,
  createLessonAction, updateLessonAction, deleteLessonAction,
} from '@/lib/actions';
import RichTextEditor from './RichTextEditor';

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

const EMPTY_LESSON: LessonInput = { title: '', contentHtml: '', videoUrl: '', durationMinutes: null, order: 0 };

function LessonForm({ initial, busy, onSubmit, onCancel }: {
  initial: LessonInput; busy: boolean; onSubmit: (d: LessonInput) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState<LessonInput>(initial);
  function set<K extends keyof LessonInput>(k: K, v: LessonInput[K]) { setForm((f) => ({ ...f, [k]: v })); }
  return (
    <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/40 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className={labelCls}>Lesson title *</label>
          <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. What is a SAR?" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Length (minutes)</label>
          <input type="number" min={0} value={form.durationMinutes ?? ''} onChange={(e) => set('durationMinutes', e.target.value ? Number(e.target.value) : null)} className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Video link (YouTube, Vimeo, or Loom) — optional</label>
        <input value={form.videoUrl || ''} onChange={(e) => set('videoUrl', e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Lesson text — optional</label>
        <RichTextEditor value={form.contentHtml || ''} onChange={(html) => set('contentHtml', html)} placeholder="Write the lesson notes here…" />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 bg-white">Cancel</button>
        <button type="button" disabled={busy || !form.title.trim()} onClick={() => onSubmit(form)} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          {busy ? 'Saving…' : 'Save lesson'}
        </button>
      </div>
    </div>
  );
}

export default function CurriculumEditor({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<CourseWithCurriculum | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [newSection, setNewSection] = useState('');
  const [addingLessonIn, setAddingLessonIn] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<string | null>(null);

  const reload = useCallback(() => {
    getCourseCurriculumAction(courseId).then((res) => {
      if (res.course) setCourse(res.course);
      else setError(res.error ?? 'Failed to load curriculum');
    });
  }, [courseId]);

  useEffect(() => { reload(); }, [reload]);

  function run(fn: () => Promise<{ ok?: boolean; error?: string }>, after?: () => void) {
    setError('');
    startTransition(async () => {
      const res = await fn();
      if (res.ok) { after?.(); reload(); }
      else setError(res.error ?? 'Action failed');
    });
  }

  if (!course) {
    return <p className="text-sm text-gray-400">{error || 'Loading curriculum…'}</p>;
  }

  const sections: Section[] = course.sections ?? [];

  return (
    <div className="space-y-4">
      {error && <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}

      {sections.length === 0 && (
        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-3">
          No sections yet. Add a section (e.g. “Introduction”), then add lessons with video and text.
        </p>
      )}

      {sections.map((s) => (
        <div key={s.id} className="border border-gray-200 rounded-lg bg-white">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
            <input
              defaultValue={s.title}
              onBlur={(e) => { if (e.target.value.trim() && e.target.value !== s.title) run(() => updateSectionAction(s.id, { title: e.target.value.trim() })); }}
              className="flex-1 bg-transparent text-sm font-semibold text-gray-800 focus:outline-none"
            />
            <span className="text-xs text-gray-400">{s.lessons.length} lesson{s.lessons.length === 1 ? '' : 's'}</span>
            <button onClick={() => { if (confirm(`Delete section “${s.title}” and its lessons?`)) run(() => deleteSectionAction(s.id)); }} className="text-xs text-red-600 hover:underline">Delete</button>
          </div>

          <div className="divide-y divide-gray-100">
            {s.lessons.map((l: Lesson, i) =>
              editingLesson === l.id ? (
                <div key={l.id} className="p-3">
                  <LessonForm
                    initial={{ title: l.title, contentHtml: l.contentHtml, videoUrl: l.videoUrl || '', durationMinutes: l.durationMinutes ?? null, order: l.order }}
                    busy={isPending}
                    onSubmit={(d) => run(() => updateLessonAction(l.id, d), () => setEditingLesson(null))}
                    onCancel={() => setEditingLesson(null)}
                  />
                </div>
              ) : (
                <div key={l.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                  <span className="flex-1 text-sm text-gray-800">{l.title}</span>
                  {l.videoUrl && <span className="text-xs text-blue-600">▶ video</span>}
                  {l.durationMinutes ? <span className="text-xs text-gray-400">{l.durationMinutes}m</span> : null}
                  <button onClick={() => setEditingLesson(l.id)} className="text-xs px-2 py-0.5 border border-gray-300 rounded hover:bg-gray-50">Edit</button>
                  <button onClick={() => { if (confirm(`Delete lesson “${l.title}”?`)) run(() => deleteLessonAction(l.id)); }} className="text-xs text-red-600 hover:underline">Delete</button>
                </div>
              )
            )}

            {addingLessonIn === s.id ? (
              <div className="p-3">
                <LessonForm
                  initial={{ ...EMPTY_LESSON, order: s.lessons.length }}
                  busy={isPending}
                  onSubmit={(d) => run(() => createLessonAction(s.id, d), () => setAddingLessonIn(null))}
                  onCancel={() => setAddingLessonIn(null)}
                />
              </div>
            ) : (
              <button onClick={() => setAddingLessonIn(s.id)} className="w-full py-2 text-sm text-blue-700 hover:bg-blue-50">+ Add lesson</button>
            )}
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <input value={newSection} onChange={(e) => setNewSection(e.target.value)} placeholder="New section title" className={inputCls} />
        <button
          disabled={!newSection.trim() || isPending}
          onClick={() => run(() => createSectionAction(courseId, { title: newSection.trim(), order: sections.length }), () => setNewSection(''))}
          className="px-4 py-2 text-sm bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50 whitespace-nowrap"
        >
          + Add section
        </button>
      </div>
    </div>
  );
}
