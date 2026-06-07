import Link from 'next/link';
import type { ReactNode } from 'react';

// ── Container ────────────────────────────────────────────────────────────────
export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

// ── Page hero ────────────────────────────────────────────────────────────────
export function PageHero({
  eyebrow,
  title,
  subtitle,
  tone = 'default',
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  tone?: 'default' | 'gold' | 'green' | 'red';
  children?: ReactNode;
}) {
  const grad = {
    default: 'from-primary to-primary-strong',
    gold: 'from-[#8b681d] to-secondary',
    green: 'from-[#16745f] to-primary',
    red: 'from-[#a73535] to-primary',
  }[tone];

  return (
    <section className={`relative overflow-hidden bg-gradient-to-br ${grad} text-white`}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-white opacity-5 rounded-full blur-3xl" />
      </div>
      <Container className="relative py-16 sm:py-20 lg:py-24">
        {eyebrow && (
          <p className="text-white/70 font-bold uppercase tracking-widest text-xs mb-4">{eyebrow}</p>
        )}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight max-w-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-5 text-lg sm:text-xl text-white/80 max-w-2xl leading-relaxed">{subtitle}</p>}
        {children && <div className="mt-8 flex flex-wrap gap-4">{children}</div>}
      </Container>
    </section>
  );
}

// ── Section wrapper ──────────────────────────────────────────────────────────
export function Section({
  children,
  className = '',
  muted = false,
}: {
  children: ReactNode;
  className?: string;
  muted?: boolean;
}) {
  return (
    <section className={`py-12 sm:py-16 ${muted ? 'bg-[#f5f7fa]' : 'bg-white'} ${className}`}>
      <Container>{children}</Container>
    </section>
  );
}

// ── Buttons ──────────────────────────────────────────────────────────────────
type BtnProps = { href: string; children: ReactNode; external?: boolean; className?: string };

export function ButtonPrimary({ href, children, external, className = '' }: BtnProps) {
  const cls = `inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary-strong transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${className}`;
  return external ? (
    <a href={href} className={cls} target="_blank" rel="noopener noreferrer">{children}</a>
  ) : (
    <Link href={href} className={cls}>{children}</Link>
  );
}

export function ButtonSecondary({ href, children, external, className = '' }: BtnProps) {
  const cls = `inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-primary font-bold border-2 border-primary hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${className}`;
  return external ? (
    <a href={href} className={cls} target="_blank" rel="noopener noreferrer">{children}</a>
  ) : (
    <Link href={href} className={cls}>{children}</Link>
  );
}

// White button on dark hero
export function ButtonOnDark({ href, children, external, className = '' }: BtnProps) {
  const cls = `inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-primary font-bold hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary ${className}`;
  return external ? (
    <a href={href} className={cls} target="_blank" rel="noopener noreferrer">{children}</a>
  ) : (
    <Link href={href} className={cls}>{children}</Link>
  );
}

