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

export const puckConfig: Config = {
  components: {
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
  },
};
