import { HeaderSkeleton, CardsSkeleton, TableSkeleton } from '@/components/ui-admin';
export default function Loading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <CardsSkeleton count={3} />
      <TableSkeleton rows={6} cols={6} />
    </div>
  );
}
