import type { Config } from '@measured/puck';

// Shared inline styles matching the WDLC design system
const navy = '#0b1f3a';
const gold = '#c8960c';
const ivory = '#fafaf7';
const smoke = '#e8e4dc';
const charcoal = '#2c2c2c';
const displayFont = '"Cormorant Garamond", Georgia, serif';
const bodyFont = '"DM Sans", system-ui, sans-serif';

export type PuckData = {
  content: { type: string; props: Record<string, unknown> }[];
  root: { props: Record<string, unknown> };
  zones?: Record<string, unknown>;
};

// ── Shared design options injected into every block (except Spacer) ───────────
// These map 1:1 to the data-* attributes the live site keys its design CSS off.
const designFields = {
  width: {
    type: 'select' as const,
    label: 'Section width',
    options: [
      { label: 'Boxed (1080px)', value: 'boxed' },
      { label: 'Wide (1320px)', value: 'wide' },
      { label: 'Full width', value: 'full' },
    ],
  },
  paddingY: {
    type: 'select' as const,
    label: 'Vertical spacing',
    options: [
      { label: 'Default', value: 'default' },
      { label: 'None', value: 'none' },
      { label: 'Compact', value: 'compact' },
      { label: 'Normal', value: 'normal' },
      { label: 'Spacious', value: 'spacious' },
    ],
  },
  background: {
    type: 'select' as const,
    label: 'Background',
    options: [
      { label: 'Default (block default)', value: 'default' },
      { label: 'White', value: 'white' },
      { label: 'Ivory', value: 'ivory' },
      { label: 'Navy (dark)', value: 'navy' },
    ],
  },
  align: {
    type: 'radio' as const,
    label: 'Text alignment',
    options: [
      { label: 'Left', value: 'left' },
      { label: 'Center', value: 'center' },
    ],
  },
};

const designDefaults = { width: 'wide', paddingY: 'default', background: 'default', align: 'left' };

