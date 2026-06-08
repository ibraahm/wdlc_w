import { PageHero, Section, Callout, CtaBand, ButtonOnDark, ButtonPrimary } from '@/components/ui';
import NetworkMap from '@/components/NetworkMap';
import { getCmsNetworkCountries } from '@/lib/cms';

// Supports both Puck format ({ content: [...], root: {} }) and legacy format ([{ type, data }])
type LegacyBlock = { type: string; data: Record<string, unknown> };
type PuckBlock = { type: string; props: Record<string, unknown> };
type PuckData = { content: PuckBlock[]; root: { props: Record<string, unknown> } };

function normalise(raw: unknown): { type: string; props: Record<string, unknown> }[] {
  if (!raw) return [];
  if (typeof raw === 'object' && !Array.isArray(raw) && 'content' in (raw as object)) {
    return ((raw as PuckData).content ?? []);
  }
  if (Array.isArray(raw)) {
    return (raw as LegacyBlock[]).map((b) => ({ type: b.type, props: b.data ?? {} }));
  }
  return [];
}

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const lines = (v: unknown): string[] => str(v).split('\n').map((l) => l.trim()).filter(Boolean);

// ── Self-contained design CSS for the home page sections ──────────────────────
// Rendered once per page. Content is visible by default (no JS-gated reveal) so
// the page is never blank, and there are no per-section font/script reloads.
const HOME_CSS = `
.wdl-blocks { --navy:#0B1F3A; --gold:#C9A84C; --gold-light:#DFC278; --gold-dark:#A8872E; --ivory:#FAFAF7; --ivory-dark:#E8E6DF; --text-mid:#4a4a4a; --text-light:#888; --font-heading:'Cormorant Garamond',Georgia,serif; --font-body:'DM Sans',system-ui,-apple-system,sans-serif; font-family:var(--font-body); }
.wdl-blocks * { box-sizing:border-box; }
.wdl-blocks a { text-decoration:none; }
.wdl-blocks .wdl-container { width:100%; max-width:1280px; margin:0 auto; padding:0 32px; }
.wdl-blocks .wdl-em em, .wdl-blocks h1 em, .wdl-blocks h2 em { color:var(--gold-dark); font-style:italic; }
.wdl-blocks .wdl-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:14px 32px; border-radius:4px; font-size:14px; font-weight:500; letter-spacing:.04em; transition:all .3s cubic-bezier(.4,0,.2,1); }
.wdl-blocks .wdl-btn-primary { background:var(--gold); color:var(--navy); }
.wdl-blocks .wdl-btn-primary:hover { background:var(--gold-light); transform:translateY(-1px); box-shadow:0 8px 24px rgba(201,168,76,.35); }
.wdl-blocks .wdl-btn-outline { border:1.5px solid var(--navy); color:var(--navy); background:transparent; }
.wdl-blocks .wdl-btn-outline:hover { background:var(--navy); color:var(--ivory); }
.wdl-blocks .wdl-label { display:block; margin-bottom:12px; color:var(--gold-dark); font-size:12px; font-weight:500; letter-spacing:.12em; text-transform:uppercase; }
.wdl-blocks .wdl-headline { margin:0 0 24px; color:var(--navy); font-family:var(--font-heading); font-size:clamp(40px,4vw,56px); font-weight:400; line-height:1.12; }
.wdl-blocks .wdl-body-text { margin:0 0 16px; color:var(--text-mid); font-size:16px; line-height:1.75; }

/* Hero */
.wdl-hero { position:relative; min-height:92vh; display:flex; align-items:center; overflow:hidden; background:#fff; }
.wdl-hero-bg { position:absolute; inset:0; background-size:cover; background-position:center; }
.wdl-hero-overlay { position:absolute; inset:0; background:rgba(255,255,255,.85); }
.wdl-hero-content { position:relative; z-index:1; padding:96px 0; }
.wdl-hero-eyebrow { display:inline-flex; align-items:center; gap:12px; margin-bottom:24px; }
.wdl-hero-eyebrow::before { content:''; display:block; width:32px; height:1px; background:var(--navy); }
.wdl-hero-eyebrow span { color:var(--navy); font-size:12px; font-weight:500; letter-spacing:.14em; text-transform:uppercase; }
.wdl-hero h1 { margin:0 0 40px; color:var(--navy); font-family:var(--font-heading); font-size:clamp(56px,8vw,112px); font-weight:300; line-height:1.03; letter-spacing:-.01em; }
.wdl-hero h1 em { color:var(--gold); font-style:italic; }
.wdl-hero-actions { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:56px; }
.wdl-hero-stats { display:flex; gap:48px; flex-wrap:wrap; }
.wdl-hero-stat { display:flex; flex-direction:column; gap:4px; }
.wdl-hero-stat-num { color:var(--navy); font-family:var(--font-heading); font-size:32px; font-weight:400; line-height:1; }
.wdl-hero-stat-label { color:var(--navy); font-size:11px; letter-spacing:.1em; text-transform:uppercase; }

/* About */
.wdl-about { background:var(--ivory); padding:96px 0; }
.wdl-about-grid { display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:center; }
.wdl-about-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; margin:32px 0; padding:32px 0; border-top:1px solid var(--ivory-dark); border-bottom:1px solid var(--ivory-dark); }
.wdl-about-stat strong { display:block; margin-bottom:6px; color:var(--navy); font-family:var(--font-heading); font-size:22px; font-weight:500; line-height:1.2; }
.wdl-about-stat small { color:var(--text-light); font-size:12px; line-height:1.5; }
.wdl-about-image img { width:100%; height:500px; object-fit:cover; border-radius:8px; background:#1a3a5c; }
.wdl-about-image-ph { width:100%; height:500px; border-radius:8px; background:linear-gradient(135deg,#0B1F3A,#1a3a5c); }

/* Why */
.wdl-why { background:#fff; padding:96px 0; }
.wdl-why-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:48px; }
.wdl-why-item { display:flex; gap:24px; align-items:flex-start; }
.wdl-why-num { min-width:40px; color:var(--gold-dark); opacity:.5; font-family:var(--font-heading); font-size:32px; line-height:1; }
.wdl-why-title { margin:0 0 8px; color:var(--navy); font-family:var(--font-heading); font-size:28px; font-weight:500; }
.wdl-why-desc { color:var(--text-mid); font-size:15px; line-height:1.7; }
.wdl-why-cta { margin-top:48px; text-align:center; }

/* Stats */
.wdl-stats { padding:48px 20px; background:linear-gradient(145deg,#fff 0%,#f8f9fa 100%); }
.wdl-stats-grid { max-width:1280px; margin:0 auto; display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
.wdl-stat-card { background:#fff; padding:28px 18px; text-align:center; border-radius:16px; box-shadow:0 15px 30px -10px rgba(0,0,0,.1); }
.wdl-stat-card .v { font-size:clamp(1.5rem,2vw,2.4rem); font-weight:800; line-height:1; margin-bottom:10px; color:var(--navy); }
.wdl-stat-card .l { font-size:.8rem; color:#555; font-weight:600; text-transform:uppercase; letter-spacing:.04em; }

/* Agent CTA */
.wdl-agent { background:var(--ivory); padding:96px 0; }
.wdl-agent .wdl-container { max-width:980px; }
.wdl-agent-features { display:grid; grid-template-columns:repeat(2,1fr); gap:24px; margin:32px 0; }
.wdl-agent-feature strong { display:block; margin-bottom:6px; color:var(--navy); font-size:14px; font-weight:600; }
.wdl-agent-feature span { color:var(--text-mid); font-size:14px; line-height:1.65; }

/* Network */
.wdl-net { background:#fff; padding:64px 0; }
.wdl-net-head { max-width:1280px; margin:0 auto 32px; padding:0 32px; }

@media (max-width:900px){
  .wdl-blocks .wdl-about-grid { grid-template-columns:1fr; gap:48px; }
  .wdl-blocks .wdl-why-grid { grid-template-columns:1fr; gap:32px; }
  .wdl-blocks .wdl-agent-features { grid-template-columns:1fr; }
  .wdl-blocks .wdl-stats-grid { grid-template-columns:repeat(2,1fr); }
  .wdl-blocks .wdl-about-image img, .wdl-blocks .wdl-about-image-ph { height:320px; }
}
@media (max-width:640px){
  .wdl-blocks .wdl-container { padding:0 20px; }
  .wdl-blocks .wdl-about, .wdl-blocks .wdl-why, .wdl-blocks .wdl-agent { padding:72px 0; }
  .wdl-blocks .wdl-stats-grid { grid-template-columns:1fr; }
  .wdl-blocks .wdl-hero h1 { font-size:48px; }
}
`;

