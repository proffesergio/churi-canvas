'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  ChartNoAxesCombined,
  Share2,
  LogOut,
  Plus,
  Search,
  ArrowUpRight,
  ArrowRight,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  RefreshCw,
  Check,
  ChevronDown,
  SlidersHorizontal,
  LockKeyhole,
  AlertCircle,
  TrendingUp,
  Users,
  ExternalLink,
  Facebook,
  Video,
  MessageCircle,
  X,
} from 'lucide-react';
import { Brand } from './shell';
import { Sheet } from './sheet';
import { useToast } from './providers';
import { api, ApiError } from '@/lib/api';
import {
  money,
  statuses,
  sizes,
  type Product,
  type Order,
  type SocialState,
} from '@/lib/model';
type Overview = {
  products: Product[];
  orders: Order[];
  social: SocialState;
  analytics: {
    PageView: number;
    AddToCart: number;
    Purchase: number;
    revenue: number;
  };
  storage: string;
  objectStorage: boolean;
};
type Tab = 'Overview' | 'Orders' | 'Inventory' | 'Social studio' | 'Analytics';
const tabs: { name: Tab; Icon: typeof Package }[] = [
  { name: 'Overview', Icon: LayoutDashboard },
  { name: 'Orders', Icon: ShoppingBag },
  { name: 'Inventory', Icon: Package },
  { name: 'Social studio', Icon: Share2 },
  { name: 'Analytics', Icon: ChartNoAxesCombined },
];
export function AdminLogin() {
  const router = useRouter();
  const client = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <div className="admin-login">
      <Brand />
      <div className="login-card">
        <span className="login-icon">
          <LockKeyhole size={24} />
        </span>
        <span className="eyebrow">THE CHURICANVAS WORKSPACE</span>
        <h1>
          Welcome back,
          <br />
          maker of little joys.
        </h1>
        <p>Sign in to care for your shop.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const data = new FormData(e.currentTarget);
            try {
              await api('auth/login', {
                method: 'POST',
                body: JSON.stringify({
                  email: data.get('email'),
                  password: data.get('password'),
                }),
              });
              client.clear();
              router.refresh();
            } catch (error) {
              toast((error as Error).message, true);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            Email address
            <input
              type="email"
              name="email"
              required
              autoComplete="username"
              placeholder="you@churicanvas.com"
              maxLength={160}
            />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              maxLength={256}
              placeholder="Your admin password"
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Enter your workspace'}
            <ArrowRight size={18} />
          </button>
        </form>
        <p className="fine-print">
          Admin access only. For local setup, use the credentials in your
          .env.local file.
        </p>
      </div>
      <Link className="text-link" href="/">
        Back to the storefront <ArrowUpRight size={17} />
      </Link>
    </div>
  );
}
export function Admin() {
  const router = useRouter();
  const toast = useToast();
  const client = useQueryClient();
  const [tab, setTab] = useState<Tab>('Overview');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [category, setCategory] = useState('All categories');
  const [visibility, setVisibility] = useState('All products');
  const [filter, setFilter] = useState(false);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [detail, setDetail] = useState<Order | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [swiped, setSwiped] = useState('');
  const touch = useRef(0);
  const overview = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => api<Overview>('admin/overview'),
    refetchInterval: 15000,
  });
  async function act(
    key: string,
    path: string,
    method: string,
    body?: unknown,
  ) {
    setBusy(key);
    try {
      const result = await api<{ message?: string }>(path, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      await client.invalidateQueries({ queryKey: ['admin-overview'] });
      await client.invalidateQueries({ queryKey: ['products'] });
      toast(result.message || 'Your shop is up to date.');
      return true;
    } catch (error) {
      toast((error as Error).message, true);
      if (error instanceof ApiError && error.status === 401) {
        client.clear();
        router.refresh();
      }
      return false;
    } finally {
      setBusy(null);
    }
  }
  const data = overview.data;
  const products =
    data?.products.filter(
      (p) =>
        p.title.toLowerCase().includes(query.toLowerCase()) &&
        (category === 'All categories' || p.category === category) &&
        (visibility === 'All products' ||
          p.visible === (visibility === 'Visible')),
    ) || [];
  const orders =
    data?.orders.filter(
      (o) =>
        (status === 'All statuses' || o.status === status) &&
        (o.id.toLowerCase().includes(query.toLowerCase()) ||
          o.name.toLowerCase().includes(query.toLowerCase()) ||
          o.phone.includes(query)),
    ) || [];
  const pending =
    data?.orders.filter((o) => o.status === 'Pending').length || 0;
  function changeTab(next: Tab) {
    setTab(next);
    setQuery('');
  }
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Brand />
        <div className="workspace-label">YOUR LITTLE BUSINESS, GROWING</div>
        <nav aria-label="Admin navigation">
          {tabs.map(({ name, Icon }) => (
            <button
              key={name}
              className={tab === name ? 'active' : ''}
              onClick={() => changeTab(name)}
            >
              <Icon size={20} />
              {name}
              {name === 'Orders' && pending > 0 && <span>{pending}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="maker-note">
            <span>✧</span>
            <p>
              You make the beautiful things.
              <br />
              We’ll keep things in order.
            </p>
          </div>
          <Link href="/" target="_blank">
            View storefront <ExternalLink size={16} />
          </Link>
          <button
            onClick={() =>
              act('logout', 'auth/logout', 'POST', {}).then((ok) => {
                if (ok) {
                  client.clear();
                  router.refresh();
                }
              })
            }
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="mobile-admin-brand">
              ChuriCanvas <small>WORKSPACE</small>
            </span>
            <span className="desktop-only">A little care goes a long way.</span>
          </div>
          <div>
            <Link href="/" className="text-link">
              Visit shop <ArrowUpRight size={16} />
            </Link>
            <span className="admin-avatar">CC</span>
          </div>
        </header>
        <main className="admin-content">
          <div className="admin-page-heading">
            <div>
              <span className="eyebrow">
                {new Date().toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </span>
              <h1>
                {tab === 'Overview'
                  ? 'Hello, maker.'
                  : tab === 'Social studio'
                    ? 'Your social studio.'
                    : tab === 'Inventory'
                      ? 'Every little piece.'
                      : tab === 'Orders'
                        ? 'Orders, with care.'
                        : 'The bigger picture.'}
              </h1>
              <p>
                {tab === 'Overview'
                  ? 'Here’s how your little corner of the world is doing.'
                  : tab === 'Inventory'
                    ? 'Curate your collection, one handmade set at a time.'
                    : tab === 'Orders'
                      ? 'From a new order to a happy doorstep.'
                      : tab === 'Social studio'
                        ? 'Bring your collection closer to your community.'
                        : 'Real storefront events. A clearer view of your business.'}
              </p>
            </div>
            {tab === 'Inventory' ? (
              <button className="primary" onClick={() => setEditing('new')}>
                <Plus size={18} />
                Add a piece
              </button>
            ) : (
              <button
                className="secondary"
                aria-label="Refresh dashboard"
                onClick={() => overview.refetch()}
              >
                <RefreshCw size={16} />
                <span className="desktop-only">Refresh</span>
              </button>
            )}
          </div>
          {overview.isPending ? (
            <div className="loading-block">Opening your workspace…</div>
          ) : overview.isError ? (
            <div className="empty-state">
              <AlertCircle size={32} />
              <h2>Your workspace couldn’t load.</h2>
              <p>{overview.error.message}</p>
              <button className="secondary" onClick={() => overview.refetch()}>
                Try again
              </button>
              <a href="/admin" className="text-link">
                Sign in again
              </a>
            </div>
          ) : (
            data && (
              <>
                <div className="storage-notice">
                  <span className="live-dot" />
                  {data.storage === 'Local demo'
                    ? 'Local demo · orders are saved on this computer'
                    : 'Neon Postgres connected · data is saved securely'}
                  <span>
                    {data.objectStorage
                      ? 'Object Storage connected'
                      : data.storage === 'Local demo'
                        ? 'Photos saved locally'
                        : 'Object Storage unavailable'}{' '}
                    · Payments &amp; social channels are simulations
                  </span>
                </div>
                {(tab === 'Overview' || tab === 'Analytics') && (
                  <>
                    <div className="stats-grid">
                      {[
                        {
                          label: 'Total sales',
                          value: money(data.analytics.revenue),
                          Icon: TrendingUp,
                          note: 'Order value, including delivery',
                        },
                        {
                          label: 'Orders',
                          value: String(data.orders.length),
                          Icon: ShoppingBag,
                          note: pending + ' waiting for your care',
                        },
                        {
                          label: 'Available sets',
                          value: String(
                            data.products.reduce(
                              (n, p) =>
                                n +
                                Object.values(p.stock).reduce(
                                  (a, b) => a + b,
                                  0,
                                ),
                              0,
                            ),
                          ),
                          Icon: Package,
                          note:
                            data.products.filter((p) => p.visible).length +
                            ' visible pieces',
                        },
                        {
                          label: 'Store visits',
                          value: String(data.analytics.PageView),
                          Icon: Users,
                          note: 'Recorded PageView events',
                        },
                      ].map(({ label, value, Icon, note }) => (
                        <div className="stat-card" key={label}>
                          <div>
                            <span>{label}</span>
                            <Icon size={19} />
                          </div>
                          <strong>{value}</strong>
                          <small>{note}</small>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {tab === 'Overview' && (
                  <>
                    <div className="admin-overview-grid">
                      <section className="admin-panel">
                        <div className="panel-heading">
                          <h2>Orders to care for</h2>
                          <button
                            className="text-link"
                            onClick={() => changeTab('Orders')}
                          >
                            View all <ArrowRight size={16} />
                          </button>
                        </div>
                        {data.orders.length === 0 ? (
                          <AdminEmpty
                            icon="orders"
                            title="Your first little joy is on its way."
                            text="Orders from the storefront will appear here, ready for you to fulfil."
                          />
                        ) : (
                          <div>
                            {data.orders.slice(0, 5).map((o) => (
                              <button
                                className="overview-order"
                                key={o.id}
                                onClick={() => setDetail(o)}
                              >
                                <span className="order-initial">
                                  {o.name.slice(0, 1).toUpperCase()}
                                </span>
                                <span>
                                  <strong>{o.name}</strong>
                                  <small>
                                    {o.id} ·{' '}
                                    {o.items.reduce(
                                      (n, i) => n + i.quantity,
                                      0,
                                    )}{' '}
                                    sets
                                  </small>
                                </span>
                                <span>
                                  <strong>{money(o.total)}</strong>
                                  <small className="status-inline">
                                    {o.status}
                                  </small>
                                </span>
                                <ArrowRight size={16} />
                              </button>
                            ))}
                          </div>
                        )}
                      </section>
                      <section className="admin-panel attention-panel">
                        <span className="eyebrow">A LITTLE ATTENTION</span>
                        <h2>Keep the joy flowing.</h2>
                        <div>
                          <Package size={21} />
                          <span>
                            <strong>
                              {
                                data.products.filter((p) =>
                                  Object.values(p.stock).some((n) => n < 3),
                                ).length
                              }{' '}
                              pieces running low
                            </strong>
                            <small>Any size with fewer than 3 sets</small>
                          </span>
                        </div>
                        <div>
                          <ShoppingBag size={21} />
                          <span>
                            <strong>{pending} pending orders</strong>
                            <small>A little care, then on their way</small>
                          </span>
                        </div>
                        <button
                          className="secondary"
                          onClick={() => changeTab('Inventory')}
                        >
                          Manage your pieces <ArrowRight size={16} />
                        </button>
                      </section>
                    </div>
                    <section className="admin-social-banner">
                      <div>
                        <span className="eyebrow">
                          YOUR SHOP, BEYOND THE STOREFRONT
                        </span>
                        <h2>A little more connected.</h2>
                        <p>
                          Try catalog sync, Messenger order requests, and
                          conversion events.
                        </p>
                      </div>
                      <button
                        className="primary"
                        onClick={() => changeTab('Social studio')}
                      >
                        Open social studio <ArrowUpRight size={17} />
                      </button>
                    </section>
                  </>
                )}
                {tab === 'Inventory' && (
                  <>
                    <div className="admin-table-tools">
                      <label className="admin-search">
                        <Search size={18} />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Find a piece…"
                          aria-label="Search inventory"
                        />
                      </label>
                      <div className="desktop-filters">
                        <select
                          aria-label="Filter category"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                        >
                          {[
                            'All categories',
                            'Everyday',
                            'Festive',
                            'Bridal',
                          ].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                        <select
                          aria-label="Filter visibility"
                          value={visibility}
                          onChange={(e) => setVisibility(e.target.value)}
                        >
                          {['All products', 'Visible', 'Hidden'].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        className="secondary filter-mobile"
                        onClick={() => setFilter(true)}
                      >
                        <SlidersHorizontal size={17} />
                        Filters
                      </button>
                    </div>
                    <div className="inventory-list">
                      <div className="inventory-table-head">
                        <span>Piece</span>
                        <span>Price / set</span>
                        <span>Available sets</span>
                        <span>Visibility</span>
                        <span>Actions</span>
                      </div>
                      {products.map((p) => (
                        <article
                          key={p.id}
                          className={
                            'inventory-row ' +
                            (swiped === p.id ? 'is-swiped' : '')
                          }
                          onTouchStart={(e) => {
                            touch.current = e.touches[0].clientX;
                          }}
                          onTouchEnd={(e) => {
                            const delta =
                              e.changedTouches[0].clientX - touch.current;
                            if (delta < -50) setSwiped(p.id);
                            if (delta > 50) setSwiped('');
                          }}
                        >
                          <div className="inventory-piece">
                            <Image
                              src={p.images[0]}
                              alt={p.title}
                              width={60}
                              height={72}
                            />
                            <span>
                              <strong>{p.title}</strong>
                              <small>
                                {p.category} · {p.images.length} photo
                                {p.images.length > 1 ? 's' : ''}
                              </small>
                            </span>
                          </div>
                          <strong className="inventory-price">
                            {money(p.price)}
                          </strong>
                          <div className="stock-pills">
                            {sizes.map((s) => (
                              <span
                                className={p.stock[s] < 3 ? 'low' : ''}
                                key={s}
                              >
                                {s}
                                <b>{p.stock[s]}</b>
                              </span>
                            ))}
                          </div>
                          <button
                            className={
                              'visibility-pill ' + (p.visible ? 'visible' : '')
                            }
                            disabled={busy !== null}
                            onClick={() =>
                              act(p.id, 'admin/products/' + p.id, 'PUT', {
                                ...p,
                                visible: !p.visible,
                              })
                            }
                          >
                            {p.visible ? (
                              <Eye size={14} />
                            ) : (
                              <EyeOff size={14} />
                            )}{' '}
                            {p.visible ? 'Visible' : 'Hidden'}
                          </button>
                          <div className="row-actions">
                            <button
                              className="icon-btn"
                              aria-label={'Edit ' + p.title}
                              onClick={() => setEditing(p)}
                            >
                              <Pencil size={17} />
                            </button>
                            <button
                              className="icon-btn danger"
                              aria-label={'Delete ' + p.title}
                              onClick={() => setDeleting(p)}
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </article>
                      ))}
                      {products.length === 0 && (
                        <AdminEmpty
                          title="No pieces here just yet."
                          text="Add your first piece or adjust the filters."
                        />
                      )}
                    </div>
                    <p className="fine-print mobile-only">
                      Swipe left on a piece to highlight its actions. Edit and
                      delete buttons are always available.
                    </p>
                  </>
                )}
                {tab === 'Orders' && (
                  <>
                    <div className="admin-table-tools">
                      <label className="admin-search">
                        <Search size={18} />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Name, order ID or phone…"
                          aria-label="Search orders"
                        />
                      </label>
                      <select
                        className="desktop-filters"
                        aria-label="Filter order status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        {['All statuses', ...statuses].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                      <button
                        className="secondary filter-mobile"
                        onClick={() => setFilter(true)}
                      >
                        <SlidersHorizontal size={17} />
                        Filters
                      </button>
                    </div>
                    <div className="orders-list">
                      {orders.map((o) => (
                        <article className="admin-order-card" key={o.id}>
                          <div className="order-card-heading">
                            <button
                              className="text-link"
                              onClick={() => setDetail(o)}
                            >
                              {o.id}
                              <ArrowUpRight size={14} />
                            </button>
                            <time>
                              {new Date(o.createdAt).toLocaleDateString(
                                'en-GB',
                                { day: 'numeric', month: 'short' },
                              )}
                            </time>
                          </div>
                          <div className="order-card-main">
                            <div>
                              <strong>{o.name}</strong>
                              <a href={'tel:' + o.phone}>{o.phone}</a>
                              <span>
                                {o.zone} ·{' '}
                                {o.items.reduce((n, i) => n + i.quantity, 0)}{' '}
                                sets
                              </span>
                            </div>
                            <div>
                              <strong>{money(o.total)}</strong>
                              <span>{o.payment}</span>
                              <small>{o.paymentStatus}</small>
                            </div>
                          </div>
                          <div className="order-card-bottom">
                            <button
                              className="text-link"
                              onClick={() => setDetail(o)}
                            >
                              View details <ArrowRight size={15} />
                            </button>
                            <label className="status-select">
                              <span className="sr-only">Status for {o.id}</span>
                              <select
                                disabled={busy !== null}
                                value={o.status}
                                onChange={(e) =>
                                  act(o.id, 'admin/orders/' + o.id, 'PATCH', {
                                    status: e.target.value,
                                  })
                                }
                              >
                                {statuses.map((s) => (
                                  <option key={s}>{s}</option>
                                ))}
                              </select>
                              <ChevronDown size={14} />
                            </label>
                          </div>
                        </article>
                      ))}
                    </div>
                    {orders.length === 0 && (
                      <AdminEmpty
                        icon="orders"
                        title="No orders to show."
                        text="Your storefront orders appear here. Try changing the filter."
                      />
                    )}
                  </>
                )}
                {tab === 'Social studio' && (
                  <>
                    <div className="mock-notice">
                      <AlertCircle size={20} />
                      <div>
                        <strong>A safe space to try things.</strong>
                        <p>
                          These modules use mock endpoints. No external accounts
                          are connected, no ads are running, and no messages are
                          sent.
                        </p>
                      </div>
                    </div>
                    <div className="social-grid">
                      {[
                        {
                          platform: 'facebook' as const,
                          title: 'Facebook catalog',
                          Icon: Facebook,
                          action: 'facebook-sync',
                          text: 'Simulate publishing your visible pieces and size variants to a Meta catalog.',
                        },
                        {
                          platform: 'tiktok' as const,
                          title: 'TikTok Shop',
                          Icon: Video,
                          action: 'tiktok-sync',
                          text: 'Simulate variant inventory sync with product anchors for your videos.',
                        },
                      ].map(({ platform, title, Icon, action, text }) => (
                        <section
                          className="admin-panel social-card"
                          key={platform}
                        >
                          <div className="social-card-top">
                            <span className={'social-icon ' + platform}>
                              <Icon size={25} />
                            </span>
                            <span className="mock-tag">MOCK CONNECTION</span>
                          </div>
                          <h2>{title}</h2>
                          <p>{text}</p>
                          <div className="sync-detail">
                            <span>
                              {data.social[platform].count} variants synced
                            </span>
                            <small>
                              {data.social[platform].syncedAt
                                ? 'Last sync ' +
                                  new Date(
                                    data.social[platform].syncedAt!,
                                  ).toLocaleString('en-GB')
                                : 'Ready for your first sync'}
                            </small>
                          </div>
                          <button
                            className="secondary"
                            disabled={busy !== null}
                            onClick={() =>
                              act(action, 'admin/social', 'POST', { action })
                            }
                          >
                            <RefreshCw size={16} />
                            {busy === action ? 'Syncing…' : 'Sync inventory'}
                          </button>
                        </section>
                      ))}
                    </div>
                    <section className="admin-panel messenger-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>
                            <MessageCircle size={20} />
                            Messenger order requests
                          </h2>
                          <p>
                            Simulated inbound webhooks. Review requests before
                            creating a real order.
                          </p>
                        </div>
                        <button
                          className="secondary"
                          disabled={busy !== null}
                          onClick={() =>
                            act('webhook', 'admin/social', 'POST', {
                              action: 'mock-webhook',
                            })
                          }
                        >
                          <Plus size={16} />
                          Simulate webhook
                        </button>
                      </div>
                      {data.social.messages.length === 0 ? (
                        <AdminEmpty
                          title="Your inbox is a quiet little place."
                          text="Simulate a Messenger webhook to see an incoming order enquiry."
                        />
                      ) : (
                        data.social.messages.map((message) => (
                          <div className="message-row" key={message.id}>
                            <span className="order-initial">S</span>
                            <div>
                              <strong>{message.name}</strong>
                              <small>
                                {message.source} ·{' '}
                                {new Date(message.at).toLocaleTimeString(
                                  'en-GB',
                                  { hour: '2-digit', minute: '2-digit' },
                                )}
                              </small>
                              <p>{message.text}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </section>
                  </>
                )}
                {tab === 'Analytics' && (
                  <>
                    <div className="analytics-grid">
                      <section className="admin-panel">
                        <div className="panel-heading">
                          <h2>Your conversion journey</h2>
                          <span className="mock-tag">OBSERVED EVENTS</span>
                        </div>
                        <div className="funnel">
                          {[
                            {
                              name: 'PageView',
                              label: 'A little curiosity',
                              color: '#e4c8ac',
                            },
                            {
                              name: 'AddToCart',
                              label: 'Something caught their eye',
                              color: '#bf8784',
                            },
                            {
                              name: 'Purchase',
                              label: 'A little joy, ordered',
                              color: '#792b38',
                            },
                          ].map(({ name, label, color }) => (
                            <div key={name}>
                              <div>
                                <strong>{name}</strong>
                                <span>
                                  {
                                    data.analytics[
                                      name as
                                        | 'PageView'
                                        | 'AddToCart'
                                        | 'Purchase'
                                    ]
                                  }
                                </span>
                              </div>
                              <div className="funnel-track">
                                <span
                                  style={{
                                    width:
                                      Math.max(
                                        2,
                                        Math.min(
                                          100,
                                          (data.analytics[
                                            name as
                                              | 'PageView'
                                              | 'AddToCart'
                                              | 'Purchase'
                                          ] /
                                            Math.max(
                                              1,
                                              data.analytics.PageView,
                                            )) *
                                            100,
                                        ),
                                      ) + '%',
                                    background: color,
                                  }}
                                />
                              </div>
                              <small>{label}</small>
                            </div>
                          ))}
                        </div>
                        <p className="fine-print">
                          Counts are events, not unique people. Purchase is
                          recorded by the server after an order is saved. The
                          most recent 10,000 events are retained.
                        </p>
                      </section>
                      <section className="admin-panel">
                        <span className="eyebrow">MEASURED WITH CARE</span>
                        <h2>Channel attribution</h2>
                        <div className="channel-row">
                          <span>Storefront</span>
                          <strong>{data.analytics.Purchase} orders</strong>
                        </div>
                        <div className="channel-row">
                          <span>Meta Ads</span>
                          <span className="mock-tag">NOT CONNECTED</span>
                        </div>
                        <div className="channel-row">
                          <span>TikTok Ads</span>
                          <span className="mock-tag">NOT CONNECTED</span>
                        </div>
                        <p>
                          PageView, AddToCart and Purchase events are ready to
                          map to external pixels. Real ad spend, ROAS and
                          conversion attribution require live credentials and
                          consent configuration.
                        </p>
                        <button
                          className="text-link"
                          onClick={() => changeTab('Social studio')}
                        >
                          Explore integrations <ArrowRight size={16} />
                        </button>
                      </section>
                    </div>
                  </>
                )}
              </>
            )
          )}
        </main>
        <footer className="admin-footer">
          Made for the hands behind ChuriCanvas.{' '}
          <span>With a little care, always. ♡</span>
        </footer>
      </div>
      <nav className="admin-bottom-nav" aria-label="Mobile admin navigation">
        {tabs.map(({ name, Icon }) => (
          <button
            className={tab === name ? 'active' : ''}
            key={name}
            onClick={() => changeTab(name)}
          >
            <Icon size={20} />
            <span>{name === 'Social studio' ? 'Social' : name}</span>
          </button>
        ))}
      </nav>
      <button
        className="admin-mobile-logout"
        aria-label="Sign out of admin"
        onClick={() =>
          act('logout', 'auth/logout', 'POST', {}).then((ok) => {
            if (ok) client.clear();
            router.refresh();
          })
        }
      >
        <LogOut size={17} />
      </button>
      {editing && (
        <ProductEditor
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (value) => {
            const ok = await act(
              'save',
              editing === 'new'
                ? 'admin/products'
                : 'admin/products/' + editing.id,
              editing === 'new' ? 'POST' : 'PUT',
              value,
            );
            if (ok) setEditing(null);
          }}
          busy={busy === 'save'}
        />
      )}
      {deleting && (
        <Sheet
          title="Say goodbye to this piece?"
          onClose={() => setDeleting(null)}
        >
          <div className="delete-confirm">
            <Image
              src={deleting.images[0]}
              width={90}
              height={110}
              alt={deleting.title}
            />
            <h3>{deleting.title}</h3>
            <p>
              This removes the piece from your inventory and storefront.
              Existing order details are kept. You can hide it instead if you
              may bring it back.
            </p>
            <div>
              <button className="secondary" onClick={() => setDeleting(null)}>
                Keep it
              </button>
              <button
                className="primary danger-bg"
                disabled={busy !== null}
                onClick={() =>
                  act('delete', 'admin/products/' + deleting.id, 'DELETE').then(
                    (ok) => {
                      if (ok) setDeleting(null);
                    },
                  )
                }
              >
                {busy === 'delete' ? 'Removing…' : 'Delete piece'}
              </button>
            </div>
          </div>
        </Sheet>
      )}
      {detail && (
        <OrderDetail
          order={data?.orders.find((o) => o.id === detail.id) || detail}
          onClose={() => setDetail(null)}
        />
      )}
      {filter && (
        <Sheet
          title={tab === 'Orders' ? 'Filter orders' : 'Filter your pieces'}
          onClose={() => setFilter(false)}
        >
          <div className="admin-filter-sheet">
            {tab === 'Orders' ? (
              <label className="field">
                Order status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {['All statuses', ...statuses].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label className="field">
                  Category
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {['All categories', 'Everyday', 'Festive', 'Bridal'].map(
                      (c) => (
                        <option key={c}>{c}</option>
                      ),
                    )}
                  </select>
                </label>
                <label className="field">
                  Visibility
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                  >
                    {['All products', 'Visible', 'Hidden'].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <button className="primary" onClick={() => setFilter(false)}>
              Show results <Check size={17} />
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
function AdminEmpty({
  title,
  text,
  icon,
}: {
  title: string;
  text: string;
  icon?: string;
}) {
  return (
    <div className="empty-state admin-empty">
      {icon === 'orders' ? <ShoppingBag size={30} /> : <Package size={30} />}
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
async function imageData(file: File): Promise<string> {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 10_000_000
  )
    throw new Error('Choose a JPEG, PNG or WebP smaller than 10 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const ctx = canvas.getContext('2d');
    if (!ctx)
      throw new Error('Image processing is unavailable in this browser.');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL('image/webp', 0.82);
    if (result.length > 700_000)
      throw new Error('This photo is too detailed. Choose a smaller image.');
    return result;
  } finally {
    bitmap.close();
  }
}
function ProductEditor({
  product,
  onClose,
  onSave,
  busy,
}: {
  product: Product | null;
  onClose: () => void;
  onSave: (p: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  busy: boolean;
}) {
  const toast = useToast();
  const [images, setImages] = useState<string[]>(product?.images || []);
  const [uploading, setUploading] = useState(false);
  return (
    <Sheet
      title={product ? 'Edit your piece' : 'A new little piece'}
      onClose={onClose}
      wide
    >
      <form
        className="product-editor"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          void onSave({
            revision: product?.revision || 1,
            title: String(form.get('title')),
            description: String(form.get('description')),
            price: Number(form.get('price')),
            category: String(form.get('category')),
            badge: String(form.get('badge')),
            visible: form.get('visible') === 'on',
            stock: Object.fromEntries(
              sizes.map((s) => [s, Number(form.get('stock-' + s))]),
            ),
            images,
          });
        }}
      >
        <div>
          <label className="field">
            Product title
            <input
              name="title"
              required
              minLength={2}
              maxLength={100}
              defaultValue={product?.title}
              placeholder="A name for your little creation"
            />
          </label>
          <label className="field">
            Description
            <textarea
              name="description"
              required
              minLength={10}
              maxLength={1500}
              rows={4}
              defaultValue={
                product?.description ||
                'Handmade with care in Bangladesh. A beautiful silk-wrapped bangle set, finished with traditional detailing.'
              }
            />
          </label>
          <div className="field-row">
            <label className="field">
              Price (৳ / set)
              <input
                name="price"
                type="number"
                inputMode="numeric"
                required
                min={1}
                max={100000}
                step={1}
                defaultValue={product?.price || 250}
              />
            </label>
            <label className="field">
              Collection
              <select
                name="category"
                defaultValue={product?.category || 'Everyday'}
              >
                {['Everyday', 'Festive', 'Bridal'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <fieldset>
            <legend>Available sets by size</legend>
            <div className="stock-fields">
              {sizes.map((s) => (
                <label className="field" key={s}>
                  Size {s}
                  <input
                    type="number"
                    name={'stock-' + s}
                    inputMode="numeric"
                    min={0}
                    max={10000}
                    required
                    defaultValue={product?.stock[s] ?? 10}
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <label className="field">
            Little label <span>optional</span>
            <input
              name="badge"
              maxLength={30}
              defaultValue={product?.badge}
              placeholder="e.g. Bestseller or New arrival"
            />
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              name="visible"
              defaultChecked={product?.visible ?? true}
            />
            <span>Visible in the storefront</span>
          </label>
        </div>
        <div>
          <span className="field-label">
            Product photos ({images.length}/5)
          </span>
          <p className="fine-print">
            First photo is the cover. Upload multiple views, or choose from your
            original photos.
          </p>
          <div className="upload-previews">
            {images.map((src, i) => (
              <div key={i}>
                <Image
                  src={src}
                  width={130}
                  height={150}
                  alt={'Product preview ' + (i + 1)}
                />
                <button
                  type="button"
                  aria-label={'Remove image ' + (i + 1)}
                  onClick={() =>
                    setImages(images.filter((_, index) => i !== index))
                  }
                >
                  <X size={14} />
                </button>
                {i === 0 && <span>COVER</span>}
              </div>
            ))}
          </div>
          <label className="upload-button">
            <Upload size={20} />
            {uploading ? 'Preparing photos…' : 'Upload your photos'}
            <small>JPEG, PNG or WebP · up to 5 photos</small>
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={uploading || images.length >= 5}
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                if (images.length + files.length > 5) {
                  toast('Keep up to five photos per piece.', true);
                  return;
                }
                setUploading(true);
                try {
                  const uploaded = await Promise.all(files.map(imageData));
                  setImages((current) => [...current, ...uploaded]);
                } catch (error) {
                  toast((error as Error).message, true);
                } finally {
                  setUploading(false);
                  e.target.value = '';
                }
              }}
            />
          </label>
          <div className="original-photo-picker">
            <span className="field-label">Your original photos</span>
            <div>
              {Array.from(
                { length: 9 },
                (_, i) => '/products/' + (i + 1) + '.jpeg',
              ).map((src, i) => (
                <button
                  key={src}
                  type="button"
                  aria-label={'Add original photo ' + (i + 1)}
                  disabled={images.length >= 5 || images.includes(src)}
                  onClick={() => setImages([...images, src])}
                >
                  <Image
                    src={src}
                    width={65}
                    height={75}
                    alt={'Original photo ' + (i + 1)}
                  />
                  {images.includes(src) && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="editor-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary"
            disabled={busy || uploading || images.length === 0}
          >
            {busy
              ? 'Saving…'
              : product
                ? 'Save your changes'
                : 'Add to your collection'}
            <Check size={17} />
          </button>
        </div>
      </form>
    </Sheet>
  );
}
function OrderDetail({
  order: o,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  return (
    <Sheet title={o.id} onClose={onClose}>
      <div className="order-detail">
        <span className="status-badge">{o.status}</span>
        <h3>{o.name}</h3>
        <a className="text-link" href={'tel:' + o.phone}>
          {o.phone}
        </a>
        <p className="address">
          {o.address}
          <br />
          {o.zone}
        </p>
        <div className="order-detail-items">
          {o.items.map((item, i) => (
            <div key={i}>
              <Image src={item.image} alt={item.title} width={65} height={80} />
              <span>
                <strong>{item.title}</strong>
                <small>
                  Size {item.size} · {item.quantity} sets
                </small>
                {item.notes && <p>Custom note: {item.notes}</p>}
              </span>
              <strong>{money(item.price * item.quantity)}</strong>
            </div>
          ))}
        </div>
        <div className="receipt-row">
          <span>Subtotal</span>
          <strong>{money(o.subtotal)}</strong>
        </div>
        <div className="receipt-row">
          <span>Delivery</span>
          <strong>{money(o.delivery)}</strong>
        </div>
        <div className="receipt-row receipt-total">
          <span>Total</span>
          <strong>{money(o.total)}</strong>
        </div>
        <p>
          {o.payment} · {o.paymentStatus}
          {o.paymentReference && (
            <>
              <br />
              Reference: {o.paymentReference}
            </>
          )}
        </p>
        <h4>Order history</h4>
        {o.history.map((h, i) => (
          <p className="fine-print" key={i}>
            {h.status} · {new Date(h.at).toLocaleString('en-GB')}
          </p>
        ))}
      </div>
    </Sheet>
  );
}
