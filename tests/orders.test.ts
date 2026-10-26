import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initialStore } from '../src/lib/model';
import { checkoutSchema, productSchema } from '../src/lib/validation';
import { placeOrder, publicOrder } from '../src/lib/orders';
const input = () =>
  checkoutSchema.parse({
    name: 'Sample Customer',
    phone: '+8801712345678',
    address: 'House 10, Road 2, Dhanmondi, Dhaka',
    zone: 'Inside Dhaka',
    payment: 'COD',
    items: [
      {
        productId: 'churi-1',
        size: '2.6',
        quantity: 2,
        notes: 'A gift, please',
      },
    ],
    idempotencyKey: randomUUID(),
  });
test('checkout prices come from inventory; delivery and stock are correct', () => {
  const store = initialStore();
  const data = input();
  const order = placeOrder(
    store,
    { ...data, price: 1 } as typeof data,
    'customer',
  );
  assert.equal(order.subtotal, 440);
  assert.equal(order.total, 510);
  assert.equal(store.products[0].stock['2.6'], 10);
  assert.equal(store.products[0].revision, 2);
  assert.equal(store.events[0].type, 'Purchase');
  assert.equal(order.paymentStatus, 'Due on delivery');
  assert.equal(order.phone, '01712345678');
});
test('retrying the same checkout creates one order and one Purchase', () => {
  const store = initialStore();
  const data = input();
  const first = placeOrder(store, data, 'customer');
  const second = placeOrder(store, data, 'customer');
  assert.equal(second.id, first.id);
  assert.equal(store.orders.length, 1);
  assert.equal(store.products[0].stock['2.6'], 10);
  assert.equal(store.events.length, 1);
});
test('duplicate size lines cannot oversell; failures do not consume stock', () => {
  const store = initialStore();
  const data = input();
  data.items = [
    { ...data.items[0], quantity: 8 },
    { ...data.items[0], quantity: 8, notes: 'Another note' },
  ];
  assert.throws(
    () => placeOrder(store, data, 'customer'),
    /insufficient stock/,
  );
  assert.equal(store.products[0].stock['2.6'], 12);
  assert.equal(store.orders.length, 0);
});
test('hidden pieces and invalid quantities are rejected', () => {
  const store = initialStore();
  store.products[0].visible = false;
  assert.throws(
    () => placeOrder(store, input(), 'customer'),
    /no longer available/,
  );
  assert.equal(
    checkoutSchema.safeParse({
      ...input(),
      items: [{ ...input().items[0], quantity: -1 }],
    }).success,
    false,
  );
});
test('mock wallet payments require a reference; valid payments remain marked mock', () => {
  const data = input();
  assert.equal(
    checkoutSchema.safeParse({ ...data, payment: 'bKash' }).success,
    false,
  );
  const valid = checkoutSchema.parse({
    ...data,
    payment: 'Nagad',
    paymentReference: 'MOCK123456',
    zone: 'Outside Dhaka',
  });
  const order = placeOrder(initialStore(), valid, 'customer');
  assert.equal(order.total, 570);
  assert.equal(order.paymentStatus, 'Mock payment');
});
test('public tracking omits contact details and access tokens', () => {
  const order = placeOrder(initialStore(), input(), 'customer');
  const visible = publicOrder(order);
  assert.ok(!('phone' in visible));
  assert.ok(!('address' in visible));
  assert.ok(!('token' in visible));
  assert.ok(!('customerId' in visible));
  assert.ok(order.token.length >= 48);
});
test('inventory validation rejects scripts, remote image sources and fractional money', () => {
  const p = initialStore().products[0];
  assert.equal(productSchema.safeParse(p).success, true);
  assert.equal(
    productSchema.safeParse({ ...p, images: ['javascript:alert(1)'] }).success,
    false,
  );
  assert.equal(productSchema.safeParse({ ...p, price: 12.5 }).success, false);
  assert.equal(
    productSchema.safeParse({ ...p, stock: { ...p.stock, '2.6': -1 } }).success,
    false,
  );
});

import { catalog } from '../src/lib/catalog';
test('catalog paginates visible pieces and applies search, price and saved filters', () => {
  const store = initialStore();
  store.products[0].visible = false;
  const first = catalog(store, new URLSearchParams());
  assert.equal(first.products.length, 6);
  assert.equal(first.total, 8);
  assert.equal(first.pages, 2);
  const saved = catalog(
    store,
    new URLSearchParams({ ids: 'churi-2,churi-9', sort: 'price-asc' }),
  );
  assert.deepEqual(
    saved.products.map((p) => p.id),
    ['churi-9', 'churi-2'],
  );
  assert.equal(
    catalog(store, new URLSearchParams({ q: 'Laal' })).products[0].id,
    'churi-7',
  );
  assert.equal(catalog(store, new URLSearchParams({ ids: '' })).total, 0);
});
