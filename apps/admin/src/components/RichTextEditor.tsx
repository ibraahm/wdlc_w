'use client';

import { useEffect, useRef } from 'react';

// A small, dependency-free WYSIWYG editor so non-technical admins can write
// lesson content without touching HTML. Output is HTML, which the backend
// sanitizes on save (see backend/src/training/sanitize.ts).
//
// We intentionally use document.execCommand: it is deprecated but still works
// in every current browser and keeps this editor tiny. The content is admin-
// authored and server-sanitized, so the trade-off is acceptable for an
// internal tool.

type Cmd =
  | { label: string; title: string; cmd: string; arg?: string }
  | { label: string; title: string; action: 'link' | 'clear' };

const TOOLS: Cmd[] = [
  { label: 'Heading', title: 'Section heading', cmd: 'formatBlock', arg: 'h2' },
  { label: 'Subheading', title: 'Sub-heading', cmd: 'formatBlock', arg: 'h3' },
  { label: 'Normal', title: 'Normal paragraph', cmd: 'formatBlock', arg: 'p' },
  { label: 'B', title: 'Bold', cmd: 'bold' },
  { label: 'I', title: 'Italic', cmd: 'italic' },
  { label: '• List', title: 'Bullet list', cmd: 'insertUnorderedList' },
  { label: '1. List', title: 'Numbered list', cmd: 'insertOrderedList' },
  { label: 'Link', title: 'Insert link', action: 'link' },
  { label: 'Clear', title: 'Clear formatting', action: 'clear' },
];

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write the lesson here. Use the buttons above to add headings, bold text, and lists.',
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Seed the editor once (and when an external value differs while not editing),
  // without clobbering the caret during typing.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement !== el && el.innerHTML !== value) {
      el.innerHTML = value || '';
    }
  }, [value]);

  function emit() {
    if (ref.current) onChange(ref.current.innerHTML);
  }

  function exec(cmd: string, arg?: string) {
    ref.current?.focus();
    try {
      document.execCommand(cmd, false, arg);
    } catch {
      /* no-op */
    }
    emit();
  }

  function run(tool: Cmd) {
    if ('cmd' in tool) {
      exec(tool.cmd, tool.arg);
      return;
    }
    if (tool.action === 'link') {
      const url = window.prompt('Link URL (https://…)');
      if (url) exec('createLink', url);
    } else if (tool.action === 'clear') {
      exec('removeFormat');
      exec('formatBlock', 'p');
    }
  }

  return (
    <div className="border border-gray-300 rounded overflow-hidden">
      <div className="flex flex-wrap gap-1 bg-gray-50 border-b border-gray-200 p-1.5">
        {TOOLS.map((t) => (
          <button
            key={t.label}
            type="button"
            title={t.title}
            // preventDefault on mousedown keeps the text selection in the editor.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run(t)}
            className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300"
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder}
        className="rte-area min-h-[180px] px-3 py-2 text-sm text-gray-800 focus:outline-none"
      />
      <style jsx global>{`
        .rte-area:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
        }
        .rte-area h2 { font-size: 1.15rem; font-weight: 700; margin: 0.6em 0 0.3em; }
        .rte-area h3 { font-size: 1rem; font-weight: 600; margin: 0.6em 0 0.3em; }
        .rte-area p { margin: 0.4em 0; }
        .rte-area ul { list-style: disc; padding-left: 1.4em; margin: 0.4em 0; }
        .rte-area ol { list-style: decimal; padding-left: 1.4em; margin: 0.4em 0; }
        .rte-area a { color: #2563eb; text-decoration: underline; }
      `}</style>
    </div>
  );
}
