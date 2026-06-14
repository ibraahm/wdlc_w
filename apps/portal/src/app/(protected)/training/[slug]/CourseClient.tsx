'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitQuizAction } from '@/lib/actions';
import type { CourseDetail, QuizResult } from '@/lib/api';

type Phase = 'lesson' | 'quiz' | 'result';

export default function CourseClient({ course }: { course: CourseDetail }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('lesson');
  const [answers, setAnswers] = useState<(number | null)[]>(() => course.questions.map(() => null));
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const hasQuiz = course.questions.length > 0;
  const allAnswered = answers.every((a) => a !== null);

  function selectAnswer(qi: number, oi: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[qi] = oi;
      return next;
    });
  }

  function submit() {
    if (!allAnswered) {
      setError('Please answer every question before submitting.');
      return;
    }
    setError('');
    startTransition(async () => {
      const res = await submitQuizAction(course.slug, answers as number[]);
      if (res.error) {
        setError(res.error);
      } else if (res.result) {
        setResult(res.result);
        setPhase('result');
      }
    });
  }

  function retake() {
    setAnswers(course.questions.map(() => null));
    setResult(null);
    setError('');
    setPhase('quiz');
  }

  return (
    <div className="portal-content">
      <div className="dash-eyebrow">
        <a href="/training" style={{ color: 'var(--muted)', textDecoration: 'none' }}>← Training</a>
      </div>
      <h1 className="dash-title">{course.title}</h1>

      {course.lastAttempt?.passed && phase === 'lesson' && (
        <div className="dash-card" style={{ borderLeft: '3px solid #166534' }}>
          <p style={{ fontSize: '0.84rem', color: '#166534', fontWeight: 600 }}>
            ✓ You passed this course ({course.lastAttempt.score}%) on {new Date(course.lastAttempt.completedAt).toLocaleDateString()}.
          </p>
        </div>
      )}

      {phase === 'lesson' && (
        <>
          <div className="dash-card">
            {course.description && (
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '16px', lineHeight: 1.6 }}>{course.description}</p>
            )}
            <div
              className="course-content"
              style={{ fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--charcoal)' }}
              dangerouslySetInnerHTML={{ __html: course.contentHtml || '<p>No lesson content provided.</p>' }}
            />
          </div>
          {hasQuiz ? (
            <div>
              <button onClick={() => setPhase('quiz')} className="auth-submit" style={{ width: 'auto', padding: '12px 28px' }}>
                {course.lastAttempt ? 'Retake quiz' : 'Start quiz'} ({course.questions.length} questions, pass {course.passingScore}%)
              </button>
            </div>
          ) : (
            <p style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>This course has no quiz.</p>
          )}
        </>
      )}

      {phase === 'quiz' && (
        <>
          {error && <div className="auth-error" style={{ marginBottom: '16px' }}>{error}</div>}
          {course.questions.map((q, qi) => (
            <div key={q.i} className="dash-card">
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--charcoal)', marginBottom: '12px' }}>
                {qi + 1}. {q.q}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {q.options.map((opt, oi) => (
                  <label
                    key={oi}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                      border: `1px solid ${answers[qi] === oi ? 'var(--gold)' : 'var(--smoke)'}`,
                      borderRadius: '8px', cursor: 'pointer',
                      background: answers[qi] === oi ? 'rgba(193,154,107,0.08)' : 'transparent',
                    }}
                  >
                    <input
                      type="radio"
                      name={`q-${qi}`}
                      checked={answers[qi] === oi}
                      onChange={() => selectAnswer(qi, oi)}
                      style={{ accentColor: 'var(--gold)' }}
                    />
                    <span style={{ fontSize: '0.86rem', color: 'var(--charcoal)' }}>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={submit} disabled={pending} className="auth-submit" style={{ width: 'auto', padding: '12px 28px' }}>
              {pending ? 'Submitting…' : 'Submit answers'}
            </button>
            <button onClick={() => setPhase('lesson')} className="portal-logout-btn" style={{ padding: '12px 20px' }}>
              Back to lesson
            </button>
          </div>
        </>
      )}

      {phase === 'result' && result && (
        <>
          <div className="dash-card" style={{ borderLeft: `3px solid ${result.passed ? '#166534' : '#b91c1c'}` }}>
            <p className="dash-card-title" style={{ color: result.passed ? '#166534' : '#b91c1c' }}>
              {result.passed ? '✓ Passed' : '✗ Not passed'}
            </p>
            <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--charcoal)', margin: '8px 0' }}>
              {result.score}%
            </p>
            <p style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>
              You answered {result.correct} of {result.total} correctly. Pass mark is {result.passingScore}%.
            </p>
          </div>

          <div className="dash-card">
            <p className="dash-card-title">Review</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {result.results.map((r) => (
                <div key={r.i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: r.correct ? '#166534' : '#b91c1c' }}>{r.correct ? '✓' : '✗'}</span>
                  <span style={{ fontSize: '0.84rem', color: 'var(--charcoal)' }}>
                    Question {r.i + 1}: {r.correct ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {!result.passed && (
              <button onClick={retake} className="auth-submit" style={{ width: 'auto', padding: '12px 28px' }}>Retake quiz</button>
            )}
            <button onClick={() => router.push('/training')} className="portal-logout-btn" style={{ padding: '12px 20px' }}>
              Back to courses
            </button>
          </div>
        </>
      )}
    </div>
  );
}