// ── Legacy / shared blocks ────────────────────────────────────────────────────

function HeroBlock({ props }: { props: Record<string, unknown> }) {
  return (
    <PageHero
      eyebrow={props.eyebrow as string | undefined}
      title={(props.heading as string) ?? ''}
      subtitle={(props.subtitle ?? props.subheading) as string | undefined}
    />
  );
}

function RichTextBlock({ props }: { props: Record<string, unknown> }) {
  const html = (props.html ?? props.content) as string;
  return (
    <Section>
      <div
        className="max-w-2xl space-y-4 text-lg text-charcoal/80 leading-relaxed prose"
        dangerouslySetInnerHTML={{ __html: html ?? '' }}
      />
    </Section>
  );
}

function CalloutBlock({ props }: { props: Record<string, unknown> }) {
  return (
    <Section>
      <Callout variant={(props.variant as 'info' | 'warning') ?? 'info'}>
        {props.text as string}
      </Callout>
    </Section>
  );
}

function FactTableBlock({ props }: { props: Record<string, unknown> }) {
  const rows = (props.rows ?? props.data) as { label: string; value: string }[] ?? [];
  return (
    <Section muted>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-smoke rounded-lg text-sm">
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-ivory' : 'bg-white'}>
                <td className="px-5 py-3 font-medium text-navy w-48 align-top">{row.label}</td>
                <td className="px-5 py-3 text-charcoal/80">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function FeatureGridBlock({ props }: { props: Record<string, unknown> }) {
  const items = props.items as { title: string; body: string; icon?: string }[] ?? [];
  const isDark = props.dark === 'dark';
  const cols = props.columns === '2' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  return (
    <Section dark={isDark}>
      {!!(props.eyebrow || props.heading) && (
        <div className="mb-10">
          {!!props.eyebrow && <div className="eyebrow">{props.eyebrow as string}</div>}
          {!!props.heading && <h2 className={`font-display font-light text-4xl ${isDark ? 'text-ivory' : 'text-navy'}`}>{props.heading as string}</h2>}
        </div>
      )}
      <div className={`grid ${cols} gap-6`}>
        {items.map((item, i) => (
          <div key={i} className={`rounded-xl border p-6 ${isDark ? 'border-white/10 bg-white/5' : 'border-smoke bg-white'}`}>
            {item.icon && <div className="text-2xl mb-3">{item.icon}</div>}
            <div className={`font-medium mb-2 ${isDark ? 'text-ivory' : 'text-navy'}`}>{item.title}</div>
            <div className={`text-sm leading-relaxed ${isDark ? 'text-ivory/60' : 'text-charcoal/70'}`}>{item.body}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function CtaBandBlock({ props }: { props: Record<string, unknown> }) {
  return (
    <CtaBand heading={(props.heading as string) ?? ''}>
      {!!props.buttonText && <ButtonOnDark href={props.buttonHref as string}>{props.buttonText as string}</ButtonOnDark>}
      {!!props.secondaryText && <ButtonPrimary href={props.secondaryHref as string}>{props.secondaryText as string}</ButtonPrimary>}
    </CtaBand>
  );
}

function SpacerBlock({ props }: { props: Record<string, unknown> }) {
  return <div style={{ height: props.size as string ?? '48px' }} />;
}

// ── Home page section blocks (CMS-editable) ───────────────────────────────────

function HomeHeroBlock({ props }: { props: Record<string, unknown> }) {
  const bg = str(props.backgroundImage);
  const stats = arr<{ value: string; label: string }>(props.stats);
  return (
    <section className="wdl-hero" aria-label="Hero">
      {bg && <div className="wdl-hero-bg" style={{ backgroundImage: `url('${bg}')` }} />}
      <div className="wdl-hero-overlay" />
      <div className="wdl-container wdl-hero-content">
        {!!str(props.eyebrow) && (
          <div className="wdl-hero-eyebrow"><span>{str(props.eyebrow)}</span></div>
        )}
        <h1 className="wdl-em" dangerouslySetInnerHTML={{ __html: str(props.headingHtml, 'Connecting<br>the World, <em>since 1999.</em>') }} />
        <div className="wdl-hero-actions">
          {!!str(props.primaryText) && <a className="wdl-btn wdl-btn-primary" href={str(props.primaryHref, '#')}>{str(props.primaryText)} &rarr;</a>}
          {!!str(props.secondaryText) && <a className="wdl-btn wdl-btn-outline" href={str(props.secondaryHref, '#')}>{str(props.secondaryText)}</a>}
        </div>
        {stats.length > 0 && (
          <div className="wdl-hero-stats">
            {stats.map((s, i) => (
              <div className="wdl-hero-stat" key={i}>
                <span className="wdl-hero-stat-num">{s.value}</span>
                <span className="wdl-hero-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function HomeAboutBlock({ props }: { props: Record<string, unknown> }) {
  const stats = arr<{ title: string; desc: string }>(props.stats);
  const image = str(props.image);
  return (
    <section className="wdl-about" aria-label="About">
      <div className="wdl-container wdl-about-grid">
        <div>
          {!!str(props.label) && <p className="wdl-label">{str(props.label)}</p>}
          <h2 className="wdl-headline wdl-em" dangerouslySetInnerHTML={{ __html: str(props.headingHtml, 'Trusted by Families <em>Across the Globe</em>') }} />
          {lines(props.body).map((p, i) => <p className="wdl-body-text" key={i}>{p}</p>)}
          {stats.length > 0 && (
            <div className="wdl-about-stats">
              {stats.map((s, i) => (
                <div className="wdl-about-stat" key={i}><strong>{s.title}</strong><small>{s.desc}</small></div>
              ))}
            </div>
          )}
          {!!str(props.buttonText) && <a className="wdl-btn wdl-btn-outline" href={str(props.buttonHref, '#')}>{str(props.buttonText)} &rarr;</a>}
        </div>
        <div className="wdl-about-image">
          {image ? <img src={image} alt={str(props.label, 'About')} /> : <div className="wdl-about-image-ph" />}
        </div>
      </div>
    </section>
  );
}

function HomeWhyBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ title: string; desc: string }>(props.items);
  return (
    <section className="wdl-why" aria-label="Why choose us">
      <div className="wdl-container">
        <div style={{ marginBottom: 48 }}>
          {!!str(props.label) && <p className="wdl-label">{str(props.label)}</p>}
          <h2 className="wdl-headline wdl-em" style={{ margin: 0 }} dangerouslySetInnerHTML={{ __html: str(props.headingHtml, 'Built on Trust, <em>Driven by Purpose</em>') }} />
        </div>
        <div className="wdl-why-grid">
          {items.map((item, i) => (
            <div className="wdl-why-item" key={i}>
              <span className="wdl-why-num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="wdl-why-title">{item.title}</h3>
                <p className="wdl-why-desc">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        {!!str(props.buttonText) && (
          <div className="wdl-why-cta"><a className="wdl-btn wdl-btn-outline" href={str(props.buttonHref, '#')}>{str(props.buttonText)} &rarr;</a></div>
        )}
      </div>
    </section>
  );
}

function HomeStatsBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ value: string; label: string }>(props.items);
  return (
    <section className="wdl-stats" aria-label="Key statistics">
      <div className="wdl-stats-grid">
        {items.map((s, i) => (
          <div className="wdl-stat-card" key={i}>
            <div className="v">{s.value}</div>
            <div className="l">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HomeAgentCtaBlock({ props }: { props: Record<string, unknown> }) {
  const features = arr<{ title: string; desc: string }>(props.features);
  return (
    <section className="wdl-agent" aria-label="Become an agent">
      <div className="wdl-container">
        {!!str(props.label) && <p className="wdl-label" style={{ color: 'var(--gold)' }}>{str(props.label)}</p>}
        <h2 className="wdl-headline wdl-em" dangerouslySetInnerHTML={{ __html: str(props.headingHtml, 'Grow Your Business <em>With Our Network</em>') }} />
        {lines(props.body).map((p, i) => <p className="wdl-body-text" key={i}>{p}</p>)}
        {features.length > 0 && (
          <div className="wdl-agent-features">
            {features.map((f, i) => (
              <div className="wdl-agent-feature" key={i}><strong>{f.title}</strong><span>{f.desc}</span></div>
            ))}
          </div>
        )}
        {!!str(props.buttonText) && <a className="wdl-btn wdl-btn-primary" href={str(props.buttonHref, '/agents/become-an-agent')}>{str(props.buttonText)} &rarr;</a>}
      </div>
    </section>
  );
}

async function NetworkMapBlock({ props }: { props: Record<string, unknown> }) {
  const countries = await getCmsNetworkCountries();
  return (
    <section className="wdl-net" aria-label="Global payout network">
      <div className="wdl-net-head">
        {!!str(props.label) && <p className="wdl-label">{str(props.label)}</p>}
        <h2 className="wdl-headline wdl-em" style={{ margin: 0 }} dangerouslySetInnerHTML={{ __html: str(props.headingHtml, 'Where Your <em>Money Can Go</em>') }} />
      </div>
      <div className="wdl-container">
        <NetworkMap countries={countries} />
      </div>
    </section>
  );
}

// ── Main renderer ────────────────────────────────────────────────────────────

export default function BlockRenderer({ blocks }: { blocks: unknown }) {
  const normalised = normalise(blocks);
  if (normalised.length === 0) return null;

  return (
    <div className="wdl-blocks">
      <style dangerouslySetInnerHTML={{ __html: HOME_CSS }} />
      {normalised.map((block, i) => {
        switch (block.type) {
          case 'Hero':
          case 'hero':         return <HeroBlock key={i} props={block.props} />;
          case 'RichText':
          case 'richText':
          case 'text':         return <RichTextBlock key={i} props={block.props} />;
          case 'Callout':
          case 'callout':      return <CalloutBlock key={i} props={block.props} />;
          case 'FactTable':
          case 'table':        return <FactTableBlock key={i} props={block.props} />;
          case 'FeatureGrid':
          case 'features':     return <FeatureGridBlock key={i} props={block.props} />;
          case 'CtaBand':
          case 'cta':          return <CtaBandBlock key={i} props={block.props} />;
          case 'Spacer':       return <SpacerBlock key={i} props={block.props} />;
          case 'HomeHero':     return <HomeHeroBlock key={i} props={block.props} />;
          case 'HomeAbout':    return <HomeAboutBlock key={i} props={block.props} />;
          case 'HomeWhy':      return <HomeWhyBlock key={i} props={block.props} />;
          case 'HomeStats':    return <HomeStatsBlock key={i} props={block.props} />;
          case 'HomeAgentCta': return <HomeAgentCtaBlock key={i} props={block.props} />;
          case 'NetworkMap':
          case 'networkMap':   return <NetworkMapBlock key={i} props={block.props} />;
          default:             return null;
        }
      })}
    </div>
  );
}
