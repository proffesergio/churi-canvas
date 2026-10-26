'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  ArrowUpRight,
  Heart,
  Plus,
  Truck,
  HandHeart,
  Sparkles,
  ShieldCheck,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Check,
  Minus,
} from 'lucide-react';
import { Shell } from './shell';
import { Sheet } from './sheet';
import { useToast } from './providers';
import { api } from '@/lib/api';
import type { CatalogResponse } from '@/lib/catalog';
import {
  categories,
  money,
  sizes,
  type Product,
  type CartLine,
} from '@/lib/model';
import { usePersistent } from '@/lib/persistent';

export function Shop({
  mode = 'home',
  initialSearch = '',
  initialData,
}: {
  mode?: 'home' | 'shop' | 'saved';
  initialSearch?: string;
  initialData?: CatalogResponse;
}) {
  const toast = useToast();
  const [category, setCategory] = useState('All pieces');
  const [q, setQ] = useState(initialSearch);
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [saved, setSaved] = usePersistent<string[]>('cc-saved', []);
  const [, setCart] = usePersistent<CartLine[]>('cc-bag', []);
  const products = useQuery({
    initialData:
      mode !== 'saved' &&
      category === 'All pieces' &&
      q === initialSearch &&
      sort === 'newest' &&
      page === 1
        ? initialData
        : undefined,
    queryKey: [
      'products',
      category,
      q,
      sort,
      page,
      mode,
      mode === 'saved' ? saved.join(',') : '',
    ],
    queryFn: () =>
      api<CatalogResponse>(
        'products?' +
          new URLSearchParams({
            category,
            q,
            sort,
            page: String(page),
            ...(mode === 'saved' ? { ids: saved.join(',') } : {}),
          }),
      ),
  });
  useEffect(() => {
    api('session', { method: 'POST', body: '{}' })
      .then(() =>
        api('events', {
          method: 'POST',
          body: JSON.stringify({ type: 'PageView' }),
        }),
      )
      .catch(() => {});
  }, []);
  function save(id: string) {
    try {
      setSaved((current) =>
        current.includes(id)
          ? current.filter((x) => x !== id)
          : [...current, id],
      );
    } catch (e) {
      toast((e as Error).message, true);
    }
  }
  function add(
    product: Product,
    size: string,
    quantity: number,
    notes: string,
  ) {
    try {
      setCart((current) => {
        const found = current.find(
          (l) =>
            l.productId === product.id && l.size === size && l.notes === notes,
        );
        if (
          (found?.quantity || 0) + quantity >
          Math.min(10, product.stock[size])
        )
          throw new Error('There aren’t enough pieces left in that size.');
        return found
          ? current.map((l) =>
              l === found ? { ...l, quantity: l.quantity + quantity } : l,
            )
          : [...current, { productId: product.id, size, quantity, notes }];
      });
      setSelected(null);
      toast('A little joy added to your bag.');
      api('events', {
        method: 'POST',
        body: JSON.stringify({ type: 'AddToCart' }),
      }).catch(() => {});
    } catch (e) {
      toast((e as Error).message, true);
    }
  }
  const displayed = products.data?.products.filter(
    (p) => mode !== 'saved' || saved.includes(p.id),
  );
  return (
    <Shell
      onSearch={(value) => {
        setQ(value);
        setPage(1);
      }}
    >
      {mode === 'home' && (
        <>
          <section className="hero container">
            <div className="hero-copy">
              <span className="eyebrow">
                <span className="tiny-flower">✧</span> FROM OUR HANDS TO YOURS
              </span>
              <h1>
                A little tradition.
                <br />A lot of <em>you.</em>
              </h1>
              <p>
                Handmade churi for the everyday moments
                <br className="desktop-only" /> and the ones you’ll remember
                forever.
              </p>
              <Link className="primary" href="#collection">
                Find your favourite <ArrowUpRight size={19} />
              </Link>
              <div className="hero-footnote">
                <span className="little-circles">◌ ◌ ◌</span> Made with love in
                Bangladesh
              </div>
            </div>
            <div className="hero-art">
              <div className="hero-photo">
                <Image
                  src="/products/7.jpeg"
                  alt="Handmade crimson silk bangles with gold floral mirror details, resting on teal fabric"
                  width={800}
                  height={1000}
                  priority
                  sizes="(max-width: 760px) 90vw, 45vw"
                />
                <span className="photo-caption">
                  a little colour. a little magic.
                </span>
              </div>
              <span className="hero-stamp">
                MADE BY HAND
                <br />
                <span>✳</span>
                <br />
                WORN WITH HEART
              </span>
              <div className="hero-inset">
                <Image
                  src="/products/3.jpeg"
                  alt="Colourful silk-wrapped square bangles"
                  width={220}
                  height={270}
                  sizes="160px"
                />
                <span>Uniquely yours ♡</span>
              </div>
              <span className="art-sparkle" aria-hidden="true">
                ✧
              </span>
            </div>
          </section>
          <div className="values-strip">
            <div className="container values-inner">
              <span>
                <HandHeart />
                Handmade, always
              </span>
              <span>
                <Sparkles />A little something for every you
              </span>
              <span>
                <Truck />
                Delivered across Bangladesh
              </span>
              <span>
                <ShieldCheck />
                Cash on delivery
              </span>
            </div>
          </div>
        </>
      )}
      <section id="collection" className="collection container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              {mode === 'saved'
                ? 'KEEP CLOSE'
                : mode === 'shop'
                  ? 'THE CHURICANVAS COLLECTION'
                  : 'THOUGHTFULLY MADE. JOYFULLY WORN.'}
            </span>
            <h2>
              {mode === 'saved'
                ? 'Your little favourites'
                : mode === 'shop'
                  ? 'Find your kind of colour.'
                  : 'Meet your next favourites.'}
            </h2>
            <p>
              {mode === 'saved'
                ? 'All the pieces you’ve had your heart on.'
                : 'A colour for every mood. A churi for every story.'}
            </p>
          </div>
          <span className="handwritten">made for your moments ♡</span>
        </div>
        <div className="collection-toolbar">
          <div className="category-tabs" aria-label="Product categories">
            {categories.map((c) => (
              <button
                className={category === c ? 'active' : ''}
                key={c}
                onClick={() => {
                  setCategory(c);
                  setPage(1);
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            className="filter-mobile secondary"
            onClick={() => setFilters(true)}
          >
            <SlidersHorizontal size={16} />
            Sort
          </button>
          <label className="sort-label">
            Sort by{' '}
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="newest">Newest first</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </label>
        </div>
        {q && (
          <div className="search-results">
            Results for “{q}”{' '}
            <button
              className="text-link"
              onClick={() => {
                setQ('');
                setPage(1);
              }}
            >
              Clear search ×
            </button>
          </div>
        )}
        {products.isPending ? (
          <div className="product-grid">
            {Array.from({ length: 6 }, (_, i) => (
              <div className="skeleton-card" key={i}>
                <div />
                <span />
                <span />
              </div>
            ))}
          </div>
        ) : products.isError ? (
          <div className="empty-state">
            <h3>Our pieces are taking a moment.</h3>
            <p>{products.error.message}</p>
            <button className="secondary" onClick={() => products.refetch()}>
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="product-grid">
              {displayed?.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-image-wrap">
                    <button
                      className="product-image-button"
                      onClick={() => setSelected(product)}
                      aria-label={'View ' + product.title}
                    >
                      <Image
                        src={product.images[0]}
                        alt={product.title}
                        width={500}
                        height={620}
                        sizes="(max-width: 600px) 45vw, (max-width: 900px) 44vw, 30vw"
                      />
                    </button>
                    {product.badge && (
                      <span className="product-badge">{product.badge}</span>
                    )}
                    <button
                      className={
                        'save-button ' +
                        (saved.includes(product.id) ? 'is-saved' : '')
                      }
                      onClick={() => save(product.id)}
                      aria-label={
                        (saved.includes(product.id) ? 'Unsave ' : 'Save ') +
                        product.title
                      }
                      aria-pressed={saved.includes(product.id)}
                    >
                      <Heart
                        size={18}
                        fill={
                          saved.includes(product.id) ? 'currentColor' : 'none'
                        }
                      />
                    </button>
                    <button
                      className="quick-add"
                      aria-label={'Choose size for ' + product.title}
                      onClick={() => setSelected(product)}
                    >
                      <Plus size={19} />
                      <span>Choose your size</span>
                    </button>
                  </div>
                  <div className="product-meta">
                    <div>
                      <span className="product-category">
                        {product.category} · Handmade
                      </span>
                      <h3>
                        <button onClick={() => setSelected(product)}>
                          {product.title}
                        </button>
                      </h3>
                      <p>
                        {money(product.price)} <span>/ set</span>
                      </p>
                    </div>
                    <span
                      className="colour-dot"
                      style={{
                        background:
                          [
                            '#d5aa3c',
                            '#aa3457',
                            '#366681',
                            '#8e793a',
                            '#79a444',
                            '#99374d',
                            '#a53643',
                            '#775582',
                            '#c99f78',
                          ][Number(product.id.split('-')[1]) - 1] || '#792b38',
                      }}
                      title="See product image for colours"
                    />
                  </div>
                </article>
              ))}
            </div>
            {displayed?.length === 0 && (
              <div className="empty-state">
                <Heart size={34} />
                <h3>
                  {mode === 'saved'
                    ? 'Your favourites start here.'
                    : 'No pieces found just yet.'}
                </h3>
                <p>
                  {mode === 'saved'
                    ? 'Tap a heart on a piece you love. We’ll keep it here for you.'
                    : 'Try another category or search.'}
                </p>
                <Link className="secondary" href="/shop">
                  Explore the collection <ArrowRight size={17} />
                </Link>
              </div>
            )}
            {(products.data?.pages || 0) > 1 && (
              <div className="pagination">
                <button
                  className="icon-btn"
                  aria-label="Previous page"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={20} />
                </button>
                <span>
                  Page {page} of {products.data?.pages}
                </span>
                <button
                  className="icon-btn"
                  aria-label="Next page"
                  disabled={page >= products.data!.pages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </>
        )}
        {mode === 'home' && (
          <div className="collection-bottom">
            <span>Small batches. Endless possibilities.</span>
            <Link href="/shop" className="text-link">
              Explore the full collection <ArrowRight size={18} />
            </Link>
          </div>
        )}
      </section>
      {mode === 'home' && (
        <>
          <section className="custom-banner container">
            <div className="custom-pattern" aria-hidden="true">
              <span>◉</span>
              <span>◉</span>
              <span>◉</span>
            </div>
            <div>
              <span className="eyebrow">A LITTLE MORE PERSONAL</span>
              <h2>
                Your colour. Your size. <em>Your story.</em>
              </h2>
              <p>
                Pick your fit and leave us a little note. We’ll add the handmade
                touch.
              </p>
            </div>
            <Link className="secondary" href="/shop">
              Make it yours <ArrowUpRight size={18} />
            </Link>
          </section>
          <section id="our-story" className="story container">
            <div className="story-image">
              <Image
                src="/products/1.jpeg"
                alt="Handmade yellow silk bangles with intricate floral embellishments"
                width={550}
                height={650}
                sizes="(max-width: 700px) 85vw, 35vw"
              />
              <span className="story-label">
                Slowly made.
                <br />
                Lovingly finished.
              </span>
            </div>
            <div className="story-copy">
              <span className="eyebrow">MORE THAN A LITTLE ACCESSORY</span>
              <h2>
                Tradition, with
                <br />a personal touch.
              </h2>
              <p>
                There’s something special about a churi. The colour that matches
                your favourite saree. The soft clink that feels like a
                celebration. The tiny detail that makes an outfit yours.
              </p>
              <p>
                At ChuriCanvas, we bring that feeling to life, one handmade set
                at a time. Rooted in Bangladesh, made for you.
              </p>
              <span className="handwritten">With love, ChuriCanvas ♡</span>
            </div>
          </section>
        </>
      )}
      {selected && (
        <ProductSheet
          product={selected}
          onClose={() => setSelected(null)}
          onAdd={add}
        />
      )}
      {filters && (
        <Sheet title="Sort the collection" onClose={() => setFilters(false)}>
          <div className="filter-options">
            {[
              ['newest', 'Newest first'],
              ['price-asc', 'Price: low to high'],
              ['price-desc', 'Price: high to low'],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => {
                  setSort(value);
                  setPage(1);
                  setFilters(false);
                }}
              >
                {label}
                {sort === value && <Check size={18} />}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </Shell>
  );
}
function ProductSheet({
  product: p,
  onClose,
  onAdd,
}: {
  product: Product;
  onClose: () => void;
  onAdd: (p: Product, size: string, quantity: number, notes: string) => void;
}) {
  const [size, setSize] = useState(sizes.find((s) => p.stock[s] > 0) || '2.6');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState(p.images[0]);
  const [guide, setGuide] = useState(false);
  return (
    <Sheet title="A piece of your story" onClose={onClose} wide>
      <div className="product-detail">
        <div>
          <Image
            className="detail-image"
            src={image}
            alt={p.title}
            width={500}
            height={600}
            sizes="(max-width: 650px) 85vw, 360px"
          />
          {p.images.length > 1 && (
            <div className="image-thumbs">
              {p.images.map((src, i) => (
                <button
                  className={image === src ? 'selected' : ''}
                  onClick={() => setImage(src)}
                  key={i}
                  aria-label={'View image ' + (i + 1)}
                >
                  <Image src={src} alt="" width={70} height={70} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="detail-copy">
          <span className="eyebrow">{p.category} · HANDMADE IN BANGLADESH</span>
          <h3>{p.title}</h3>
          <strong className="detail-price">
            {money(p.price)} <small>per set</small>
          </strong>
          <p>{p.description}</p>
          <div className="field-label-row">
            <label>Bangle size</label>
            <button className="text-link" onClick={() => setGuide(!guide)}>
              Size guide
            </button>
          </div>
          {guide && (
            <p className="size-guide">
              Measure the inside diameter of a bangle that fits: 2.4 = 57 mm,
              2.6 = 60 mm, 2.8 = 64 mm. These traditional labels use inches and
              sixteenths.
            </p>
          )}
          <div className="size-options">
            {sizes.map((s) => (
              <button
                disabled={!p.stock[s]}
                aria-pressed={size === s}
                className={size === s ? 'selected' : ''}
                onClick={() => {
                  setSize(s);
                  setQuantity(1);
                }}
                key={s}
              >
                {s}
                {!p.stock[s] && <small>Sold out</small>}
              </button>
            ))}
          </div>
          <label className="field">
            Make it personal <span>optional</span>
            <textarea
              maxLength={300}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="A colour preference, a gift note, a little idea…"
            />
          </label>
          <p className="fine-print">
            Custom requests are subject to availability. We’ll call to confirm.
          </p>
          <div className="add-row">
            <div className="quantity">
              <button
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
                onClick={() => setQuantity(quantity - 1)}
              >
                <Minus size={16} />
              </button>
              <span>{quantity}</span>
              <button
                aria-label="Increase quantity"
                disabled={quantity >= Math.min(10, p.stock[size])}
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              className="primary"
              disabled={!p.stock[size]}
              onClick={() => onAdd(p, size, quantity, notes)}
            >
              <Plus size={18} />
              {p.stock[size] ? 'Add to bag' : 'Sold out'}
            </button>
          </div>
          <div className="detail-assurance">
            <Truck size={18} /> ৳70 inside Dhaka · ৳130 outside Dhaka
          </div>
        </div>
      </div>
    </Sheet>
  );
}
