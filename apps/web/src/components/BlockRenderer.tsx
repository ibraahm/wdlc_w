import { PageHero, Section, Callout, CtaBand, ButtonOnDark, ButtonPrimary } from '@/components/ui';

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

// ── Block renderers ──────────────────────────────────────────────────────────

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

// ── Main renderer ────────────────────────────────────────────────────────────

export default function BlockRenderer({ blocks }: { blocks: unknown }) {
  const normalised = normalise(blocks);
  if (normalised.length === 0) return null;

  return (
    <>
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
          default:             return null;
        }
      })}
    </>
  );
}
