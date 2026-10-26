import { Shop } from '@/components/shop';
import { withStore } from '@/lib/store';
import { catalog } from '@/lib/catalog';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const initialData = await withStore((s) => catalog(s, new URLSearchParams()));
  return <Shop initialData={initialData} />;
}
