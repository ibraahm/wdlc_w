import {
  Container,
  Section,
  SectionHeading,
  Card,
  ButtonOnDark,
  ButtonSecondary,
  StatStrip,
  Steps,
  CtaBand,
} from '@/components/ui';
import { company } from '@/lib/site';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-strong text-white">
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-white opacity-5 rounded-full blur-3xl" />
        </div>
        <Container className="relative py-20 sm:py-28 lg:py-32">
          <div className="max-w-3xl">
            <p className="text-white/70 font-semibold uppercase tracking-wider text-sm mb-4">
              Connecting communities since 1999
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              Your Direct Link Home.
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-white/80 leading-relaxed">
              Fast, affordable, and reliable money transfers for immigrant, refugee, and diaspora
              families. Sending more than money — sending home.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <ButtonOnDark href="/agents/become-an-agent">Find an Agent</ButtonOnDark>
              <Link
                href="/services/send-money"
                className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-white/40 text-white font-semibold hover:bg-white/10 transition-colors"
              >
                Send Money
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Trust strip */}
      <Section muted>
        <StatStrip
          stats={[
            { value: 'Licensed in 20 states', label: 'State money transmitter licenses' },
            { value: 'Since 1999', label: 'Trusted by diaspora communities' },
            { value: 'Trusted network', label: 'Reliable correspondent payouts' },
          ]}
        />
      </Section>

      {/* Services */}
      <Section>
        <SectionHeading
          title="One link. Every way to deliver."
          subtitle="Choose the payout method that works best for your recipient. All transfers are initiated in person at an authorized WDL agent and delivered in U.S. dollars."
          center
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
          <Card title="Send Money" href="/services/send-money">Start a transfer at any authorized WDL agent.</Card>
          <Card title="Cash Pickup" href="/services/cash-pickup">Recipients collect funds in USD at a payout location.</Card>
          <Card title="Bank Deposit" href="/services/bank-deposit">Send directly to a recipient&apos;s bank account.</Card>
          <Card title="Mobile Wallet" href="/services/mobile-wallet">Payout to a supported mobile wallet where available.</Card>
        </div>
      </Section>

      {/* How it works */}
      <Section muted>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <SectionHeading title="How money moves" subtitle="Three simple steps from here to home." />
            <Steps
              items={[
                { title: 'You send.', body: 'Visit an authorized WDL agent and place your transfer in person.' },
                { title: 'We route.', body: 'Your transfer is screened, processed, and routed through our correspondent network.' },
                { title: 'They receive.', body: 'Your recipient collects funds via the available payout method at the destination.' },
              ]}
            />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-8">
            <h3 className="text-xl font-semibold text-gray-900">Why families choose us</h3>
            <ul className="mt-4 space-y-3 text-gray-700">
              <li className="flex gap-3"><span className="text-primary font-bold">·</span> Affordable pricing with full fee disclosure before you pay</li>
              <li className="flex gap-3"><span className="text-primary font-bold">·</span> Reach to regions where traditional banking is limited</li>
              <li className="flex gap-3"><span className="text-primary font-bold">·</span> Every transaction screened for your protection</li>
              <li className="flex gap-3"><span className="text-primary font-bold">·</span> A team that understands diaspora communities</li>
            </ul>
            <div className="mt-6">
              <ButtonSecondary href="/about">About World Direct Link</ButtonSecondary>
            </div>
          </div>
        </div>
      </Section>

      <CtaBand heading="Ready to send money home?">
        <ButtonOnDark href="/agents/become-an-agent">Find an Agent Near You</ButtonOnDark>
        <Link
          href="/support/contact"
          className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-white/50 text-white font-semibold hover:bg-white/10 transition-colors"
        >
          Contact Support
        </Link>
      </CtaBand>

      {/* Compliance trust note */}
      <Section>
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-gray-600">
            {company.legalName} is a FinCEN-registered Money Services Business and a state-licensed
            money transmitter (NMLS ID #{company.nmls}). Every transaction is screened against OFAC
            lists, regardless of amount.
          </p>
          <div className="mt-4">
            <Link href="/compliance" className="text-primary font-medium hover:underline">
              Learn about our compliance program →
            </Link>
          </div>
        </div>
      </Section>
    </main>
  );
}