// ── Headings ─────────────────────────────────────────────────────────────────
export function SectionHeading({ title, subtitle, center = false }: { title: string; subtitle?: string; center?: boolean }) {
  return (
    <div className={`${center ? 'text-center mx-auto' : ''} max-w-3xl mb-8`}>
      <h2 className="text-2xl sm:text-3xl font-bold text-primary-strong">{title}</h2>
      {subtitle && <p className="mt-3 text-lg text-muted">{subtitle}</p>}
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
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
    <div className="h-full bg-white border border-[#d9e0e8] rounded-xl p-6 shadow-sm hover:shadow-md hover:border-secondary/60 transition-all">
      {icon && <div className="w-12 h-12 rounded-lg bg-[#fff4cc] text-primary flex items-center justify-center mb-4 font-bold text-xl">{icon}</div>}
      <h3 className="text-lg font-bold text-primary-strong">{title}</h3>
      {children && <div className="mt-2 text-muted text-sm leading-relaxed">{children}</div>}
      {href && (
        <span className="mt-4 inline-flex items-center text-primary font-semibold text-sm">
          Learn more
          <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      )}
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

// ── Callout / note ───────────────────────────────────────────────────────────
export function Callout({ children, variant = 'gold' }: { children: ReactNode; variant?: 'gold' | 'info' | 'warning' | 'success' }) {
  const styles = {
    gold: 'border-l-4 border-secondary bg-[#fff6d8] text-primary-strong font-bold rounded-lg',
    info: 'border border-accent bg-accent/50 text-primary-strong rounded-lg',
    warning: 'border-l-4 border-[#a73535] bg-red-50 text-[#a73535] font-semibold rounded-lg',
    success: 'border border-[#16745f] bg-green-50 text-[#16745f] rounded-lg',
  }[variant];
  return <div className={`p-4 text-sm leading-relaxed ${styles}`}>{children}</div>;
}

// ── Checklist ────────────────────────────────────────────────────────────────
export function Checklist({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 p-4 border border-[#d9e0e8] rounded-lg bg-[#fbfcfd]">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-primary-strong font-black text-[11px]">
            ✓
          </span>
          <span className="text-muted">{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Numbered steps ───────────────────────────────────────────────────────────
export function Steps({ items }: { items: { title: string; body?: ReactNode }[] }) {
  return (
    <ol className="space-y-4">
      {items.map((item, i) => (
        <li key={i} className="flex gap-4 p-4 border border-[#d9e0e8] rounded-lg bg-[#fbfcfd]">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white font-bold flex items-center justify-center text-sm">
            {i + 1}
          </span>
          <div>
            <p className="font-bold text-primary-strong">{item.title}</p>
            {item.body && <p className="mt-1 text-muted text-sm leading-relaxed">{item.body}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── Stat strip ───────────────────────────────────────────────────────────────
export function StatStrip({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {stats.map((s, i) => (
        <div key={i} className="text-center p-6 bg-white border border-[#d9e0e8] rounded-xl shadow-sm">
          <div className="text-xl font-black text-primary">{s.value}</div>
          <div className="mt-1 text-sm text-muted">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Accordion (FAQ) — pure CSS via <details> ─────────────────────────────────
export function Accordion({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <div className="divide-y divide-[#d9e0e8] border border-[#d9e0e8] rounded-xl overflow-hidden">
      {items.map((item, i) => (
        <details key={i} className="group bg-white">
          <summary className="flex items-center justify-between cursor-pointer list-none px-5 py-4 font-bold text-primary-strong hover:bg-[#f5f7fa]">
            {item.q}
            <svg className="w-5 h-5 text-muted group-open:rotate-180 transition-transform flex-shrink-0 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-5 pb-4 text-muted text-sm leading-relaxed">{item.a}</div>
        </details>
      ))}
    </div>
  );
}

// ── Definition table (key/value facts) ───────────────────────────────────────
export function FactTable({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="border border-[#d9e0e8] rounded-xl overflow-hidden divide-y divide-[#d9e0e8]">
      {rows.map((row, i) => (
        <div key={i} className={`grid grid-cols-1 sm:grid-cols-3 gap-1 px-5 py-3 ${i % 2 === 0 ? 'bg-[#f5f7fa]' : 'bg-white'}`}>
          <dt className="font-bold text-primary-strong">{row.label}</dt>
          <dd className="sm:col-span-2 text-muted">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ── CTA band ─────────────────────────────────────────────────────────────────
export function CtaBand({ heading, children }: { heading: string; children?: ReactNode }) {
  return (
    <section className="bg-primary">
      <Container className="py-14 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{heading}</h2>
        {children && <div className="mt-6 flex flex-wrap justify-center gap-4">{children}</div>}
      </Container>
    </section>
  );
}

// ── Breadcrumb ───────────────────────────────────────────────────────────────
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="text-sm text-muted" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            {item.href ? (
              <Link href={item.href} className="hover:text-primary">{item.label}</Link>
            ) : (
              <span className="text-primary-strong font-medium">{item.label}</span>
            )}
            {i < items.length - 1 && <span aria-hidden="true">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ── Prose wrapper ────────────────────────────────────────────────────────────
export function Prose({ children }: { children: ReactNode }) {
  return <div className="prose">{children}</div>;
}