const baseComponents: Config['components'] = {
    Hero: {
      label: 'Hero Banner',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow label' },
        heading: { type: 'text', label: 'Heading' },
        subtitle: { type: 'textarea', label: 'Subtitle' },
        align: {
          type: 'radio',
          label: 'Alignment',
          options: [
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
          ],
        },
      },
      defaultProps: {
        eyebrow: 'Section',
        heading: 'Page Heading',
        subtitle: 'A short description of this page.',
        align: 'left',
      },
      render: ({ eyebrow, heading, subtitle, align }) => (
        <div style={{ background: navy, color: ivory, padding: '80px 48px', fontFamily: bodyFont, textAlign: align as 'left' | 'center' }}>
          {eyebrow && (
            <div style={{ color: gold, textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.72rem', fontWeight: 500, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: align === 'center' ? 'center' : 'flex-start' }}>
              <span style={{ display: 'inline-block', width: '32px', height: '1px', background: gold }} />
              {eyebrow}
            </div>
          )}
          <h1 style={{ fontFamily: displayFont, fontSize: 'clamp(2.4rem, 5vw, 4rem)', fontWeight: 300, margin: 0, lineHeight: 1.1 }}>{heading}</h1>
          {subtitle && <p style={{ marginTop: '20px', fontSize: '1.1rem', opacity: 0.72, maxWidth: '600px', lineHeight: 1.6, margin: align === 'center' ? '20px auto 0' : '20px 0 0' }}>{subtitle}</p>}
        </div>
      ),
    },

    RichText: {
      label: 'Rich Text',
      fields: {
        html: { type: 'textarea', label: 'HTML Content' },
        maxWidth: {
          type: 'radio',
          label: 'Width',
          options: [
            { value: '680px', label: 'Narrow' },
            { value: '860px', label: 'Normal' },
            { value: '100%', label: 'Full' },
          ],
        },
      },
      defaultProps: {
        html: '<p>Enter your content here. You can use <strong>bold</strong>, <em>italic</em>, and <a href="#">links</a>.</p>',
        maxWidth: '680px',
      },
      render: ({ html, maxWidth }) => (
        <div style={{ padding: '48px', fontFamily: bodyFont }}>
          <div
            style={{ maxWidth, fontSize: '1.05rem', lineHeight: 1.75, color: charcoal }}
            dangerouslySetInnerHTML={{ __html: html as string }}
          />
        </div>
      ),
    },

    FactTable: {
      label: 'Fact Table',
      fields: {
        rows: {
          type: 'array',
          label: 'Rows',
          arrayFields: {
            label: { type: 'text', label: 'Label' },
            value: { type: 'text', label: 'Value' },
          },
          defaultItemProps: { label: 'Label', value: 'Value' },
        },
      },
      defaultProps: {
        rows: [
          { label: 'Founded', value: 'November 2, 1999' },
          { label: 'Headquarters', value: 'Stone Mountain, Georgia' },
        ],
      },
      render: ({ rows }) => (
        <div style={{ padding: '40px 48px', fontFamily: bodyFont }}>
          <table style={{ width: '100%', maxWidth: '720px', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <tbody>
              {(rows as { label: string; value: string }[]).map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${smoke}` }}>
                  <td style={{ padding: '14px 16px 14px 0', fontWeight: 500, color: navy, width: '200px', verticalAlign: 'top' }}>{row.label}</td>
                  <td style={{ padding: '14px 0', color: charcoal }}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
    },

    Callout: {
      label: 'Callout',
      fields: {
        text: { type: 'textarea', label: 'Text' },
        variant: {
          type: 'radio',
          label: 'Variant',
          options: [
            { value: 'gold', label: 'Gold' },
            { value: 'info', label: 'Info' },
            { value: 'warning', label: 'Warning' },
          ],
        },
      },
      defaultProps: {
        text: 'An important note or highlight for this section.',
        variant: 'gold',
      },
      render: ({ text, variant }) => {
        const styles: Record<string, { bg: string; border: string; color: string }> = {
          gold: { bg: '#fdf9ee', border: gold, color: '#7a5a00' },
          info: { bg: '#eff6ff', border: '#3b82f6', color: '#1e40af' },
          warning: { bg: '#fffbeb', border: '#f59e0b', color: '#92400e' },
        };
        const s = styles[variant as string] ?? styles.gold;
        return (
          <div style={{ padding: '16px 48px', fontFamily: bodyFont }}>
            <div style={{ borderLeft: `4px solid ${s.border}`, background: s.bg, color: s.color, padding: '20px 24px', borderRadius: '0 8px 8px 0', fontSize: '0.97rem', lineHeight: 1.65 }}>
              {text as string}
            </div>
          </div>
        );
      },
    },

    FeatureGrid: {
      label: 'Feature Grid',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        heading: { type: 'text', label: 'Section heading' },
        dark: { type: 'radio', label: 'Background', options: [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] },
        columns: { type: 'radio', label: 'Columns', options: [{ value: '2', label: '2' }, { value: '3', label: '3' }] },
        items: {
          type: 'array',
          label: 'Cards',
          arrayFields: {
            title: { type: 'text', label: 'Title' },
            body: { type: 'textarea', label: 'Body' },
            icon: { type: 'text', label: 'Icon (emoji)' },
          },
          defaultItemProps: { title: 'Feature', body: 'Description of this feature.', icon: '✦' },
        },
      },
      defaultProps: {
        eyebrow: '',
        heading: 'Features',
        dark: 'light',
        columns: '3',
        items: [
          { title: 'Speed', body: 'Transfers complete in minutes.', icon: '⚡' },
          { title: 'Trust', body: 'Licensed in 20 states.', icon: '🛡️' },
          { title: 'Value', body: 'Competitive exchange rates.', icon: '💱' },
        ],
      },
      render: ({ eyebrow, heading, dark, columns, items }) => {
        const isDark = dark === 'dark';
        const cols = columns === '2' ? 2 : 3;
        return (
          <div style={{ background: isDark ? navy : ivory, padding: '64px 48px', fontFamily: bodyFont }}>
            {(eyebrow || heading) && (
              <div style={{ marginBottom: '40px' }}>
                {eyebrow && <div style={{ color: gold, textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.72rem', fontWeight: 500, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}><span style={{ display: 'inline-block', width: '32px', height: '1px', background: gold }} />{eyebrow}</div>}
                {heading && <h2 style={{ fontFamily: displayFont, fontSize: '2.2rem', fontWeight: 300, color: isDark ? ivory : navy, margin: 0 }}>{heading}</h2>}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '24px' }}>
              {(items as { title: string; body: string; icon: string }[]).map((item, i) => (
                <div key={i} style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'white', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : smoke}`, borderRadius: '12px', padding: '28px 24px' }}>
                  {item.icon && <div style={{ fontSize: '1.5rem', marginBottom: '12px' }}>{item.icon}</div>}
                  <div style={{ fontWeight: 500, fontSize: '1rem', color: isDark ? ivory : navy, marginBottom: '8px' }}>{item.title}</div>
                  <div style={{ fontSize: '0.9rem', color: isDark ? 'rgba(255,255,255,0.6)' : charcoal, lineHeight: 1.6 }}>{item.body}</div>
                </div>
              ))}
            </div>
          </div>
        );
      },
    },

    CtaBand: {
      label: 'CTA Band',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        heading: { type: 'text', label: 'Heading' },
        body: { type: 'textarea', label: 'Body text (optional)' },
        buttonText: { type: 'text', label: 'Button text' },
        buttonHref: { type: 'text', label: 'Button href' },
        secondaryText: { type: 'text', label: 'Secondary button text (optional)' },
        secondaryHref: { type: 'text', label: 'Secondary button href (optional)' },
      },
      defaultProps: {
        eyebrow: '',
        heading: 'Ready to get started?',
        body: '',
        buttonText: 'Get Started',
        buttonHref: '/agents/become-an-agent',
        secondaryText: '',
        secondaryHref: '',
      },
      render: ({ eyebrow, heading, body, buttonText, buttonHref, secondaryText, secondaryHref }) => (
        <div style={{ background: navy, color: ivory, padding: '80px 48px', fontFamily: bodyFont, textAlign: 'center' }}>
          {eyebrow && <div style={{ color: gold, textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.72rem', fontWeight: 500, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}><span style={{ display: 'inline-block', width: '32px', height: '1px', background: gold }} />{eyebrow}</div>}
          <h2 style={{ fontFamily: displayFont, fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 300, margin: 0, lineHeight: 1.15 }}>{heading}</h2>
          {body && <p style={{ marginTop: '16px', opacity: 0.72, maxWidth: '560px', margin: '16px auto 0', lineHeight: 1.65 }}>{body}</p>}
          <div style={{ marginTop: '36px', display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={buttonHref as string} style={{ background: gold, color: navy, padding: '14px 32px', borderRadius: '4px', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem' }}>{buttonText}</a>
            {secondaryText && <a href={secondaryHref as string} style={{ border: `1px solid rgba(255,255,255,0.3)`, color: ivory, padding: '14px 32px', borderRadius: '4px', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem' }}>{secondaryText}</a>}
          </div>
        </div>
      ),
    },

    HomeHero: {
      label: 'Home · Hero',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        headingHtml: { type: 'textarea', label: 'Heading (HTML — use <br> and <em>)' },
        primaryText: { type: 'text', label: 'Primary button text' },
        primaryHref: { type: 'text', label: 'Primary button link' },
        secondaryText: { type: 'text', label: 'Secondary button text' },
        secondaryHref: { type: 'text', label: 'Secondary button link' },
        backgroundImage: { type: 'text', label: 'Background image URL (optional)' },
        stats: {
          type: 'array', label: 'Stats',
          arrayFields: { value: { type: 'text', label: 'Value' }, label: { type: 'text', label: 'Label' } },
          defaultItemProps: { value: '1999', label: 'Founded' },
        },
      },
      defaultProps: {
        eyebrow: 'Global Money Transfer · Est. 1999 · NMLS 1119263',
        headingHtml: 'Connecting<br>the World,<br><em>since 1999.</em>',
        primaryText: 'Send Money Now', primaryHref: '/find-an-agent',
        secondaryText: 'Become an Agent', secondaryHref: '/agents/become-an-agent',
        backgroundImage: '',
        stats: [{ value: '1999', label: 'Founded' }, { value: '1M+', label: 'Customers' }],
      },
      render: ({ eyebrow, headingHtml, primaryText, secondaryText, stats }) => (
        <div style={{ background: ivory, padding: '80px 48px', fontFamily: bodyFont }}>
          {eyebrow ? <div style={{ color: navy, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: '.7rem', marginBottom: 20 }}>{eyebrow as string}</div> : null}
          <h1 style={{ fontFamily: displayFont, fontSize: 'clamp(2.6rem,6vw,5rem)', fontWeight: 300, color: navy, margin: 0, lineHeight: 1.05 }} dangerouslySetInnerHTML={{ __html: headingHtml as string }} />
          <div style={{ marginTop: 32, display: 'flex', gap: 16 }}>
            {primaryText ? <span style={{ background: gold, color: navy, padding: '14px 32px', borderRadius: 4, fontSize: '.9rem', fontWeight: 500 }}>{primaryText as string}</span> : null}
            {secondaryText ? <span style={{ border: `1.5px solid ${navy}`, color: navy, padding: '14px 32px', borderRadius: 4, fontSize: '.9rem', fontWeight: 500 }}>{secondaryText as string}</span> : null}
          </div>
          <div style={{ marginTop: 40, display: 'flex', gap: 48 }}>
            {(stats as { value: string; label: string }[]).map((s, i) => (
              <div key={i}><div style={{ fontFamily: displayFont, fontSize: 32, color: navy }}>{s.value}</div><div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: navy }}>{s.label}</div></div>
            ))}
          </div>
        </div>
      ),
    },

    HomeAbout: {
      label: 'Home · About',
      fields: {
        label: { type: 'text', label: 'Eyebrow label' },
        headingHtml: { type: 'textarea', label: 'Heading (HTML — use <em>)' },
        body: { type: 'textarea', label: 'Body (one paragraph per line)' },
        image: { type: 'text', label: 'Image URL (optional)' },
        stats: {
          type: 'array', label: 'Highlights',
          arrayFields: { title: { type: 'text', label: 'Title' }, desc: { type: 'textarea', label: 'Description' } },
          defaultItemProps: { title: 'Highlight', desc: 'Description.' },
        },
        buttonText: { type: 'text', label: 'Button text' },
        buttonHref: { type: 'text', label: 'Button link' },
      },
      defaultProps: {
        label: 'Our Story',
        headingHtml: 'Trusted by Families <em>Across the Globe</em>',
        body: 'World Direct Link, Corp. has been connecting people with their loved ones since 1999.',
        image: '',
        stats: [{ title: 'Same-Day Transfers', desc: 'Our signature quick service.' }],
        buttonText: 'Learn More', buttonHref: '/about',
      },
      render: ({ label, headingHtml, body }) => (
        <div style={{ background: ivory, padding: '64px 48px', fontFamily: bodyFont }}>
          {label ? <div style={{ color: gold, textTransform: 'uppercase', letterSpacing: '.12em', fontSize: '.7rem', marginBottom: 12 }}>{label as string}</div> : null}
          <h2 style={{ fontFamily: displayFont, fontSize: '2.4rem', fontWeight: 400, color: navy, margin: '0 0 16px' }} dangerouslySetInnerHTML={{ __html: headingHtml as string }} />
          <p style={{ color: charcoal, lineHeight: 1.7, maxWidth: 640 }}>{(body as string)?.split('\n')[0]}</p>
        </div>
      ),
    },

    HomeWhy: {
      label: 'Home · Why Us',
      fields: {
        label: { type: 'text', label: 'Eyebrow label' },
        headingHtml: { type: 'textarea', label: 'Heading (HTML — use <em>)' },
        items: {
          type: 'array', label: 'Reasons (auto-numbered)',
          arrayFields: { title: { type: 'text', label: 'Title' }, desc: { type: 'textarea', label: 'Description' } },
          defaultItemProps: { title: 'Reason', desc: 'Description.' },
        },
        buttonText: { type: 'text', label: 'Button text' },
        buttonHref: { type: 'text', label: 'Button link' },
      },
      defaultProps: {
        label: 'Why World Direct Link',
        headingHtml: 'Built on Trust, <em>Driven by Purpose</em>',
        items: [
          { title: 'Speed', desc: 'Most transfers complete within minutes.' },
          { title: 'Security', desc: 'Bank-grade encryption and 24/7 monitoring.' },
        ],
        buttonText: 'View Coverage', buttonHref: '/about',
      },
      render: ({ label, headingHtml, items }) => (
        <div style={{ background: 'white', padding: '64px 48px', fontFamily: bodyFont }}>
          {label ? <div style={{ color: gold, textTransform: 'uppercase', letterSpacing: '.12em', fontSize: '.7rem', marginBottom: 12 }}>{label as string}</div> : null}
          <h2 style={{ fontFamily: displayFont, fontSize: '2.2rem', fontWeight: 400, color: navy, margin: '0 0 32px' }} dangerouslySetInnerHTML={{ __html: headingHtml as string }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            {(items as { title: string; desc: string }[]).map((it, i) => (
              <div key={i} style={{ display: 'flex', gap: 16 }}>
                <span style={{ fontFamily: displayFont, fontSize: 28, color: gold, opacity: .5 }}>{String(i + 1).padStart(2, '0')}</span>
                <div><div style={{ fontFamily: displayFont, fontSize: 22, color: navy }}>{it.title}</div><div style={{ fontSize: '.9rem', color: charcoal, lineHeight: 1.6 }}>{it.desc}</div></div>
              </div>
            ))}
          </div>
        </div>
      ),
    },

    HomeStats: {
      label: 'Home · Stat Cards',
      fields: {
        items: {
          type: 'array', label: 'Stat cards',
          arrayFields: { value: { type: 'text', label: 'Value' }, label: { type: 'text', label: 'Label' } },
          defaultItemProps: { value: '1M+', label: 'Customers Served' },
        },
      },
      defaultProps: {
        items: [
          { value: '1,000,000+', label: 'Customers Served' },
          { value: '$300M+', label: 'Remittances Annually' },
          { value: '$300', label: 'Average Transaction' },
          { value: '50+', label: 'Payout Network Countries' },
        ],
      },
      render: ({ items }) => (
        <div style={{ padding: '40px 48px', background: '#f8f9fa', fontFamily: bodyFont, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          {(items as { value: string; label: string }[]).map((s, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 16, padding: 24, textAlign: 'center', boxShadow: '0 15px 30px -10px rgba(0,0,0,.1)' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: navy }}>{s.value}</div>
              <div style={{ fontSize: '.75rem', textTransform: 'uppercase', color: '#555', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      ),
    },

    HomeAgentCta: {
      label: 'Home · Agent CTA',
      fields: {
        label: { type: 'text', label: 'Eyebrow label' },
        headingHtml: { type: 'textarea', label: 'Heading (HTML — use <em>)' },
        body: { type: 'textarea', label: 'Body (one paragraph per line)' },
        features: {
          type: 'array', label: 'Features',
          arrayFields: { title: { type: 'text', label: 'Title' }, desc: { type: 'textarea', label: 'Description' } },
          defaultItemProps: { title: 'Feature', desc: 'Description.' },
        },
        buttonText: { type: 'text', label: 'Button text' },
        buttonHref: { type: 'text', label: 'Button link' },
      },
      defaultProps: {
        label: 'Agent Opportunity',
        headingHtml: 'Grow Your Business <em>With Our Network</em>',
        body: 'Join hundreds of entrepreneurs who have built successful businesses as World Direct Link agents.',
        features: [
          { title: 'Training', desc: 'Full onboarding and compliance training.' },
          { title: 'Revenue', desc: 'Competitive commission structure.' },
        ],
        buttonText: 'Apply Now', buttonHref: '/agents/become-an-agent',
      },
      render: ({ label, headingHtml, body }) => (
        <div style={{ background: ivory, padding: '64px 48px', fontFamily: bodyFont }}>
          {label ? <div style={{ color: gold, textTransform: 'uppercase', letterSpacing: '.12em', fontSize: '.7rem', marginBottom: 12 }}>{label as string}</div> : null}
          <h2 style={{ fontFamily: displayFont, fontSize: '2.4rem', fontWeight: 400, color: navy, margin: '0 0 16px' }} dangerouslySetInnerHTML={{ __html: headingHtml as string }} />
          <p style={{ color: charcoal, lineHeight: 1.7, maxWidth: 640 }}>{(body as string)?.split('\n')[0]}</p>
        </div>
      ),
    },

    NetworkMap: {
      label: 'Home · Network Map',
      fields: {
        label: { type: 'text', label: 'Eyebrow label' },
        headingHtml: { type: 'textarea', label: 'Heading (HTML — use <em>)' },
      },
      defaultProps: {
        label: 'Payout Network',
        headingHtml: 'Where Your <em>Money Can Go</em>',
      },
      render: ({ label, headingHtml }) => (
        <div style={{ background: 'white', padding: '48px', fontFamily: bodyFont, textAlign: 'center' }}>
          {label ? <div style={{ color: gold, textTransform: 'uppercase', letterSpacing: '.12em', fontSize: '.7rem', marginBottom: 12 }}>{label as string}</div> : null}
          <h2 style={{ fontFamily: displayFont, fontSize: '2.2rem', fontWeight: 400, color: navy, margin: '0 0 16px' }} dangerouslySetInnerHTML={{ __html: headingHtml as string }} />
          <div style={{ border: `1px dashed ${smoke}`, borderRadius: 12, padding: '60px 20px', color: '#999', background: ivory }}>
            🌍 Interactive payout-network map (countries managed under Network Map)
          </div>
        </div>
      ),
    },

    Spacer: {
      label: 'Spacer',
      fields: {
        size: {
          type: 'radio',
          label: 'Size',
          options: [
            { value: '24px', label: 'Small' },
            { value: '48px', label: 'Medium' },
            { value: '80px', label: 'Large' },
          ],
        },
      },
      defaultProps: { size: '48px' },
      render: ({ size }) => <div style={{ height: size as string }} />,
    },
};

// Inject the shared design options into every component except Spacer, so each
// section exposes width / spacing / background / alignment controls in the
// editor's right-hand panel without repeating the fields per component.
for (const key of Object.keys(baseComponents)) {
  if (key === 'Spacer') continue;
  const comp = baseComponents[key] as { fields: Record<string, unknown>; defaultProps?: Record<string, unknown> };
  comp.fields = { ...comp.fields, ...designFields };
  comp.defaultProps = { ...(comp.defaultProps ?? {}), ...designDefaults };
}

export const puckConfig: Config = {
  components: baseComponents,
};
