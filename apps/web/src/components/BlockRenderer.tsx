import { PageHero, Section, Callout } from '@/components/ui';

type Block = { type: string; data: Record<string, unknown> };

function HeroBlock({ data }: { data: Record<string, unknown> }) {
  return (
    <PageHero
      eyebrow={data.eyebrow as string | undefined}
      title={(data.heading as string) ?? ''}
      subtitle={data.sub as string | undefined}
    />
  );
}

function RichTextBlock({ data }: { data: Record<string, unknown> }) {
  return (
    <Section>
      <div
        className="max-w-3xl space-y-4 text-lg text-charcoal/80 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: (data.html as string) ?? '' }}
      />
    </Section>
  );
}

function CalloutBlock({ data }: { data: Record<string, unknown> }) {
  return (
    <Section>
      <Callout variant={(data.variant as 'info' | 'warning') ?? 'info'}>
        {data.text as string}
      </Callout>
    </Section>
  );
}

function TableBlock({ data }: { data: Record<string, unknown> }) {
  const rows = data.rows as string[][] ?? [];
  return (
    <Section>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-smoke rounded-lg text-sm">
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-ivory' : 'bg-white'}>
                {row.map((cell, j) => (
                  <td key={j} className={`px-5 py-3 ${j === 0 ? 'font-medium text-navy w-40' : 'text-charcoal/80'}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

export default function BlockRenderer({ blocks }: { blocks: Block[] }) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'hero':      return <HeroBlock key={i} data={block.data} />;
          case 'richText':  return <RichTextBlock key={i} data={block.data} />;
          case 'callout':   return <CalloutBlock key={i} data={block.data} />;
          case 'table':     return <TableBlock key={i} data={block.data} />;
          default:          return null;
        }
      })}
    </>
  );
}
