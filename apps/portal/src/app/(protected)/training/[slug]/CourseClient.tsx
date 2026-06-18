'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitQuizAction, completeLessonAction, setLanguageAction, acknowledgePolicyAction } from '@/lib/actions';
import type { CourseDetail, QuizResult, LessonView } from '@/lib/api';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const LANG_LABEL: Record<string, string> = {
  en: 'English', es: 'Español', fr: 'Français', pt: 'Português', zh: '中文', ar: 'العربية', vi: 'Tiếng Việt', ht: 'Kreyòl',
};

type View = { type: 'overview' } | { type: 'lesson'; lessonId: string } | { type: 'quiz' };

export default function CourseClient({ course }: { course: CourseDetail }) {
  const router = useRouter();
  const flatLessons = useMemo(() => course.sections.flatMap((s) => s.lessons), [course.sections]);

  const [done, setDone] = useState<Set<string>>(() => new Set(flatLessons.filter((l) => l.completed).map((l) => l.id)));
  const [view, setViewState] = useState<View>(() => {
    const firstUndone = flatLessons.find((l) => !l.completed);
    if (flatLessons.length > 0) return { type: 'lesson', lessonId: (firstUndone ?? flatLessons[0]).id };
    return { type: 'overview' };
  });
  // Curriculum is a collapsible drawer on phones (closed by default so the
  // lesson is what you see first); always visible on the desktop sidebar.
  const [navOpen, setNavOpen] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);
  const [, startTransition] = useTransition();

  // Phase 2: policy acknowledgment gate.
  const [acked, setAcked] = useState(() => !course.requireAck || course.acknowledgedVersion === course.version);
  const [ackChecked, setAckChecked] = useState(false);
  const [ackPending, setAckPending] = useState(false);
  const [ackError, setAckError] = useState('');
  const needsAck = course.requireAck && !acked;

  function doAcknowledge() {
    if (!ackChecked) { setAckError('Please check the box to confirm you have reviewed the policy.'); return; }
    setAckPending(true);
    setAckError('');
    acknowledgePolicyAction(course.slug)
      .then((res) => {
        if (res.ok) setAcked(true);
        else setAckError(res.error || 'Could not record your acknowledgment.');
      })
      .finally(() => setAckPending(false));
  }

  const hasQuiz = course.questions.length > 0;
  const lessonsComplete = flatLessons.length === 0 || flatLessons.every((l) => done.has(l.id));
  const progressPct = flatLessons.length ? Math.round((done.size / flatLessons.length) * 100) : (course.lastAttempt?.passed ? 100 : 0);

  // Navigating always collapses the mobile drawer so the chosen item is visible.
  function setView(v: View) {
    setViewState(v);
    setNavOpen(false);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function lessonByIndex(i: number): LessonView | undefined {
    return flatLessons[i];
  }
  function currentLessonIndex(): number {
    if (view.type !== 'lesson') return -1;
    return flatLessons.findIndex((l) => l.id === view.lessonId);
  }

  // Short label for the mobile contents toggle ("Lesson 2 of 6", "Overview"…).
  function positionLabel(): string {
    if (view.type === 'overview') return 'Overview';
    if (view.type === 'quiz') return 'Final quiz';
    const idx = currentLessonIndex();
    return idx >= 0 ? `Lesson ${idx + 1} of ${flatLessons.length}` : 'Course contents';
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
    <div className="portal-content course-page" style={{ maxWidth: '1100px' }}>
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
            style={{ width: 'auto', padding: '8px 12px', fontSize: '0.86rem', minHeight: '44px' }}
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
        <div role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100} aria-label="Course progress" style={{ height: '6px', background: 'var(--smoke)', borderRadius: '3px' }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: course.lastAttempt?.passed ? '#166534' : 'var(--gold)', borderRadius: '3px', transition: 'width 0.4s' }} />
        </div>
        {course.certificateAvailable && (
          <a href={`/api/certificate/${course.slug}`} style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', marginTop: '8px', fontSize: '0.84rem', fontWeight: 600, color: 'var(--gold)', textDecoration: 'none' }}>
            ⬇ Download your certificate
          </a>
        )}
      </div>

      {/* Phase 2: policy acknowledgment. Required courses must be attested
          before the quiz/completion; the exact statement + version is shown. */}
      {course.requireAck && (
        needsAck ? (
          <div className="dash-card" style={{ borderLeft: '3px solid var(--gold)' }}>
            <p className="dash-card-title" style={{ color: 'var(--gold)' }}>Acknowledgment required</p>
            <p style={{ fontSize: '0.86rem', color: 'var(--charcoal)', margin: '10px 0', lineHeight: 1.6 }}>
              {course.policyStatement}
            </p>
            <p style={{ fontSize: '0.74rem', color: 'var(--muted)', marginBottom: '12px' }}>
              Policy version {course.version} · effective {fmtDate(course.versionEffectiveAt)}
            </p>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minHeight: '44px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={ackChecked}
                onChange={(e) => setAckChecked(e.target.checked)}
                style={{ accentColor: 'var(--gold)', width: '18px', height: '18px', marginTop: '2px' }}
              />
              <span style={{ fontSize: '0.86rem', color: 'var(--charcoal)' }}>
                I confirm I have read and understood the above, and agree to comply.
              </span>
            </label>
            {ackError && <div className="auth-error" style={{ margin: '12px 0' }}>{ackError}</div>}
            <button
              onClick={doAcknowledge}
              disabled={ackPending}
              className="auth-submit course-cta"
              style={{ width: 'auto', padding: '14px 24px', marginTop: '12px', minHeight: '48px' }}
            >
              {ackPending ? 'Recording…' : 'I acknowledge'}
            </button>
          </div>
        ) : (
          <div className="dash-card" style={{ borderLeft: '3px solid #166534' }}>
            <p style={{ fontSize: '0.84rem', color: '#166534', fontWeight: 600 }}>
              ✓ Policy acknowledged{course.acknowledgedAt ? ` on ${fmtDate(course.acknowledgedAt)}` : ''}
              {' '}· version {course.version}
            </p>
          </div>
        )
      )}

      {/* Mobile-only "Course contents" toggle. Hidden on desktop where the
          curriculum sidebar is always shown. */}
      <button
        type="button"
        className="course-contents-toggle"
        aria-expanded={navOpen}
        aria-controls="course-curriculum"
        onClick={() => setNavOpen((o) => !o)}
      >
        <span className="cct-left">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          Course contents
        </span>
        <span className="cct-right">{positionLabel()} <span aria-hidden>{navOpen ? '▲' : '▼'}</span></span>
      </button>

      <div className="course-layout">
        {/* Curriculum sidebar / mobile drawer */}
        <aside
          id="course-curriculum"
          className={`dash-card course-curriculum ${navOpen ? 'is-open' : ''}`}
          style={{ padding: '0', alignSelf: 'start' }}
        >
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
              <div className="course-content" dangerouslySetInnerHTML={{ __html: course.contentHtml || '<p>Use the curriculum to begin.</p>' }} />
              {flatLessons.length > 0 && (
                <button onClick={() => setView({ type: 'lesson', lessonId: flatLessons[0].id })} className="auth-submit course-cta" style={{ width: 'auto', padding: '14px 24px', marginTop: '16px' }}>
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
              <div className="dash-card" style={{ paddingBottom: '8px' }}>
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

                {/* Sticky thumb-reachable action bar on phones; inline on desktop. */}
                <div className="course-actionbar">
                  {idx > 0 && (
                    <button onClick={() => setView({ type: 'lesson', lessonId: flatLessons[idx - 1].id })} className="portal-logout-btn course-prev" style={{ padding: '14px 18px', minHeight: '48px' }}>
                      ← Prev
                    </button>
                  )}
                  <button
                    onClick={() => markComplete(lesson.id, true)}
                    disabled={savingLesson}
                    className="auth-submit course-cta"
                    style={{ flex: 1, padding: '14px 24px', minHeight: '48px' }}
                  >
                    {savingLesson ? 'Saving…' : isDone ? (next ? 'Next lesson →' : hasQuiz ? 'Go to quiz →' : 'Done ✓') : 'Mark complete & continue →'}
                  </button>
                </div>
              </div>
            );
          })()}

          {view.type === 'quiz' && (
            <Quiz
              course={course}
              lessonsComplete={lessonsComplete}
              blockedByAck={needsAck}
              onPassed={() => router.refresh()}
            />
          )}
        </section>
      </div>

      <style jsx global>{`
        .curr-item { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 48px; padding: 13px 16px; background: transparent; border: 0; border-bottom: 1px solid var(--smoke); font-size: 0.9rem; color: var(--charcoal); cursor: pointer; text-align: left; }
        .curr-item:hover { background: rgba(200,150,12,0.05); }
        .curr-item:focus-visible { outline: 2px solid var(--gold); outline-offset: -2px; }

        /* Mobile-first: single column, content first, curriculum collapsible. */
        .course-layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; }
        .course-contents-toggle {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          width: 100%; min-height: 50px; padding: 12px 16px; margin-top: 4px;
          background: #fff; border: 1px solid var(--smoke); border-radius: 10px;
          font-size: 0.86rem; font-weight: 600; color: var(--charcoal); cursor: pointer;
        }
        .course-contents-toggle .cct-left { display: inline-flex; align-items: center; gap: 8px; }
        .course-contents-toggle .cct-right { color: var(--muted); font-weight: 500; font-size: 0.8rem; }
        .course-curriculum { display: none; }
        .course-curriculum.is-open { display: block; }
        .course-actionbar { display: flex; gap: 10px; align-items: stretch; }
        /* Keep the primary action within thumb reach while reading on a phone. */
        @media (max-width: 879px) {
          .course-actionbar {
            position: sticky; bottom: 0; z-index: 5;
            margin: 16px -18px -8px; padding: 12px 18px calc(12px + env(safe-area-inset-bottom, 0px));
            background: linear-gradient(to top, #fff 70%, rgba(255,255,255,0));
            border-top: 1px solid var(--smoke);
          }
        }

        /* Desktop: real two-column layout, sidebar always visible, no sticky bar. */
        @media (min-width: 880px) {
          .course-layout { grid-template-columns: 300px minmax(0, 1fr); }
          .course-contents-toggle { display: none; }
          .course-curriculum { display: block; }
          .course-actionbar { margin-top: 20px; }
        }
      `}</style>
    </div>
  );
}

