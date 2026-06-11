import Link from 'next/link';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200/70 ${className}`} aria-hidden="true" />;
}

export function HeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  );
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-smoke bg-white shadow-sm">
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

export function ListPageSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <TableSkeleton rows={rows} cols={cols} />
    </div>
  );
}

export function EmptyState({
  icon = 'i',
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-smoke bg-white px-6 py-14 text-center shadow-sm">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-sm font-black uppercase tracking-wider text-gold" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-base font-bold text-navy">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-charcoal/60">{description}</p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-5 rounded-lg bg-navy px-4 py-2 text-sm font-bold text-ivory hover:bg-navy-mid"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
