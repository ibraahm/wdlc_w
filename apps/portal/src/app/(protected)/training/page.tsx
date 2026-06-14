import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { apiCourses, type CourseSummary } from '@/lib/api';

export const dynamic = 'force-dynamic';

const LANG_LABEL: Record<string, string> = {
  en: 'English', es: 'Español', fr: 'Français', pt: 'Português', zh: '中文', ar: 'العربية', vi: 'Tiếng Việt', ht: 'Kreyòl',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function TrainingPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let courses: CourseSummary[];
  try {
    courses = await apiCourses(session.accessToken);
  } catch {
    courses = [];
  }

  const byCategory = new Map<string, CourseSummary[]>();
  for (const c of courses) {
    if (!byCategory.has(c.category)) byCategory.set(c.category, []);
    byCategory.get(c.category)!.push(c);
  }
  const completed = courses.filter((c) => c.completed).length;
  const overdueCount = courses.filter((c) => c.overdue).length;

  return (
    <div className="portal-content">
      <div className="dash-eyebrow">Agent Portal</div>
      <h1 className="dash-title">Training & Courses</h1>

      {courses.length === 0 ? (
        <div className="dash-card">
          <p className="dash-card-title">No courses assigned yet</p>
          <p style={{ fontSize: '0.84rem', color: 'var(--muted)', marginTop: '8px', lineHeight: 1.6 }}>
            When World Direct Link assigns training to you or your branch, it will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="dash-card" style={{ borderLeft: '3px solid var(--gold)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '6px' }}>
              <span>{completed} of {courses.length} courses complete{overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}</span>
              <span>{Math.round((completed / courses.length) * 100)}%</span>
            </div>
            <div style={{ height: '5px', background: 'var(--smoke)', borderRadius: '3px' }}>
              <div style={{ height: '100%', width: `${(completed / courses.length) * 100}%`, background: 'var(--gold)', borderRadius: '3px', transition: 'width 0.4s' }} />
            </div>
          </div>

          {Array.from(byCategory.entries()).map(([category, list]) => (
            <div key={category} style={{ marginTop: '8px' }}>
              <p style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', margin: '12px 0 8px' }}>{category}</p>
              <div style={{ display: 'grid', gap: '12px' }}>
                {list.map((c) => (
                  <a key={c.slug} href={`/training/${c.slug}`} className="dash-card" style={{ display: 'block', textDecoration: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <p className="dash-card-title" style={{ margin: 0, padding: 0, border: 0, fontSize: '0.95rem', letterSpacing: 0, textTransform: 'none', color: 'var(--charcoal)' }}>{c.title}</p>
                          {c.overdue && <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#b91c1c', background: 'rgba(185,28,28,0.08)', padding: '2px 8px', borderRadius: '10px' }}>OVERDUE</span>}
                          {c.languages.length > 1 && <span style={{ fontSize: '0.62rem', color: 'var(--muted)', border: '1px solid var(--smoke)', padding: '2px 8px', borderRadius: '10px' }}>{c.languages.map((l) => LANG_LABEL[l] || l.toUpperCase()).join(' · ')}</span>}
                        </div>
                        {c.description && (
                          <p style={{ fontSize: '0.84rem', color: 'var(--muted)', lineHeight: 1.6 }}>{c.description}</p>
                        )}
                        <p style={{ fontSize: '0.76rem', color: 'var(--muted)', marginTop: '8px' }}>
                          {c.lessonCount > 0 && <>{c.lessonCount} lesson{c.lessonCount === 1 ? '' : 's'} · </>}
                          {c.questionCount} question{c.questionCount === 1 ? '' : 's'} · Pass {c.passingScore}%
                          {c.dueAt && <> · Due {fmtDate(c.dueAt)}</>}
                        </p>
                        {/* Progress */}
                        <div style={{ marginTop: '10px', maxWidth: '320px' }}>
                          <div style={{ height: '4px', background: 'var(--smoke)', borderRadius: '2px' }}>
                            <div style={{ height: '100%', width: `${c.completed ? 100 : c.progressPct}%`, background: c.completed ? '#166534' : 'var(--gold)', borderRadius: '2px' }} />
                          </div>
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        {c.completed ? (
                          <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#166534', whiteSpace: 'nowrap' }}>
                            ✓ Passed{c.bestScore != null ? ` · ${c.bestScore}%` : ''}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--gold)', whiteSpace: 'nowrap' }}>
                            {c.progressPct > 0 ? 'Continue →' : 'Start →'}
                          </span>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
