'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitQuizAction, completeLessonAction, setLanguageAction } from '@/lib/actions';
import type { CourseDetail, QuizResult, LessonView } from '@/lib/api';

const LANG_LABEL: Record<string, string> = {
  en: 'English', es: 'Español', fr: 'Français', pt: 'Português', zh: '中文', ar: 'العربية', vi: 'Tiếng Việt', ht: 'Kreyòl',
};

type View = { type: 'overview' } | { type: 'lesson'; lessonId: string } | { type: 'quiz' };

export default function CourseClient({ course }: { course: CourseDetail }) {
  const router = useRouter();
  const flatLessons = useMemo(() => course.sections.flatMap((s) => s.lessons), [course.sections]);

  const [done, setDone] = useState<Set<string>>(() => new Set(flatLessons.filter((l) => l.completed).map((l) => l.id)));
  const [view, setView] = useState<View>(() => {
    const firstUndone = flatLessons.find((l) => !l.completed);
    if (flatLessons.length > 0) return { type: 'lesson', lessonId: (firstUndone ?? flatLessons[0]).id };
    return { type: 'overview' };
  });
  const [savingLesson, setSavingLesson] = useState(false);
  const [, startTransition] = useTransition();

  const hasQuiz = course.questions.length > 0;
  const lessonsComplete = flatLessons.length === 0 || flatLessons.every((l) => done.has(l.id));
  const progressPct = flatLessons.length ? Math.round((done.size / flatLessons.length) * 100) : (course.lastAttempt?.passed ? 100 : 0);

  function lessonByIndex(i: number): LessonView | undefined {
    return flatLessons[i];
  }
  function currentLessonIndex(): number {
    if (view.type !== 'lesson') return -1;
    return flatLessons.findIndex((l) => l.id === view.lessonId);
  }

  function markComplete(lessonId: string, goNext: boolean) {
    setSavingLesson(true);
    completeLessonAction(lessonId)
      .then((res) => {
        if (res.ok) {
          setDone((prev) => new Set(prev).add(lessonId));
          if (goNext) {
            const idx = flatLessons.findIndex((l) => l.id === lessonId);
            const next = lessonByIndex(idx + 1);
            if (next) setView({ type: 'lesson', lessonId: next.id });
            else if (hasQuiz) setView({ type: 'quiz' });
          }
        }
      })
      .finally(() => setSavingLesson(false));
  }

  function switchLanguage(slug: string) {
    if (slug === course.slug) return;
    const lang = course.languages.find((l) => l.slug === slug)?.language;
    startTransition(async () => {
      if (lang) await setLanguageAction(lang);
      router.push(`/training/${slug}`);
    });
  }

  return (
    <div className="portal-content" style={{ maxWidth: '1100px' }}>
      <div className="dash-eyebrow">
        <a href="/training" style={{ color: 'var(--muted)', textDecoration: 'none' }}>← Training</a>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <h1 className="dash-title" style={{ marginBottom: '8px' }}>{course.title}</h1>
        {course.languages.length > 1 && (
          <select
            value={course.slug}
            onChange={(e) => switchLanguage(e.target.value)}
            className="auth-input"
            style={{ width: 'auto', padding: '6px 10px', fontSize: '0.82rem' }}
            aria-label="Course language"
          >
            {course.languages.map((l) => (
              <option key={l.slug} value={l.slug}>{LANG_LABEL[l.language] || l.language.toUpperCase()}</option>
            ))}
          </select>
        )}
      </div>

      {/* Progress */}
      <div className="dash-card" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '6px' }}>
          <span>{done.size} of {flatLessons.length} lessons{course.lastAttempt?.passed ? ' · quiz passed' : ''}</span>
          <span>{progressPct}%</span>
        </div>
        <div style={{ height: '5px', background: 'var(--smoke)', borderRadius: '3px' }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: course.lastAttempt?.passed ? '#166534' : 'var(--gold)', borderRadius: '3px', transition: 'width 0.4s' }} />
        </div>
        {course.certificateAvailable && (
          <a href={`/api/certificate/${course.slug}`} style={{ display: 'inline-block', marginTop: '12px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gold)', textDecoration: 'none' }}>
            ⬇ Download your certificate
          </a>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '16px' }} className="course-layout">
        {/* Curriculum sidebar */}
        <aside className="dash-card course-curriculum" style={{ padding: '0', alignSelf: 'start' }}>
          <button onClick={() => setView({ type: 'overview' })} className="curr-item" style={currItemStyle(view.type === 'overview')}>
            <span>Overview</span>
          </button>
          {course.sections.map((s) => (
            <div key={s.id}>
              <p style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', padding: '12px 16px 4px' }}>{s.title}</p>
              {s.lessons.map((l) => {
                const active = view.type === 'lesson' && view.lessonId === l.id;
                const isDone = done.has(l.id);
                return (
                  <button key={l.id} onClick={() => setView({ type: 'lesson', lessonId: l.id })} className="curr-item" style={currItemStyle(active)}>
                    <span style={{ color: isDone ? '#166534' : 'var(--smoke)', flexShrink: 0 }}>{isDone ? '✓' : '○'}</span>
                    <span style={{ flex: 1, textAlign: 'left' }}>{l.title}</span>
                    {l.videoUrl && <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>▶</span>}
                  </button>
                );
              })}
            </div>
          ))}
          {hasQuiz && (
            <button onClick={() => setView({ type: 'quiz' })} className="curr-item" style={{ ...currItemStyle(view.type === 'quiz'), borderTop: '1px solid var(--smoke)' }}>
              <span style={{ color: course.lastAttempt?.passed ? '#166534' : 'var(--gold)', flexShrink: 0 }}>{course.lastAttempt?.passed ? '✓' : '?'}</span>
              <span style={{ flex: 1, textAlign: 'left' }}>Final quiz</span>
            </button>
          )}
        </aside>

        {/* Main panel */}
        <section>
          {view.type === 'overview' && (
            <div className="dash-card">
              {course.description && <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '16px', lineHeight: 1.6 }}>{course.description}</p>}
              <div className="course-content" dangerouslySetInnerHTML={{ __html: course.contentHtml || '<p>Use the curriculum on the left to begin.</p>' }} />
              {flatLessons.length > 0 && (
                <button onClick={() => setView({ type: 'lesson', lessonId: flatLessons[0].id })} className="auth-submit" style={{ width: 'auto', padding: '12px 24px', marginTop: '16px' }}>
                  Start first lesson →
                </button>
              )}
            </div>
          )}

          {view.type === 'lesson' && (() => {
            const idx = currentLessonIndex();
            const lesson = flatLessons[idx];
            if (!lesson) return null;
            const isDone = done.has(lesson.id);
            const next = lessonByIndex(idx + 1);
            return (
              <div className="dash-card">
                <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '6px' }}>Lesson {idx + 1} of {flatLessons.length}</p>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: '14px' }}>{lesson.title}</h2>
                {lesson.videoUrl && (
                  <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, marginBottom: '16px', background: '#000', borderRadius: '6px', overflow: 'hidden' }}>
                    <iframe
                      src={lesson.videoUrl}
                      title={lesson.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                    />
                  </div>
                )}
                {lesson.contentHtml && <div className="course-content" dangerouslySetInnerHTML={{ __html: lesson.contentHtml }} />}

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => markComplete(lesson.id, true)}
                    disabled={savingLesson}
                    className="auth-submit"
                    style={{ width: 'auto', padding: '12px 24px' }}
                  >
                    {savingLesson ? 'Saving…' : isDone ? (next ? 'Next lesson →' : hasQuiz ? 'Go to quiz →' : 'Done ✓') : 'Mark complete & continue →'}
                  </button>
                  {idx > 0 && (
                    <button onClick={() => setView({ type: 'lesson', lessonId: flatLessons[idx - 1].id })} className="portal-logout-btn" style={{ padding: '12px 18px' }}>
                      ← Previous
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {view.type === 'quiz' && (
            <Quiz
              course={course}
              lessonsComplete={lessonsComplete}
              onPassed={() => router.refresh()}
            />
          )}
        </section>
      </div>

      <style jsx>{`
        @media (min-width: 880px) {
          :global(.course-layout) { grid-template-columns: 300px minmax(0, 1fr) !important; }
        }
      `}</style>
      <style jsx global>{`
        .curr-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 11px 16px; background: transparent; border: 0; border-bottom: 1px solid var(--smoke); font-size: 0.84rem; color: var(--charcoal); cursor: pointer; }
        .curr-item:hover { background: rgba(200,150,12,0.05); }
      `}</style>
    </div>
  );
}

