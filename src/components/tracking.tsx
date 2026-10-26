'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Check,
  Package,
  ArrowRight,
  Copy,
  RefreshCw,
  LockKeyhole,
} from 'lucide-react';
import { Shell } from './shell';
import { useToast } from './providers';
import { api } from '@/lib/api';
import { money, statuses, type Order } from '@/lib/model';
type Tracked = Pick<
  Order,
  | 'id'
  | 'status'
  | 'history'
  | 'createdAt'
  | 'total'
  | 'payment'
  | 'paymentStatus'
> & { items: { title: string; quantity: number; size: string }[] };
export function Tracking({
  id = '',
  token = '',
}: {
  id?: string;
  token?: string;
}) {
  const toast = useToast();
  const [lookup, setLookup] = useState({ id, token });
  const orders = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => api<{ orders: (Tracked & { token: string })[] }>('orders'),
  });
  const order = useQuery({
    queryKey: ['tracking', lookup.id, lookup.token],
    queryFn: () => api<Tracked>('track?' + new URLSearchParams(lookup)),
    enabled: !!lookup.id,
    refetchInterval: 10000,
  });
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        window.location.origin + '/track?' + new URLSearchParams(lookup),
      );
      toast('Private tracking link copied. Keep it safe.');
    } catch {
      toast(
        'Copy the address from your browser to save this tracking link.',
        true,
      );
    }
  }
  return (
    <Shell>
      <section className="container tracking-page">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FROM OUR HANDS TO YOUR DOOR</span>
            <h1>Your little joy, on its way.</h1>
            <p>Follow every step of your handmade order.</p>
          </div>
          <Package size={44} className="heading-icon" />
        </div>
        {lookup.id && (
          <div className="tracking-card">
            {order.isPending ? (
              <p>Finding your order…</p>
            ) : order.isError ? (
              <div className="empty-state">
                <h2>We couldn’t find that order.</h2>
                <p>{order.error.message}</p>
                <button className="secondary" onClick={() => order.refetch()}>
                  Try again
                </button>
              </div>
            ) : (
              order.data && (
                <>
                  <div className="tracking-heading">
                    <div>
                      <span className="eyebrow">
                        THANK YOU FOR CHOOSING HANDMADE
                      </span>
                      <h2>{order.data.id}</h2>
                      <p>
                        Placed{' '}
                        {new Date(order.data.createdAt).toLocaleDateString(
                          'en-GB',
                          { day: 'numeric', month: 'long', year: 'numeric' },
                        )}
                      </p>
                    </div>
                    <span
                      className={
                        'status-badge status-' +
                        order.data.status.replaceAll(' ', '-').toLowerCase()
                      }
                    >
                      {order.data.status}
                    </span>
                  </div>
                  <ol className="status-timeline">
                    {statuses.map((status, i) => {
                      const done = statuses.indexOf(order.data!.status) >= i;
                      const step = order.data!.history.findLast(
                        (h) => h.status === status,
                      );
                      return (
                        <li key={status} className={done ? 'done' : ''}>
                          <span className="step-dot">
                            {done ? <Check size={18} /> : i + 1}
                          </span>
                          <div>
                            <strong>{status}</strong>
                            <small>
                              {step
                                ? new Date(step.at).toLocaleString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : [
                                    'We’ve received your order',
                                    'Made ready with care',
                                    'On the way to your door',
                                    'A little joy, now yours',
                                  ][i]}
                            </small>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                  <div className="tracking-items">
                    {order.data.items.map((item, i) => (
                      <div key={i}>
                        <span>
                          {item.title}
                          <small>
                            Size {item.size} · {item.quantity} set
                            {item.quantity > 1 ? 's' : ''}
                          </small>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="tracking-total">
                    <span>
                      {order.data.payment} · {order.data.paymentStatus}
                    </span>
                    <strong>{money(order.data.total)}</strong>
                  </div>
                  <div className="tracking-actions">
                    <button className="secondary" onClick={copy}>
                      <Copy size={16} />
                      Save tracking link
                    </button>
                    <button
                      className="text-link"
                      onClick={() => order.refetch()}
                    >
                      <RefreshCw size={15} />
                      Refresh status
                    </button>
                  </div>
                  <p className="secure-note">
                    <LockKeyhole size={14} />
                    This private link gives access to your order status. Share
                    it with care.
                  </p>
                </>
              )
            )}
          </div>
        )}
        <div className="tracking-lookup">
          <h2>Have a tracking link?</h2>
          <p>Paste the private link you saved at checkout.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const value = String(new FormData(e.currentTarget).get('link'));
              try {
                const url = new URL(value, window.location.origin);
                const nextId = url.searchParams.get('id');
                const nextToken = url.searchParams.get('token');
                if (!nextId || !nextToken) throw new Error();
                setLookup({ id: nextId, token: nextToken });
              } catch {
                toast(
                  'Paste the full tracking link, including the order ID and private token.',
                  true,
                );
              }
            }}
          >
            <input
              name="link"
              required
              aria-label="Private tracking link"
              placeholder="Paste your tracking link here"
            />
            <button className="primary" type="submit">
              Track order <ArrowRight size={17} />
            </button>
          </form>
        </div>
        <div className="order-history">
          <h2>Orders from this device</h2>
          {orders.isPending ? (
            <p>Loading your orders…</p>
          ) : orders.isError ? (
            <p role="alert">
              {orders.error.message}{' '}
              <button className="text-link" onClick={() => orders.refetch()}>
                Retry
              </button>
            </p>
          ) : orders.data?.orders.length ? (
            orders.data.orders.map((o) => (
              <Link
                href={
                  '/track?' + new URLSearchParams({ id: o.id, token: o.token })
                }
                key={o.id}
                className="history-row"
                onClick={() => setLookup({ id: o.id, token: o.token })}
              >
                <Package size={22} />
                <span>
                  <strong>{o.id}</strong>
                  <small>
                    {new Date(o.createdAt).toLocaleDateString('en-GB')} ·{' '}
                    {money(o.total)}
                  </small>
                </span>
                <span className="status-badge">{o.status}</span>
                <ArrowRight size={18} />
              </Link>
            ))
          ) : (
            <div className="empty-state">
              <Package size={30} />
              <p>No orders on this device yet.</p>
              <Link href="/shop" className="text-link">
                Find something lovely <ArrowRight size={16} />
              </Link>
            </div>
          )}
          <p className="fine-print">
            Order history uses a private cookie on this browser. Save your
            tracking link to follow an order from another device.
          </p>
        </div>
      </section>
    </Shell>
  );
}
