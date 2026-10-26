'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Search,
  ShoppingBag,
  Heart,
  House,
  Grid2X2,
  Package,
  ArrowUpRight,
  Instagram,
  Menu,
  X,
} from 'lucide-react';
import { usePersistent } from '@/lib/persistent';
import type { CartLine } from '@/lib/model';
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="ChuriCanvas home">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>
        Churi<span className="brand-accent">Canvas</span>
        <small>HANDMADE. HEARTFELT. YOURS.</small>
      </span>
    </Link>
  );
}
export function Shell({
  children,
  onSearch,
}: {
  children: React.ReactNode;
  onSearch?: (q: string) => void;
}) {
  const pathname = usePathname();
  const [cart] = usePersistent<CartLine[]>('cc-bag', []);
  const [search, setSearch] = useState(false);
  const [menu, setMenu] = useState(false);
  const count = cart.reduce((n, l) => n + l.quantity, 0);
  return (
    <>
      <div className="announcement">
        A little joy, delivered across Bangladesh <span>✧</span> Cash on
        delivery available
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="Main navigation">
            <Link className={pathname === '/' ? 'active' : ''} href="/">
              Home
            </Link>
            <Link className={pathname === '/shop' ? 'active' : ''} href="/shop">
              The collection
            </Link>
            <Link href="/#our-story">Our story</Link>
            <Link
              className={pathname === '/track' ? 'active' : ''}
              href="/track"
            >
              Track order
            </Link>
          </nav>
          <div className="header-actions">
            <button
              className="icon-btn"
              onClick={() => setSearch(!search)}
              aria-label="Search the collection"
            >
              {search ? <X size={21} /> : <Search size={21} />}
            </button>
            <Link
              className="icon-btn saved-header"
              href="/saved"
              aria-label="Saved pieces"
            >
              <Heart size={21} />
            </Link>
            <Link
              href="/cart"
              className="bag-link"
              aria-label={'Shopping bag, ' + count + ' items'}
            >
              <ShoppingBag size={21} />
              <span className="bag-label">Bag</span>
              <span className="bag-count">{count}</span>
            </Link>
            <button
              className="icon-btn mobile-menu"
              aria-label="Toggle menu"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {search && (
          <form
            className="search-bar"
            action="/shop"
            onSubmit={(e) => {
              if (onSearch) {
                e.preventDefault();
                onSearch(String(new FormData(e.currentTarget).get('q') || ''));
                document
                  .getElementById('collection')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            <Search size={20} />
            <input
              autoFocus
              name="q"
              placeholder="Find your next favourite…"
              aria-label="Search products"
            />
            <button className="text-link" type="submit">
              Search →
            </button>
          </form>
        )}
        {menu && (
          <nav className="mobile-menu-panel" aria-label="Mobile menu">
            <Link onClick={() => setMenu(false)} href="/shop">
              The collection
            </Link>
            <Link onClick={() => setMenu(false)} href="/#our-story">
              Our story
            </Link>
            <Link href="/admin">
              Admin workspace <ArrowUpRight size={16} />
            </Link>
          </nav>
        )}
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div>
          <Brand />
          <p>
            Little circles of tradition.
            <br />
            Made by hand, worn with heart.
          </p>
        </div>
        <div>
          <h3>Explore</h3>
          <Link href="/shop">The collection</Link>
          <Link href="/saved">Saved pieces</Link>
          <Link href="/track">Track your order</Link>
        </div>
        <div>
          <h3>Made for you</h3>
          <p>
            Sizes 2.4 · 2.6 · 2.8
            <br />
            Inside Dhaka: ৳70 delivery
            <br />
            Outside Dhaka: ৳130 delivery
          </p>
        </div>
        <div>
          <h3>Let’s stay close</h3>
          <a href="mailto:hello@churicanvas.com">
            hello@churicanvas.com <ArrowUpRight size={14} />
          </a>
          <p>
            <Instagram size={16} /> Handmade in Bangladesh
          </p>
          <Link href="/admin">
            Admin workspace <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} ChuriCanvas. Crafted with care.
          </span>
          <span>
            Cash on delivery <b>·</b> bKash & Nagad demo payments
          </span>
        </div>
      </footer>
      <nav className="bottom-nav" aria-label="Bottom navigation">
        {[
          { href: '/', label: 'Home', Icon: House },
          { href: '/shop', label: 'Shop', Icon: Grid2X2 },
          { href: '/saved', label: 'Saved', Icon: Heart },
          { href: '/track', label: 'Orders', Icon: Package },
          { href: '/cart', label: 'Bag', Icon: ShoppingBag },
        ].map(({ href, label, Icon }) => (
          <Link
            key={href}
            className={pathname === href ? 'active' : ''}
            href={href}
          >
            <span>
              <Icon size={21} />
              {href === '/cart' && count > 0 && <b>{count}</b>}
            </span>
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
