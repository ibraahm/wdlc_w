import Link from 'next/link';
import type { ReactNode } from 'react';

// ── Shell container ───────────────────────────────────────────────────────────
export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`shell ${className}`}>{children}</div>;
}

// ── Page hero (interior pages) ───────────────────────────────────────────────
export function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  tone?: string; // kept for API compat, unused
  children?: ReactNode;
}) {
  return (
    <section className="page-hero">
      <div className="shell">
        {eyebrow && (
          <div className="eyebrow">
            <span />
            <p>{eyebrow}</p>
          </div>
        )}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
        {children && (
          <div style={{ marginTop: '32px', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {children}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Section wrapper ──────────────────────────────────────────────────────────
export function Section({
  children,
  className = '',
  muted = false,
  dark = false,
}: {
  children: ReactNode;
  className?: string;
  muted?: boolean;
  dark?: boolean;
}) {
  const base = dark ? 'dark-section' : muted ? 'page-section page-section-muted' : 'page-section';
  return (
    <section className={`${base} ${className}`}>
      <div className="shell">{children}</div>
    </section>
  );
}

// ── Buttons ──────────────────────────────────────────────────────────────────
type BtnProps = { href: string; children: ReactNode; external?: boolean; className?: string };

export function ButtonPrimary({ href, children, external, className = '' }: BtnProps) {
  const cls = `button button-gold ${className}`;
  return external ? (
    <a href={href} className={cls} target="_blank" rel="noopener noreferrer">{children}</a>
  ) : (
    <Link href={href} className={cls}>{children}</Link>
  );
}

export function ButtonSecondary({ href, children, external, className = '' }: BtnProps) {
  const cls = `button button-ghost ${className}`;
  return external ? (
    <a href={href} className={cls} target="_blank" rel="noopener noreferrer">{children}</a>
  ) : (
    <Link href={href} className={cls}>{children}</Link>
  );
}

export function ButtonOnDark({ href, children, external, className = '' }: BtnProps) {
  const cls = `button button-gold ${className}`;
  return external ? (
    <a href={href} className={cls} target="_blank" rel="noopener noreferrer">{children}</a>
  ) : (
    <Link href={href} className={cls}>{children}</Link>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
export function SectionHeading({
  title,
  subtitle,
  center = false,
  eyebrow,
  dark = false,
}: {
  title: string;
  subtitle?: string;
  center?: boolean;
  eyebrow?: string;
  dark?: boolean;
}) {
  return (
    <div style={{ textAlign: center ? 'center' : 'left', marginBottom: '48px' }}>
      {eyebrow && (
        <div className="eyebrow" style={{ justifyContent: center ? 'center' : 'flex-start' }}>
          <span />
          <p>{eyebrow}</p>
        </div>
      )}
      <h2 style={{ color: dark ? 'var(--ivory)' : 'var(--navy)', fontSize: 'clamp(1.8rem, 3.5vw, 3rem)', marginTop: eyebrow ? '16px' : 0 }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ color: dark ? 'var(--muted-dark)' : 'var(--muted)', maxWidth: '540px', margin: center ? '12px auto 0' : '12px 0 0', fontWeight: 300, lineHeight: 1.85 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ── Card (light) ──────────────────────────────────────────────────────────────
export function Card({
  title,
  children,
  href,
  icon,
}: {
  title: string;
  children?: ReactNode;
  href?: string;
  icon?: ReactNode;
}) {
  const inner = (
    <div className="card-light" style={{ height: '100%' }}>
      {icon && (
        <div style={{ width: '44px', height: '44px', background: 'rgba(200,150,12,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', color: 'var(--gold)', fontSize: '1.2rem' }}>
          {icon}
        </div>
      )}
      <h3 style={{ fontFamily: 'var(--display)', fontWeight: 400, fontSize: '1.4rem', color: 'var(--navy)', margin: '0 0 10px' }}>{title}</h3>
      {children && <div style={{ color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.85, fontWeight: 300 }}>{children}</div>}
      {href && (
        <div style={{ marginTop: '20px', color: 'var(--gold)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
          Learn more →
        </div>
      )}
    </div>
  );
  return href ? <Link href={href} style={{ display: 'block', height: '100%' }}>{inner}</Link> : inner;
}

// ── Callout ───────────────────────────────────────────────────────────────────
export function Callout({ children, variant = 'gold' }: { children: ReactNode; variant?: 'gold' | 'info' | 'warning' | 'success' }) {
  const cls = variant === 'gold' ? 'callout-gold' : variant === 'warning' ? 'callout-warning' : 'callout-info';
  return <div className={cls}>{children}</div>;
}

// ── Checklist ────────────────────────────────────────────────────────────────
export function Checklist({ items }: { items: ReactNode[] }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: '1px solid var(--smoke)' }}>
          <span style={{ flexShrink: 0, width: '20px', height: '20px', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: 700 }}>✓</span>
          <span style={{ color: 'var(--charcoal)', fontSize: '0.9rem', lineHeight: 1.7, fontWeight: 300 }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Numbered steps ────────────────────────────────────────────────────────────
export function Steps({ items }: { items: { title: string; body?: ReactNode }[] }) {
  return (
    <div className="timeline" style={{ marginTop: '20px' }}>
      {items.map((item, i) => (
        <article key={i}>
          <span>0{i + 1}</span>
          <p><strong style={{ color: 'var(--navy)', fontWeight: 600, fontSize: '0.95rem' }}>{item.title}</strong></p>
          {item.body && <p style={{ marginTop: '4px', color: 'var(--muted)', fontSize: '0.88rem' }}>{item.body}</p>}
        </article>
      ))}
    </div>
  );
}

// ── Stat strip ────────────────────────────────────────────────────────────────
export function StatStrip({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, minmax(0,1fr))`, gap: '1px', background: 'var(--smoke)' }}>
      {stats.map((s, i) => (
        <div key={i} style={{ background: 'var(--ivory)', padding: 'clamp(24px,4vw,40px)', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: '2.4rem', fontWeight: 300, color: 'var(--navy)', lineHeight: 1 }}>{s.value}</div>
          <div style={{ marginTop: '8px', color: 'var(--gold)', fontSize: '0.56rem', letterSpacing: '0.24em', textTransform: 'uppercase' }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Accordion ────────────────────────────────────────────────────────────────
export function Accordion({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <div style={{ borderTop: '1px solid var(--smoke)' }}>
      {items.map((item, i) => (
        <details key={i} style={{ borderBottom: '1px solid var(--smoke)' }}>
          <summary style={{ padding: '20px 0', fontWeight: 500, color: 'var(--navy)', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem' }}>
            {item.q}
            <span style={{ color: 'var(--gold)', fontSize: '1.2rem', lineHeight: 1 }}>+</span>
          </summary>
          <div style={{ paddingBottom: '20px', color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.85, fontWeight: 300 }}>{item.a}</div>
        </details>
      ))}
    </div>
  );
}

// ── Fact table ────────────────────────────────────────────────────────────────
export function FactTable({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl style={{ borderTop: '1px solid var(--smoke)' }}>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', padding: '16px 0', borderBottom: '1px solid var(--smoke)', background: i % 2 === 0 ? 'transparent' : 'rgba(200,150,12,0.03)' }}>
          <dt style={{ fontWeight: 600, color: 'var(--navy)', fontSize: '0.88rem' }}>{row.label}</dt>
          <dd style={{ margin: 0, color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.7, fontWeight: 300 }}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ── CTA band ──────────────────────────────────────────────────────────────────
export function CtaBand({ heading, children }: { heading: string; children?: ReactNode }) {
  return (
    <section className="dark-section" style={{ textAlign: 'center' }}>
      <div className="shell">
        <h2 style={{ color: 'var(--ivory)', fontSize: 'clamp(2rem, 4vw, 3.6rem)' }}>{heading}</h2>
        {children && (
          <div style={{ marginTop: '40px', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
            {children}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: '32px' }}>
      <ol style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((item, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {item.href ? (
              <Link href={item.href} style={{ color: 'var(--gold)', fontSize: '0.78rem', letterSpacing: '0.14em' }}>{item.label}</Link>
            ) : (
              <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>{item.label}</span>
            )}
            {i < items.length - 1 && <span style={{ color: 'var(--smoke)', fontSize: '0.7rem' }}>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ── Prose ─────────────────────────────────────────────────────────────────────
export function Prose({ children }: { children: ReactNode }) {
  return <div className="prose-content">{children}</div>;
}
