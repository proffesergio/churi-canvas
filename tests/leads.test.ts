import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initialStore, normalizeStore, type Store } from '../src/lib/model';
import { collectLead, convertLead } from '../src/lib/leads';
import { leadSchema, checkoutSchema } from '../src/lib/validation';
const enquiry = (source: 'Facebook' | 'TikTok' = 'Facebook') => leadSchema.parse({ source, name: 'Test Customer', phone: '+8801712345678', message: 'Interested in a floral pair', consent: true, submissionKey: randomUUID() });
const checkout = () => checkoutSchema.parse({ name: 'Test Customer', phone: '01712345678', address: 'House 10, Road 2, Dhaka', zone: 'Inside Dhaka', payment: 'COD', items: [{ productId: 'churi-1', size: '2.6', quantity: 2, notes: '' }], idempotencyKey: randomUUID() });
test('old saved stores normalize without losing orders or social settings', () => {
  const store = initialStore();
  delete (store as Partial<Store>).leads;
  const normalized = normalizeStore(store);
  assert.deepEqual(normalized.leads, []);
  assert.equal(normalized.social.facebook.url, 'https://www.facebook.com/bdchuricanvas');
});
test('lead validation requires consent, source and valid contact information', () => {
  const input = enquiry();
  assert.equal(input.phone, '01712345678');
  for (const invalid of [{ consent: false }, { source: 'Other' }, { phone: '123' }, { message: '' }]) assert.equal(leadSchema.safeParse({ ...input, ...invalid }).success, false);
});
test('retrying lead submission saves one lead', () => {
  const store = initialStore(); const input = enquiry();
  assert.equal(collectLead(store, input).id, collectLead(store, input).id);
  assert.equal(store.leads.length, 1);
});
for (const source of ['Facebook', 'TikTok'] as const) test(source + ' conversion is attributed, priced and idempotent', () => {
  const store = initialStore(); const lead = collectLead(store, enquiry(source));
  const first = convertLead(store, lead.id, checkout());
  const second = convertLead(store, lead.id, checkout());
  assert.equal(first.id, second.id);
  assert.equal(first.total, 510);
  assert.equal(first.source, source);
  assert.equal(store.events[0].source, source);
  assert.equal(store.orders.length, 1);
  assert.equal(store.products[0].stock['2.6'], 10);
  assert.equal(lead.orderId, first.id);
  assert.equal(lead.status, 'Converted');
});
test('out-of-stock or lost leads cannot create an order or change stock', () => {
  const store = initialStore(); const lead = collectLead(store, enquiry());
  store.products[0].stock['2.6'] = 0;
  assert.throws(() => convertLead(store, lead.id, checkout()), /insufficient stock/);
  assert.equal(lead.status, 'New'); assert.equal(lead.orderId, undefined);
  assert.equal(store.orders.length, 0);
  lead.status = 'Lost';
  assert.throws(() => convertLead(store, lead.id, checkout()), /Reopen/);
});
