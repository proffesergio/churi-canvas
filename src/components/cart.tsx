'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  LockKeyhole,
  Minus,
  Plus,
  Trash2,
  Truck,
  Check,
} from 'lucide-react';
import { Shell } from './shell';
import { useToast } from './providers';
import { api } from '@/lib/api';
import { usePersistent } from '@/lib/persistent';
import { deliveryFee, money, type CartLine, type Product } from '@/lib/model';
export function Cart() {
  const toast = useToast();
  const router = useRouter();
  const [cart, setCart] = usePersistent<CartLine[]>('cc-bag', []);
  const [zone, setZone] = useState('Inside Dhaka');
  const [payment, setPayment] = useState('COD');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const key = useRef('');
  const ids = [...new Set(cart.map((l) => l.productId))].join(',');
  const products = useQuery({
    queryKey: ['cart-products', ids],
    queryFn: () =>
      api<{ products: Product[] }>(
        'products?' + new URLSearchParams({ ids, limit: '100' }),
      ),
    enabled: cart.length > 0,
  });
  const session = useQuery({
    queryKey: ['shopping-session'],
    queryFn: () => api('session', { method: 'POST', body: '{}' }),
    staleTime: Infinity,
  });
  const lines = cart.map((line, index) => ({
    ...line,
    index,
    product: products.data?.products.find((p) => p.id === line.productId),
  }));
  const subtotal = lines.reduce(
    (n, l) => n + (l.product?.price || 0) * l.quantity,
    0,
  );
  const invalid = lines.some(
    (l) => !l.product || l.quantity > (l.product.stock[l.size] || 0),
  );
  function update(index: number, quantity: number) {
    try {
      setCart((current) =>
        quantity <= 0
          ? current.filter((_, i) => i !== index)
          : current.map((line, i) =>
              i === index ? { ...line, quantity } : line,
            ),
      );
    } catch (e) {
      toast((e as Error).message, true);
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const form = new FormData(event.currentTarget);
    key.current ||= crypto.randomUUID();
    try {
      await session.refetch({ throwOnError: true });
      const order = await api<{ id: string; token: string; total: number }>(
        'orders',
        {
          method: 'POST',
          body: JSON.stringify({
            name: form.get('name'),
            phone: form.get('phone'),
            address: form.get('address'),
            zone,
            payment,
            paymentReference: reference,
            items: cart,
            idempotencyKey: key.current,
          }),
        },
      );
      try {
        setCart([]);
      } catch {}
      router.push(
        '/track?' + new URLSearchParams({ id: order.id, token: order.token }),
      );
      toast('Your order is in! Thank you for shopping handmade.');
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell>
      <section className="container checkout-page">
        <Link className="back-link" href="/shop">
          <ArrowLeft size={16} />
          Keep exploring
        </Link>
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR LITTLE COLLECTION OF JOY</span>
            <h1>Your bag, with love.</h1>
            <p>Just a few details between you and your next favourites.</p>
          </div>
          <ShoppingBag className="heading-icon" size={42} />
        </div>
        {cart.length === 0 ? (
          <div className="empty-state">
            <ShoppingBag size={42} />
            <h2>A little room for something lovely.</h2>
            <p>Your bag is waiting for its first handmade piece.</p>
            <Link href="/shop" className="primary">
              Find your favourite <ArrowRight size={18} />
            </Link>
          </div>
        ) : products.isPending ? (
          <div className="loading-block">Gathering your favourites…</div>
        ) : products.isError ? (
          <div className="empty-state">
            <p>{products.error.message}</p>
            <button className="secondary" onClick={() => products.refetch()}>
              Try again
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="checkout-grid">
            <div>
              <div className="cart-lines">
                {lines.map((line) => (
                  <div className="cart-line" key={line.index}>
                    {line.product ? (
                      <Image
                        src={line.product.images[0]}
                        width={100}
                        height={125}
                        alt={line.product.title}
                      />
                    ) : (
                      <div className="missing-photo">?</div>
                    )}
                    <div className="cart-line-info">
                      <h3>
                        {line.product?.title ||
                          'This piece is no longer available'}
                      </h3>
                      <p>Size {line.size} · Handmade set</p>
                      {line.notes && <small>Note: {line.notes}</small>}
                      {(!line.product ||
                        line.quantity >
                          (line.product.stock[line.size] || 0)) && (
                        <p className="error-text">
                          Update or remove this piece before checkout.
                        </p>
                      )}
                      <div className="cart-line-controls">
                        <div className="quantity">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() =>
                              update(line.index, line.quantity - 1)
                            }
                          >
                            <Minus size={14} />
                          </button>
                          <span>{line.quantity}</span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            disabled={
                              line.quantity >=
                              Math.min(10, line.product?.stock[line.size] || 0)
                            }
                            onClick={() =>
                              update(line.index, line.quantity + 1)
                            }
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={
                            'Remove ' +
                            (line.product?.title || 'unavailable product')
                          }
                          onClick={() => update(line.index, 0)}
                        >
                          <Trash2 size={17} />
                        </button>
                        <strong>
                          {money((line.product?.price || 0) * line.quantity)}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="checkout-details">
                <h2>
                  <span>01</span> Where should we send your joy?
                </h2>
                <div className="field-row">
                  <label className="field">
                    Your name
                    <input
                      required
                      name="name"
                      autoComplete="name"
                      minLength={2}
                      maxLength={80}
                      placeholder="Full name"
                    />
                  </label>
                  <label className="field">
                    Mobile number
                    <input
                      required
                      name="phone"
                      autoComplete="tel"
                      inputMode="tel"
                      maxLength={17}
                      placeholder="01XXXXXXXXX"
                    />
                  </label>
                </div>
                <label className="field">
                  Delivery address
                  <textarea
                    required
                    name="address"
                    autoComplete="street-address"
                    minLength={10}
                    maxLength={400}
                    placeholder="House, road, area, city and postal code"
                  />
                </label>
                <fieldset>
                  <legend>Delivery area</legend>
                  <div className="option-grid">
                    {['Inside Dhaka', 'Outside Dhaka'].map((z) => (
                      <label
                        key={z}
                        className={
                          'radio-card ' + (zone === z ? 'selected' : '')
                        }
                      >
                        <input
                          type="radio"
                          name="zone"
                          value={z}
                          checked={zone === z}
                          onChange={() => setZone(z)}
                        />
                        <span>
                          {z}
                          <small>{money(deliveryFee(z))} delivery</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <h2>
                  <span>02</span> A simple way to pay
                </h2>
                <fieldset>
                  <legend className="sr-only">Payment method</legend>
                  <div className="payment-options">
                    {['COD', 'bKash', 'Nagad'].map((p) => (
                      <label
                        className={
                          'radio-card ' + (payment === p ? 'selected' : '')
                        }
                        key={p}
                      >
                        <input
                          type="radio"
                          name="payment"
                          checked={payment === p}
                          onChange={() => {
                            setPayment(p);
                            setReference('');
                          }}
                        />
                        <span>
                          {p === 'COD' ? 'Cash on delivery' : p}
                          <small>
                            {p === 'COD'
                              ? 'Pay when it arrives'
                              : 'Mock workflow'}
                          </small>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                {payment !== 'COD' && (
                  <div className="mock-payment">
                    <strong>{payment} demo payment</strong>
                    <p>
                      This is a simulation. No money is collected. Never enter a
                      PIN or send funds.
                    </p>
                    <label className="field">
                      Mock transaction reference
                      <input
                        required
                        minLength={6}
                        maxLength={40}
                        pattern="[a-zA-Z0-9]{6,40}"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="e.g. MOCK123456"
                      />
                    </label>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        setReference(
                          'MOCK' +
                            crypto
                              .randomUUID()
                              .replaceAll('-', '')
                              .slice(0, 10)
                              .toUpperCase(),
                        )
                      }
                    >
                      <Check size={16} />
                      Simulate successful payment
                    </button>
                  </div>
                )}
              </div>
            </div>
            <aside className="order-summary">
              <span className="eyebrow">ALMOST YOURS</span>
              <h2>A little recap</h2>
              <div>
                <span>
                  Subtotal ({cart.reduce((n, l) => n + l.quantity, 0)} sets)
                </span>
                <strong>{money(subtotal)}</strong>
              </div>
              <div>
                <span>Delivery · {zone}</span>
                <strong>{money(deliveryFee(zone))}</strong>
              </div>
              <div className="summary-total">
                <span>Total</span>
                <strong>{money(subtotal + deliveryFee(zone))}</strong>
              </div>
              <p className="fine-print">
                All prices in Bangladeshi Taka. No hidden fees.
              </p>
              <button
                className="primary"
                type="submit"
                disabled={busy || invalid || session.isPending}
              >
                {busy ? 'Placing your order…' : 'Place your order'}
                <ArrowRight size={18} />
              </button>
              <p className="secure-note">
                <LockKeyhole size={14} />
                Your details stay private
              </p>
              <div className="delivery-note">
                <Truck size={22} />
                <p>
                  Handmade takes a little care.
                  <br />
                  <strong>
                    We’ll call to confirm your order and delivery time.
                  </strong>
                </p>
              </div>
            </aside>
          </form>
        )}
      </section>
    </Shell>
  );
}