function currItemStyle(active: boolean): React.CSSProperties {
  return active ? { background: 'rgba(200,150,12,0.1)', fontWeight: 600 } : {};
}

function Quiz({ course, lessonsComplete, blockedByAck, onPassed }: { course: CourseDetail; lessonsComplete: boolean; blockedByAck: boolean; onPassed: () => void }) {
  // Keep in-progress answers in the browser so they survive switching to a
  // lesson and back, or a page reload, until the quiz is submitted.
  const storageKey = `wdlc-quiz:${course.slug}`;
  const [answers, setAnswers] = useState<(number | null)[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
        if (Array.isArray(saved) && saved.length === course.questions.length) return saved;
      } catch { /* ignore */ }
    }
    return course.questions.map(() => null);
  });
  // Show the learner's saved result when they return to a course they've taken.
  const [result, setResult] = useState<QuizResult | null>(() => {
    const a = course.lastAttempt;
    if (!a) return null;
    const total = course.questions.length;
    return {
      score: a.score, passed: a.passed, passingScore: course.passingScore,
      correct: Math.round((a.score / 100) * total), total, results: [],
      certificateAvailable: a.passed,
    };
  });
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  // Persist answers while the learner is still working through the quiz.
  useEffect(() => {
    if (result) return;
    try { window.localStorage.setItem(storageKey, JSON.stringify(answers)); } catch { /* ignore */ }
  }, [answers, result, storageKey]);

  const blocked = course.requireLessons && !lessonsComplete;
  const allAnswered = answers.every((a) => a !== null);

  if (blockedByAck) {
    return (
      <div className="dash-card" style={{ borderLeft: '3px solid var(--gold)' }}>
        <p className="dash-card-title" style={{ color: 'var(--gold)' }}>Acknowledge the policy first</p>
        <p style={{ fontSize: '0.84rem', color: 'var(--muted)', marginTop: '8px', lineHeight: 1.6 }}>
          This course requires acknowledging the policy statement (shown above) before you can take the final quiz.
        </p>
      </div>
    );
  }
  const answeredCount = answers.filter((a) => a !== null).length;

  function submit() {
    if (!allAnswered) { setError('Please answer every question before submitting.'); return; }
    setError('');
    startTransition(async () => {
      const res = await submitQuizAction(course.slug, answers as number[]);
      if (res.error) setError(res.error);
      else if (res.result) {
        setResult(res.result);
        try { window.localStorage.removeItem(storageKey); } catch { /* ignore */ }
        if (res.result.passed) onPassed();
      }
    });
  }
  function retake() {
    setAnswers(course.questions.map(() => null));
    setResult(null);
    setError('');
    try { window.localStorage.removeItem(storageKey); } catch { /* ignore */ }
  }

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
            <a href={`/api/certificate/${course.slug}`} className="auth-submit course-cta" style={{ display: 'inline-block', width: 'auto', padding: '12px 20px', marginTop: '14px', textDecoration: 'none' }}>
              ⬇ Download certificate
            </a>
          )}
        </div>
        {/* Retake is always available — failed learners must, passed learners may. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={retake}
            className="auth-submit course-cta"
            style={{ width: 'auto', padding: '14px 24px', ...(result.passed ? { background: '#fff', color: 'var(--navy)', border: '2px solid var(--smoke)' } : {}) }}
          >
            {result.passed ? 'Retake quiz' : 'Retake quiz'}
          </button>
          {result.passed && (
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>You&apos;ve already passed — retaking won&apos;t lower your result.</span>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {error && <div className="auth-error" style={{ marginBottom: '16px' }}>{error}</div>}
      {course.questions.map((q, qi) => (
        <fieldset key={q.i} className="dash-card" style={{ border: 0, margin: 0 }}>
          <legend style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--charcoal)', marginBottom: '12px', padding: 0 }}>{qi + 1}. {q.q}</legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {q.options.map((opt, oi) => (
              <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '48px', padding: '12px 14px', border: `1px solid ${answers[qi] === oi ? 'var(--gold)' : 'var(--smoke)'}`, borderRadius: '8px', cursor: 'pointer', background: answers[qi] === oi ? 'rgba(200,150,12,0.08)' : 'transparent' }}>
                <input type="radio" name={`q-${qi}`} checked={answers[qi] === oi} onChange={() => setAnswers((p) => { const n = [...p]; n[qi] = oi; return n; })} style={{ accentColor: 'var(--gold)', width: '18px', height: '18px' }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--charcoal)' }}>{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button onClick={submit} disabled={pending} className="auth-submit course-cta" style={{ width: 'auto', padding: '14px 28px', minHeight: '48px' }}>
          {pending ? 'Submitting…' : 'Submit answers'}
        </button>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{answeredCount} of {course.questions.length} answered</span>
      </div>
    </>
  );
}
