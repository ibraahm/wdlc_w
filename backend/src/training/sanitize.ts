import sanitizeHtml from 'sanitize-html';

// Lesson content is authored by trusted admins, but we sanitize on write as a
// hard security boundary: anyone who reaches the API (or a compromised admin
// account) cannot inject <script>, event handlers, or javascript: URLs that
// would later execute in an agent's browser when the lesson is rendered.
export function sanitizeLessonHtml(dirty: string): string {
  if (!dirty) return '';
  return sanitizeHtml(dirty, {
    allowedTags: [
      'h2', 'h3', 'h4', 'p', 'br', 'hr',
      'ul', 'ol', 'li',
      'strong', 'b', 'em', 'i', 'u',
      'blockquote', 'a', 'span', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'loading'],
    },
    // Only http(s) and mailto links - blocks javascript:, data:, etc.
    allowedSchemes: ['http', 'https', 'mailto'],
    // Images may only load over http(s) - blocks data:/javascript: src vectors.
    allowedSchemesByTag: { img: ['http', 'https'] },
    transformTags: {
      // Force safe link behaviour on every anchor.
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer nofollow' },
      }),
    },
    disallowedTagsMode: 'discard',
  });
}

// Rich-text bodies authored in the CMS (news articles) reuse the same hard
// allowlist as training lessons.
export const sanitizeRichHtml = sanitizeLessonHtml;

// Validate and normalise a user-supplied URL. Returns the trimmed URL only when
// it parses and uses an http(s) scheme; otherwise null. This blocks dangerous
// schemes (javascript:, data:, file:, vbscript:, …) before a value is ever
// stored and later rendered as a clickable link.
export function safeHttpUrl(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  return trimmed;
}
