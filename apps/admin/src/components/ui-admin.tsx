import Link from 'next/link';

/** Shimmer block. Width/height via Tailwind classes. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200/70 ${className}`} aria-hidden="true" />;
}

/** Page header skeleton (title + subtitle). */
export function HeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}

/** Card-grid skeleton for stat/dashboard layouts. */
export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

/** Table skeleton with a header row and N body rows. */
export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-smoke bg-white">
      <div className="flex gap-4 border-b border-smoke bg-ivory px-6 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-smoke px-6 py-4 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Standard deep-page loading layout: header + table. */
export function ListPageSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <TableSkeleton rows={rows} cols={cols} />
    </div>
  );
}

/**
 * Empty-state with guidance and an optional call to action. Use on first-use
 * screens so an empty list explains what to do next instead of looking broken.
 */
export function EmptyState({
  icon = '◇',
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon?: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-smoke bg-white px-6 py-14 text-center">
      <div className="mb-3 text-3xl text-gold/70" aria-hidden="true">{icon}</div>
      <h3 className="text-base font-semibold text-navy">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-charcoal/60">{description}</p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-ivory hover:bg-navy-mid"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
