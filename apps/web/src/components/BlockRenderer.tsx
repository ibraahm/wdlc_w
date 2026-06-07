'use client';

import type { Block } from '@/lib/api';
import Link from 'next/link';

interface BlockRendererProps {
  blocks: Block[];
}

export default function BlockRenderer({ blocks }: BlockRendererProps) {
  return (
    <main>
      {blocks.map((block, index) => (
        <BlockSwitch key={index} block={block} />
      ))}
    </main>
  );
}

function BlockSwitch({ block }: { block: Block }) {
  switch (block.type) {
    case 'hero':
      return <HeroBlock data={block.data} />;
    case 'text':
      return <TextBlock data={block.data} />;
    case 'features':
      return <FeaturesBlock data={block.data} />;
    case 'cta':
      return <CtaBlock data={block.data} />;
    default:
      return null;
  }
}

// ── Hero Block ────────────────────────────────────────────────────────────────

interface HeroData {
  heading?: string;
  subheading?: string;
  ctaText?: string;
  ctaHref?: string;
  backgroundImage?: string;
}

function HeroBlock({ data }: { data: Record<string, unknown> }) {
  const { heading, subheading, ctaText, ctaHref } = data as HeroData;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary to-blue-800 text-white">
      {/* Decorative background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-500 opacity-20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-400 opacity-20 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40 text-center">
        {heading && (
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            {heading}
          </h1>
        )}
        {subheading && (
          <p className="text-lg sm:text-xl lg:text-2xl text-blue-100 max-w-3xl mx-auto mb-10 leading-relaxed">
            {subheading}
          </p>
        )}
        {ctaText && ctaHref && (
          <Link
            href={ctaHref}
            className="inline-flex items-center px-8 py-4 bg-white text-primary font-semibold text-lg rounded-lg shadow-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-50"
          >
            {ctaText}
            <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>
    </section>
  );
}

// ── Text Block ────────────────────────────────────────────────────────────────

interface TextData {
  content?: string;
}

function TextBlock({ data }: { data: Record<string, unknown> }) {
  const { content } = data as TextData;
  if (!content) return null;

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="prose"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </section>
  );
}

// ── Features Block ────────────────────────────────────────────────────────────

interface FeatureItem {
  icon?: string;
  title?: string;
  body?: string;
}

interface FeaturesData {
  heading?: string;
  subheading?: string;
  items?: FeatureItem[];
}

const iconMap: Record<string, React.ReactNode> = {
  shield: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
    />
  ),
  globe: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
    />
  ),
  lightning: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
    />
  ),
  chart: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
    />
  ),
  default: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
    />
  ),
};

function FeatureIcon({ icon }: { icon?: string }) {
  const path = icon && iconMap[icon] ? iconMap[icon] : iconMap.default;
  return (
    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary bg-opacity-10 flex items-center justify-center">
      <svg
        className="w-6 h-6 text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        {path}
      </svg>
    </div>
  );
}

function FeaturesBlock({ data }: { data: Record<string, unknown> }) {
  const { heading, subheading, items = [] } = data as FeaturesData;

  return (
    <section className="bg-gray-50 py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {(heading || subheading) && (
          <div className="text-center mb-14">
            {heading && (
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{heading}</h2>
            )}
            {subheading && (
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subheading}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <FeatureIcon icon={item.icon} />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{item.title}</h3>
              {item.body && <p className="mt-2 text-gray-600 leading-relaxed">{item.body}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA Block ─────────────────────────────────────────────────────────────────

interface CtaData {
  heading?: string;
  subheading?: string;
  buttonText?: string;
  href?: string;
}

function CtaBlock({ data }: { data: Record<string, unknown> }) {
  const { heading, subheading, buttonText, href } = data as CtaData;

  return (
    <section className="bg-primary py-16 sm:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {heading && (
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{heading}</h2>
        )}
        {subheading && (
          <p className="text-lg text-blue-100 mb-8 max-w-xl mx-auto">{subheading}</p>
        )}
        {buttonText && href && (
          <Link
            href={href}
            className="inline-flex items-center px-8 py-4 bg-white text-primary font-semibold text-lg rounded-lg shadow hover:bg-blue-50 transition-colors focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-50"
          >
            {buttonText}
          </Link>
        )}
      </div>
    </section>
  );
}
