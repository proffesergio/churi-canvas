import type { Product, Store } from './model';
export type CatalogResponse = {
  products: Product[];
  total: number;
  page: number;
  pages: number;
};
export function catalog(s: Store, params: URLSearchParams): CatalogResponse {
  let items = s.products.filter((p) => p.visible);
  const ids = params.get('ids');
  if (ids !== null)
    items = items.filter((p) => ids.split(',').slice(0, 100).includes(p.id));
  const q = (params.get('q') || '').slice(0, 100).toLowerCase();
  const category = params.get('category');
  if (q) items = items.filter((p) => p.title.toLowerCase().includes(q));
  if (category && category !== 'All pieces')
    items = items.filter((p) => p.category === category);
  const sort = params.get('sort');
  items = [...items].sort(
    sort === 'price-asc'
      ? (a, b) => a.price - b.price
      : sort === 'price-desc'
        ? (a, b) => b.price - a.price
        : (a, b) => b.createdAt.localeCompare(a.createdAt),
  );
  const page = Math.max(1, Math.min(1000, Number(params.get('page')) || 1));
  const limit = Math.max(1, Math.min(100, Number(params.get('limit')) || 6));
  return {
    products: items.slice((page - 1) * limit, page * limit),
    total: items.length,
    page,
    pages: Math.ceil(items.length / limit),
  };
}