function currItemStyle(active: boolean): React.CSSProperties {
  return active ? { background: 'rgba(200,150,12,0.1)', fontWeight: 600 } : {};
}

function Quiz({ course, lessonsComplete, onPassed }: { course: CourseDetail; lessonsComplete: boolean; onPassed: () => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => course.questions.map(() => null));
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const blocked = course.requireLessons && !lessonsComplete;
  const allAnswered = answers.every((a) => a !== null);

  function submit() {
    if (!allAnswered) { setError('Please answer every question before submitting.'); return; }
    setError('');
    startTransition(async () => {
      const res = await submitQuizAction(course.slug, answers as number[]);
      if (res.error) setError(res.error);
      else if (res.result) { setResult(res.result); if (res.result.passed) onPassed(); }
    });
  }
  function retake() { setAnswers(course.questions.map(() => null)); setResult(null); setError(''); }

  if (blocked) {
    return (
      <div className="dash-card" style={{ borderLeft: '3px solid var(--gold)' }}>
        <p className="dash-card-title" style={{ color: 'var(--gold)' }}>Finish the lessons first</p>
        <p style={{ fontSize: '0.84rem', color: 'var(--muted)', marginTop: '8px', lineHeight: 1.6 }}>
          This course requires completing every lesson before taking the final quiz.
        </p>
      </div>
    );
  }

  if (result) {
    return (
      <>
        <div className="dash-card" style={{ borderLeft: `3px solid ${result.passed ? '#166534' : '#b91c1c'}` }}>
          <p className="dash-card-title" style={{ color: result.passed ? '#166534' : '#b91c1c' }}>{result.passed ? '✓ Passed' : '✗ Not passed'}</p>
          <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--charcoal)', margin: '8px 0' }}>{result.score}%</p>
          <p style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>
            You answered {result.correct} of {result.total} correctly. Pass mark is {result.passingScore}%.
          </p>
          {result.passed && result.certificateAvailable && (
            <a href={`/api/certificate/${course.slug}`} className="auth-submit" style={{ display: 'inline-block', width: 'auto', padding: '10px 20px', marginTop: '14px', textDecoration: 'none' }}>
              ⬇ Download certificate
            </a>
          )}
        </div>
        {!result.passed && (
          <button onClick={retake} className="auth-submit" style={{ width: 'auto', padding: '12px 24px' }}>Retake quiz</button>
        )}
      </>
    );
  }

  return (
    <>
      {error && <div className="auth-error" style={{ marginBottom: '16px' }}>{error}</div>}
      {course.questions.map((q, qi) => (
        <div key={q.i} className="dash-card">
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--charcoal)', marginBottom: '12px' }}>{qi + 1}. {q.q}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {q.options.map((opt, oi) => (
              <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: `1px solid ${answers[qi] === oi ? 'var(--gold)' : 'var(--smoke)'}`, borderRadius: '8px', cursor: 'pointer', background: answers[qi] === oi ? 'rgba(200,150,12,0.08)' : 'transparent' }}>
                <input type="radio" name={`q-${qi}`} checked={answers[qi] === oi} onChange={() => setAnswers((p) => { const n = [...p]; n[qi] = oi; return n; })} style={{ accentColor: 'var(--gold)' }} />
                <span style={{ fontSize: '0.86rem', color: 'var(--charcoal)' }}>{opt}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <button onClick={submit} disabled={pending} className="auth-submit" style={{ width: 'auto', padding: '12px 28px' }}>
        {pending ? 'Submitting…' : 'Submit answers'}
      </button>
    </>
  );
}
