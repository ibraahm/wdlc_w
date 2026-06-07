import Link from 'next/link';
import { company } from '@/lib/site';

export default function HomePage() {
  return (
    <main>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-media" data-parallax />
        <div className="hero-shade" />
        <div className="hero-content shell">
          <div className="eyebrow reveal">
            <span />
            <p>Licensed Money Transmitter Since 1999</p>
          </div>
          <h1 className="hero-title reveal">
            <span>Your Direct</span>
            <span>Link</span>
            <em>Home.</em>
          </h1>
          <p className="hero-copy reveal">
            Fast, affordable, and reliable money transfers for immigrant, refugee, and diaspora families.
            Serving communities across 20 states.
          </p>
          <div className="hero-actions reveal">
            <Link className="button button-gold" href="/agents/become-an-agent">Find an Agent</Link>
            <Link className="button button-ghost" href="/services/send-money">How It Works</Link>
          </div>
          <div className="metric-row reveal">
            <div>
              <strong>20+</strong>
              <span>States Licensed</span>
            </div>
            <div>
              <strong>1999</strong>
              <span>Founded</span>
            </div>
            <div>
              <strong>USD</strong>
              <span>All Transfers</span>
            </div>
            <div>
              <strong>NMLS</strong>
              <span>#{company.nmls}</span>
            </div>
          </div>
        </div>
        <div className="scroll-marker">
          <span>Scroll</span>
          <i />
        </div>
      </section>

      {/* ── Intro split ───────────────────────────────────────────────── */}
      <section className="split-section shell" id="intro">
        <div className="image-frame reveal">
          <div className="image-placeholder" />
          <div className="floating-stat">
            <strong>25+</strong>
            <span>Years Serving</span>
          </div>
        </div>
        <div className="copy-column reveal">
          <div className="eyebrow">
            <span />
            <p>About World Direct Link</p>
          </div>
          <h2>A trusted<br /><em>community link</em></h2>
          <p>
            World Direct Link, Corp. is a FinCEN-registered Money Services Business and
            state-licensed money transmitter dedicated to connecting diaspora families with
            fast, secure, and affordable transfers.
          </p>
          <p>
            Every transaction is screened against OFAC lists regardless of amount —
            because trust and compliance are not optional.
          </p>
          <div className="timeline">
            <article>
              <span>01</span>
              <p>Visit any authorized WDL agent to start your transfer.</p>
            </article>
            <article>
              <span>02</span>
              <p>Your funds are screened, processed, and routed through our correspondent network.</p>
            </article>
            <article>
              <span>03</span>
              <p>Recipient collects via cash pickup, bank deposit, or mobile wallet.</p>
            </article>
          </div>
        </div>
      </section>

      {/* ── Services dark grid ────────────────────────────────────────── */}
      <section className="dark-section" id="services">
        <div className="shell">
          <div className="section-head reveal">
            <div>
              <div className="eyebrow">
                <span />
                <p>Transfer Services</p>
              </div>
              <h2>One link.<br /><em>Every way to deliver.</em></h2>
            </div>
            <p>
              Choose the payout method that works best for your recipient.
              All transfers are initiated at an authorized WDL agent in U.S. dollars.
            </p>
          </div>
          <div className="feature-grid reveal">
            <article>
              <span>01</span>
              <h3>Send Money</h3>
              <p>Start a transfer at any authorized WDL agent. Transparent fees before you pay.</p>
              <i />
            </article>
            <article>
              <span>02</span>
              <h3>Cash Pickup</h3>
              <p>Recipients collect funds in USD at a payout location near them.</p>
              <i />
            </article>
            <article>
              <span>03</span>
              <h3>Bank Deposit</h3>
              <p>Send directly to a recipient&apos;s bank account with full confirmation.</p>
              <i />
            </article>
            <article>
              <span>04</span>
              <h3>Mobile Wallet</h3>
              <p>Payout to a supported mobile wallet where available in destination countries.</p>
              <i />
            </article>
            <article>
              <span>05</span>
              <h3>Track Transfer</h3>
              <p>Real-time status lookup by transaction ID — no account required.</p>
              <i />
            </article>
            <article>
              <span>06</span>
              <h3>Agent Network</h3>
              <p>Reach regions where traditional banking is limited through our correspondent network.</p>
              <i />
            </article>
          </div>
        </div>
      </section>

      {/* ── Sticky story ──────────────────────────────────────────────── */}
      <section className="sticky-story" id="story" data-story>
        <div className="story-stage">
          <div className="story-media" />
          <div className="story-overlay" />
          <div className="story-dots" data-story-dots />
          <div className="story-slides shell">
            <article className="story-slide is-active">
              <span>01 / 03</span>
              <h2>Trusted</h2>
              <p>Over two decades of trusted service to immigrant and diaspora communities across the United States.</p>
            </article>
            <article className="story-slide">
              <span>02 / 03</span>
              <h2>Compliant</h2>
              <p>FinCEN-registered. OFAC-screened. Licensed in 20 states. Your money moves safely and legally.</p>
            </article>
            <article className="story-slide">
              <span>03 / 03</span>
              <h2>Connected</h2>
              <p>A growing agent network delivering funds where families need them — even where banks cannot reach.</p>
            </article>
          </div>
        </div>
      </section>

      {/* ── Detail reverse split ──────────────────────────────────────── */}
      <section className="split-section shell reverse" id="compliance">
        <div className="copy-column reveal">
          <div className="eyebrow">
            <span />
            <p>Compliance Program</p>
          </div>
          <h2>Security you<br /><em>can count on</em></h2>
          <p>
            Our Bank Secrecy Act compliance program is built to protect senders, recipients,
            and the financial system — not just to check a box.
          </p>
          <div className="detail-list">
            <article>
              <span>01</span>
              <div>
                <h3>OFAC Screening</h3>
                <p>Every transaction screened against OFAC lists, regardless of amount.</p>
              </div>
            </article>
            <article>
              <span>02</span>
              <div>
                <h3>BSA / AML Program</h3>
                <p>Full Bank Secrecy Act compliance with SAR and CTR filing obligations met.</p>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <h3>State Licensing</h3>
                <p>Licensed money transmitter in 20+ states with NMLS registration #{company.nmls}.</p>
              </div>
            </article>
          </div>
        </div>
        <div className="image-frame reveal">
          <div className="image-placeholder alt" />
        </div>
      </section>

      {/* ── Contact CTA band ──────────────────────────────────────────── */}
      <section className="contact-band" id="contact">
        <div className="shell contact-layout">
          <div className="copy-column reveal">
            <div className="eyebrow">
              <span />
              <p>Ready to Send?</p>
            </div>
            <h2>Start your<br /><em>transfer today</em></h2>
            <p>
              Find a licensed WDL agent near you or contact our support team.
              Toll-free: <a href={`tel:${company.tollFree}`} style={{ color: 'var(--gold)' }}>{company.tollFree}</a>
            </p>
            <div style={{ marginTop: '32px', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              <Link className="button button-gold" href="/agents/become-an-agent">Find an Agent</Link>
              <Link className="button button-ghost" href="/support/contact">Contact Support</Link>
            </div>
          </div>
          <div className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingTop: '8px' }}>
            <div className="callout-gold">
              {company.legalName} is a licensed money transmitter.
              NMLS ID #{company.nmls}. All transactions are screened for compliance.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Toll-Free', value: company.tollFree, href: `tel:${company.tollFree}` },
                { label: 'Email', value: company.email, href: `mailto:${company.email}` },
                { label: 'Address', value: `${company.address.line1}, ${company.address.city}, ${company.address.state} ${company.address.zip}`, href: null },
              ].map(({ label, value, href }) => (
                <div key={label} style={{ borderBottom: '1px solid rgba(250,250,247,0.1)', paddingBottom: '12px' }}>
                  <div style={{ color: 'var(--gold)', fontSize: '0.58rem', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
                  {href ? (
                    <a href={href} style={{ color: 'rgba(250,250,247,0.75)', fontSize: '0.9rem' }}>{value}</a>
                  ) : (
                    <span style={{ color: 'rgba(250,250,247,0.75)', fontSize: '0.9rem' }}>{value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
