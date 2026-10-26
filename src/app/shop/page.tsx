import { Shop } from '@/components/shop';
import { withStore } from '@/lib/store';
import { catalog } from '@/lib/catalog';
export const dynamic = 'force-dynamic';
export default async function Collection({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const search = q.slice(0, 100);
  const initialData = await withStore((s) =>
    catalog(s, new URLSearchParams({ q: search })),
  );
  return <Shop mode="shop" initialSearch={search} initialData={initialData} />;
}
