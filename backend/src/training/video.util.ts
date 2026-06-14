import { BadRequestException } from '@nestjs/common';

// We embed lesson videos in an <iframe>, so we only accept a small allowlist of
// trusted providers and convert every accepted link to its canonical embed URL.
// This blocks arbitrary/hostile iframe sources.
export function normalizeVideoUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const url = raw.trim();
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new BadRequestException('Video link must be a full URL (https://…)');
  }
  if (parsed.protocol !== 'https:') {
    throw new BadRequestException('Video link must use https');
  }

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

  // YouTube
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (parsed.pathname === '/watch') {
      const id = parsed.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${encodeURIComponent(id)}`;
    }
    if (parsed.pathname.startsWith('/embed/')) return `https://www.youtube.com${parsed.pathname}`;
  }
  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1);
    if (id) return `https://www.youtube.com/embed/${encodeURIComponent(id)}`;
  }

  // Vimeo
  if (host === 'vimeo.com') {
    const id = parsed.pathname.split('/').filter(Boolean)[0];
    if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
  }
  if (host === 'player.vimeo.com' && parsed.pathname.startsWith('/video/')) {
    return `https://player.vimeo.com${parsed.pathname}`;
  }

  // Loom
  if (host === 'loom.com') {
    if (parsed.pathname.startsWith('/share/')) return `https://www.loom.com/embed/${parsed.pathname.split('/share/')[1]}`;
    if (parsed.pathname.startsWith('/embed/')) return `https://www.loom.com${parsed.pathname}`;
  }

  throw new BadRequestException('Unsupported video link. Use a YouTube, Vimeo, or Loom URL.');
}
