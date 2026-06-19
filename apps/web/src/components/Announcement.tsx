'use client';

import { useEffect, useRef, useState } from 'react';

export type AnnouncementConfig = {
  enabled?: boolean;
  // Where the notice shows: a thin top bar, a centered popup, or both.
  placement?: 'bar' | 'popup' | 'both';
  // Colour theme for the bar (popup uses a neutral card with an accent stripe).
  variant?: 'info' | 'warning' | 'alert';
  title?: string;
  message?: string;
  imageUrl?: string;
  link?: string;
  linkLabel?: string;
};

// Renders an admin-controlled site notice (e.g. "We've temporarily paused
// sending to <country> until further notice"). Shows on every visit; the
// visitor can dismiss it for the current page load. Supports a top bar and/or
// a centered popup, with an optional image.
export default function Announcement(config: AnnouncementConfig) {
  const placement = config.placement ?? 'bar';
  const variant = config.variant ?? 'info';
  const message = (config.message ?? '').trim();

  const showBar = config.enabled && !!message && (placement === 'bar' || placement === 'both');
  const showPopup = config.enabled && !!message && (placement === 'popup' || placement === 'both');

  const [barOpen, setBarOpen] = useState(true);
  const [popupOpen, setPopupOpen] = useState(true);
  const barRef = useRef<HTMLDivElement>(null);

  // Push the fixed header (and inner-page content) down by the bar's height so
  // nothing is hidden behind it. The bar wraps responsively, so measure it.
  useEffect(() => {
    const root = document.documentElement;
    if (!showBar || !barOpen || !barRef.current) {
      root.style.setProperty('--ann-h', '0px');
      return;
    }
    const el = barRef.current;
    const set = () => root.style.setProperty('--ann-h', `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.setProperty('--ann-h', '0px');
    };
  }, [showBar, barOpen]);

  // Close the popup with Escape, and lock body scroll while it's open.
  useEffect(() => {
    if (!showPopup || !popupOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPopupOpen(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [showPopup, popupOpen]);

  return (
    <>
      {showBar && barOpen && (
        <div
          ref={barRef}
          className={`announcement-bar announcement-bar--${variant}`}
          role="region"
          aria-label="Site announcement"
        >
          <div className="announcement-bar__inner">
            {config.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="announcement-bar__img" src={config.imageUrl} alt="" />
            )}
            <p className="announcement-bar__text">
              {config.title && <strong>{config.title} </strong>}
              {message}
              {config.link && (
                <a className="announcement-bar__link" href={config.link} target="_blank" rel="noopener noreferrer">
                  {config.linkLabel || 'Learn more'}
                </a>
              )}
            </p>
          </div>
          <button
            type="button"
            className="announcement-bar__close"
            aria-label="Dismiss announcement"
            onClick={() => setBarOpen(false)}
          >
            ×
          </button>
        </div>
      )}

      {showPopup && popupOpen && (
        <div
          className="announcement-popup"
          role="dialog"
          aria-modal="true"
          aria-label={config.title || 'Site announcement'}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPopupOpen(false);
          }}
        >
          <div className={`announcement-popup__card announcement-popup__card--${variant}`}>
            <button
              type="button"
              className="announcement-popup__close"
              aria-label="Close"
              onClick={() => setPopupOpen(false)}
            >
              ×
            </button>
            {config.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="announcement-popup__img" src={config.imageUrl} alt="" />
            )}
            <div className="announcement-popup__body">
              {config.title && <h2 className="announcement-popup__title">{config.title}</h2>}
              <p className="announcement-popup__text">{message}</p>
              {config.link && (
                <a
                  className="announcement-popup__cta"
                  href={config.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {config.linkLabel || 'Learn more'}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
