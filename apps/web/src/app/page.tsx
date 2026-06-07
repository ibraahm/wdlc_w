import { getPage } from '@/lib/api';
import BlockRenderer from '@/components/BlockRenderer';
import Link from 'next/link';

export default async function HomePage() {
  const page = await getPage('home');

  if (page && page.blocks.length > 0) {
    return <BlockRenderer blocks={page.blocks} />;
  }

  // Default "Coming soon" hero when no CMS page found
  return (
    <main>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-blue-800 text-white">
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-500 opacity-20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-400 opacity-20 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            World Direct Link, Corp.
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-blue-100 max-w-3xl mx-auto mb-10 leading-relaxed">
            Global connectivity solutions for modern business. Coming soon.
          </p>
          <Link
            href="http://localhost:3001/login"
            className="inline-flex items-center px-8 py-4 bg-white text-primary font-semibold text-lg rounded-lg shadow-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-50"
          >
            Agent Portal
            <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>
    </main>
  );
}
