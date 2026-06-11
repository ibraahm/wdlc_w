'use client';

export default function DeletePageButton({
  slug,
  title,
  action,
  className = 'text-sm text-red-500 hover:text-red-700',
}: {
  slug: string;
  title: string;
  action: (formData: FormData) => Promise<void>;
  className?: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        className={className}
        onClick={(e) => {
          if (!confirm(`Delete "${title}"? This cannot be undone.`)) {
            e.preventDefault();
          }
        }}
      >
        Delete
      </button>
    </form>
  );
}
