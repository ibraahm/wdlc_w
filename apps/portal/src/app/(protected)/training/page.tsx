import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { apiCourses, type CourseSummary } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function TrainingPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let courses: CourseSummary[];
  try {
    courses = await apiCourses(session.accessToken);
  } catch {
    courses = [];
  }

  // Group by category for a tidy catalogue.
  const byCategory = new Map<string, typeof courses>();
  for (const c of courses) {
    if (!byCategory.has(c.category)) byCategory.set(c.category, []);
    byCategory.get(c.category)!.push(c);
  }
  const completed = courses.filter((c) => c.completed).length;

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
              <span>{completed} of {courses.length} courses complete</span>
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
                  <a key={c.id} href={`/training/${c.slug}`} className="dash-card" style={{ display: 'block', textDecoration: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div>
                        <p className="dash-card-title" style={{ marginBottom: '4px' }}>{c.title}</p>
                        {c.description && (
                          <p style={{ fontSize: '0.84rem', color: 'var(--muted)', lineHeight: 1.6 }}>{c.description}</p>
                        )}
                        <p style={{ fontSize: '0.76rem', color: 'var(--muted)', marginTop: '8px' }}>
                          {c.questionCount} question{c.questionCount === 1 ? '' : 's'} · Pass mark {c.passingScore}%
                        </p>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        {c.completed ? (
                          <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#166534', whiteSpace: 'nowrap' }}>
                            ✓ Passed{c.bestScore != null ? ` · ${c.bestScore}%` : ''}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--gold)', whiteSpace: 'nowrap' }}>Start →</span>
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
