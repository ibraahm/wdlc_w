import type { Metadata } from 'next';
import './globals.css';
import Script from 'next/script';
import SiteNav from '@/components/SiteNav';
import Footer from '@/components/Footer';
import MaintenanceScreen from '@/components/MaintenanceScreen';
import { company } from '@/lib/site';
import { getCmsSetting } from '@/lib/cms';

export const metadata: Metadata = {
  title: {
    default: `${company.legalName} - ${company.tagline}`,
    template: `%s | ${company.shortName}`,
  },
  description:
    'World Direct Link, Corp. is a licensed money transmitter serving immigrant, refugee, and diaspora families with fast, affordable, and reliable money transfers since 1999.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  openGraph: { siteName: company.legalName, type: 'website' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // When maintenance mode is on, replace the whole site with the notice.
  const maintenance = await getCmsSetting<unknown>('maintenanceMode', false);
  const maintenanceOn = maintenance === true || maintenance === 'true';

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {maintenanceOn ? (
          <MaintenanceScreen />
        ) : (
        <>
        <div className="progress" id="progress" />
          <SiteNav />
          {children}
          <Footer />
        <Script id="design-effects" strategy="afterInteractive">{`
(function () {
  var header = document.querySelector('[data-header]');
  var progress = document.querySelector('#progress');
  var parallax = document.querySelector('[data-parallax]');
  var menuButton = document.querySelector('[data-menu-button]');
  var mobilePanel = document.querySelector('[data-mobile-panel]');
  var story = document.querySelector('[data-story]');
  var storyDotsEl = document.querySelector('[data-story-dots]');
  var storySlides = Array.from(document.querySelectorAll('.story-slide'));

  if (storyDotsEl && storySlides.length > 0) {
    storyDotsEl.innerHTML = '';
    storySlides.forEach(function (_, index) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', 'Go to step ' + (index + 1));
      dot.addEventListener('click', function () {
        if (!story) return;
        var top = story.offsetTop + index * window.innerHeight;
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
      storyDotsEl.appendChild(dot);
    });
  }

  function updateStory() {
    if (!story || storySlides.length === 0 || !storyDotsEl) return;
    var rect = story.getBoundingClientRect();
    var available = story.offsetHeight - window.innerHeight;
    var prog = Math.max(0, Math.min(1, -rect.top / available));
    var index = Math.min(storySlides.length - 1, Math.floor(prog * storySlides.length));
    storySlides.forEach(function (s, i) { s.classList.toggle('is-active', i === index); });
    Array.from(storyDotsEl.children).forEach(function (d, i) { d.classList.toggle('is-active', i === index); });
  }

  function updateScroll() {
    var scrollY = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? scrollY / max : 0;
    if (header) header.classList.toggle('is-solid', scrollY > 40);
    if (progress) progress.style.width = (ratio * 100) + '%';
    if (parallax) parallax.style.transform = 'translateY(' + (scrollY * 0.28) + 'px)';
    updateStory();
  }

  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el) { revealObserver.observe(el); });

  function closeMenu() {
    if (menuButton) { menuButton.classList.remove('is-open'); menuButton.setAttribute('aria-expanded', 'false'); }
    if (mobilePanel) mobilePanel.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  if (menuButton) {
    menuButton.addEventListener('click', function () {
      var open = !menuButton.classList.contains('is-open');
      menuButton.classList.toggle('is-open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      if (mobilePanel) mobilePanel.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }
  if (mobilePanel) {
    mobilePanel.querySelectorAll('a').forEach(function (link) { link.addEventListener('click', closeMenu); });
  }

  document.querySelectorAll('.segments').forEach(function (group) {
    group.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        group.querySelectorAll('button').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
      });
    });
  });

  window.addEventListener('scroll', updateScroll, { passive: true });
  window.addEventListener('resize', updateScroll);
  updateScroll();

})();
        `}</Script>
        </>
        )}
      </body>
    </html>
  );
}
