import { HeaderSkeleton, CardsSkeleton, TableSkeleton } from '@/components/ui-admin';
export default function Loading() {
  return (
    <div className="space-y-8">
      <HeaderSkeleton />
      <CardsSkeleton count={4} />
      <TableSkeleton rows={6} cols={4} />
    </div>
  );
}
