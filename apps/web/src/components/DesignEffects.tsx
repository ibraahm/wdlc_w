'use client';
import { useEffect } from 'react';

export default function DesignEffects() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('[data-header]');
    const progress = document.querySelector<HTMLElement>('#progress');
    const parallax = document.querySelector<HTMLElement>('[data-parallax]');
    const menuButton = document.querySelector<HTMLElement>('[data-menu-button]');
    const mobilePanel = document.querySelector<HTMLElement>('[data-mobile-panel]');
    const story = document.querySelector<HTMLElement>('[data-story]');
    const storyDotsEl = document.querySelector<HTMLElement>('[data-story-dots]');
    const cursorDot = document.querySelector<HTMLElement>('.cursor-dot');
    const cursorRing = document.querySelector<HTMLElement>('.cursor-ring');

    const storySlides = [...document.querySelectorAll<HTMLElement>('.story-slide')];

    // Story dot nav
    if (storyDotsEl && storySlides.length > 0) {
      storyDotsEl.innerHTML = '';
      storySlides.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', `Go to step ${index + 1}`);
        dot.addEventListener('click', () => {
          if (!story) return;
          const top = story.offsetTop + index * window.innerHeight;
          window.scrollTo({ top, behavior: 'smooth' });
        });
        storyDotsEl.appendChild(dot);
      });
    }

    function updateStory() {
      if (!story || storySlides.length === 0 || !storyDotsEl) return;
      const rect = story.getBoundingClientRect();
      const available = story.offsetHeight - window.innerHeight;
      const prog = Math.max(0, Math.min(1, -rect.top / available));
      const index = Math.min(storySlides.length - 1, Math.floor(prog * storySlides.length));
      storySlides.forEach((s, i) => s.classList.toggle('is-active', i === index));
      [...storyDotsEl.children].forEach((d, i) => d.classList.toggle('is-active', i === index));
    }

    function updateScroll() {
      const scrollY = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? scrollY / max : 0;
      if (header) header.classList.toggle('is-solid', scrollY > 40);
      if (progress) progress.style.width = `${ratio * 100}%`;
      if (parallax) parallax.style.transform = `translateY(${scrollY * 0.28}px)`;
      updateStory();
    }

    // Reveal observer
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

    // Mobile menu
    const closeMenu = () => {
      menuButton?.classList.remove('is-open');
      menuButton?.setAttribute('aria-expanded', 'false');
      mobilePanel?.classList.remove('is-open');
      document.body.style.overflow = '';
    };

    menuButton?.addEventListener('click', () => {
      const open = !menuButton.classList.contains('is-open');
      menuButton.classList.toggle('is-open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      mobilePanel?.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });

    mobilePanel?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

    // Segment buttons
    document.querySelectorAll('.segments').forEach((group) => {
      group.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => {
          group.querySelectorAll('button').forEach((b) => b.classList.remove('is-active'));
          btn.classList.add('is-active');
        });
      });
    });

    // Scroll events
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateScroll);
    updateScroll();

    // Custom cursor (pointer:fine only)
    if (window.matchMedia('(pointer: fine)').matches && cursorDot && cursorRing) {
      let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;
      let rafId: number;

      window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX; mouseY = e.clientY;
        cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
      });

      const setHover = (hovering: boolean) => {
        cursorRing.classList.toggle('is-hovering', hovering);
        cursorDot.style.opacity = hovering ? '0' : '1';
      };

      document.querySelectorAll('a, button, input, textarea').forEach((el) => {
        el.addEventListener('mouseenter', () => setHover(true));
        el.addEventListener('mouseleave', () => setHover(false));
      });

      const animateCursor = () => {
        ringX += (mouseX - ringX) * 0.14;
        ringY += (mouseY - ringY) * 0.14;
        cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
        rafId = requestAnimationFrame(animateCursor);
      };
      animateCursor();

      return () => {
        window.removeEventListener('scroll', updateScroll);
        window.removeEventListener('resize', updateScroll);
        revealObserver.disconnect();
        cancelAnimationFrame(rafId);
      };
    }

    return () => {
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateScroll);
      revealObserver.disconnect();
    };
  }, []);

  return null;
}
