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
      'blockquote', 'a', 'span',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
    },
    // Only http(s) and mailto links — blocks javascript:, data:, etc.
    allowedSchemes: ['http', 'https', 'mailto'],
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
