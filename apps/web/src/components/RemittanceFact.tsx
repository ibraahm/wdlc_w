'use client';

import { useEffect, useState } from 'react';

// Widely-reported facts about the impact of remittances (World Bank / UN IFAD /
// World Bank "Migration & Development Brief"). Phrased as general, well-known
// context - not World Direct Link figures.
const FACTS: { stat: string; text: string }[] = [
  {
    stat: '$650B+',
    text: 'Migrants send more than $650 billion home to family in low- and middle-income countries each year - more than these countries receive in foreign direct investment.',
  },
  {
    stat: '~800M',
    text: 'About one in nine people worldwide - roughly 800 million - are supported by money sent home by a family member working abroad.',
  },
  {
    stat: '50%+',
    text: 'Most remittances are spent on essentials: food, housing, school fees, and healthcare - often more than half goes directly to a family’s basic needs.',
  },
  {
    stat: 'June 16',
    text: 'The United Nations marks June 16 as the International Day of Family Remittances, recognizing the contribution migrants make to their families and communities.',
  },
  {
    stat: '7 of 10',
    text: 'A large share of remittances flows to rural areas, where these funds are a vital lifeline for households with the fewest financial options.',
  },
  {
    stat: '$4B+',
    text: 'Diaspora remittances are Kenya’s largest single source of foreign exchange - sending home more than the country earns from tea, coffee, or tourism.',
  },
  {
    stat: '~35%',
    text: 'In Somalia, money sent home by the diaspora is estimated to make up roughly a third of the entire economy - among the highest reliance on remittances anywhere in the world.',
  },
  {
    stat: '2007',
    text: 'East Africa leads the world in mobile money: since Kenya’s M-Pesa launched in 2007, sending and receiving funds by phone has become the everyday way families get support.',
  },
  {
    stat: '$1B+',
    text: 'Remittances rank among Uganda’s top foreign-exchange earners, with the diaspora sending home over a billion dollars a year - rivaling the country’s coffee exports.',
  },
  {
    stat: '~8%',
    text: 'Sending money to sub-Saharan Africa is still the most expensive in the world - averaging close to 8% in fees - so every reduction in cost means more reaching families across East Africa.',
  },
];

export default function RemittanceFact() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % FACTS.length), 7000);
    return () => clearInterval(t);
  }, []);

  const fact = FACTS[i];

  return (
    <div
      aria-label="Did you know - about remittances"
      style={{
        position: 'relative',
        height: 'clamp(320px, 42vw, 520px)',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'linear-gradient(135deg,#0B1F3A,#1a3a5c)',
        boxShadow: '0 30px 60px -24px rgba(11,31,58,.35)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 'clamp(28px,4vw,48px)',
      }}
    >
      {/* subtle globe motif */}
      <div aria-hidden style={{ position: 'absolute', right: '-40px', top: '-40px', width: 220, height: 220, borderRadius: '50%', border: '1px solid rgba(201,168,76,.25)' }} />
      <div aria-hidden style={{ position: 'absolute', right: '10px', bottom: '-60px', width: 280, height: 280, borderRadius: '50%', border: '1px solid rgba(255,255,255,.06)' }} />

      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#C9A84C', margin: 0 }}>
        Did you know?
      </p>
      <p
        key={`stat-${i}`}
        style={{
          fontFamily: 'var(--display)',
          fontSize: 'clamp(2.6rem,6vw,4rem)',
          lineHeight: 1,
          margin: '18px 0 14px',
          color: '#fff',
          animation: 'wdlFactFade .6s ease',
        }}
      >
        {fact.stat}
      </p>
      <p
        key={`text-${i}`}
        style={{ fontSize: 'clamp(15px,1.6vw,18px)', lineHeight: 1.65, color: 'rgba(255,255,255,.85)', margin: 0, maxWidth: 460, animation: 'wdlFactFade .6s ease' }}
      >
        {fact.text}
      </p>

      <div style={{ display: 'flex', gap: 6, marginTop: 'clamp(20px,3vw,32px)' }}>
        {FACTS.map((_, n) => (
          <button
            key={n}
            type="button"
            aria-label={`Fact ${n + 1}`}
            onClick={() => setI(n)}
            style={{
              width: n === i ? 22 : 8,
              height: 8,
              borderRadius: 99,
              border: 0,
              cursor: 'pointer',
              background: n === i ? '#C9A84C' : 'rgba(255,255,255,.3)',
              transition: 'all .3s ease',
            }}
          />
        ))}
      </div>
      <p style={{ marginTop: 14, fontSize: 11, color: 'rgba(255,255,255,.45)' }}>Sources: World Bank, UN IFAD</p>

      <style>{`@keyframes wdlFactFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
