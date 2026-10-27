import { randomBytes, randomUUID } from 'node:crypto';
import type { z } from 'zod';
import type { checkoutSchema } from './validation';
import { deliveryFee, type Order, type Store } from './model';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function placeOrder(
  store: Store,
  input: z.infer<typeof checkoutSchema>,
  customerId: string,
  source: NonNullable<Order['source']> = 'Storefront',
): Order {
  const existing = store.orders.find(
    (o) =>
      o.idempotencyKey === input.idempotencyKey && o.customerId === customerId,
  );
  if (existing) return existing;
  const combined = new Map<string, number>();
  for (const line of input.items) {
    const key = line.productId + ':' + line.size;
    combined.set(key, (combined.get(key) || 0) + line.quantity);
  }
  const items = input.items.map((line) => {
    const product = store.products.find(
      (p) => p.id === line.productId && p.visible,
    );
    if (!product)
      throw new HttpError(
        409,
        'One of your pieces is no longer available. Please update your bag.',
      );
    if (
      (combined.get(line.productId + ':' + line.size) || 0) >
      (product.stock[line.size] || 0)
    )
      throw new HttpError(
        409,
        product.title + ' has insufficient stock in size ' + line.size + '.',
      );
    return {
      ...line,
      title: product.title,
      price: product.price,
      image: product.images[0],
    };
  });
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const now = new Date().toISOString();
  const delivery = deliveryFee(input.zone);
  const order: Order = {
    ...input,
    source,
    id: 'CC-' + randomBytes(6).toString('hex').toUpperCase(),
    token: randomBytes(24).toString('hex'),
    customerId,
    items,
    subtotal,
    delivery,
    total: subtotal + delivery,
    status: 'Pending',
    paymentStatus: input.payment === 'COD' ? 'Due on delivery' : 'Mock payment',
    history: [{ status: 'Pending', at: now }],
    createdAt: now,
  };
  for (const item of items) {
    const product = store.products.find((p) => p.id === item.productId)!;
    product.stock[item.size] -= item.quantity;
    product.revision++;
  }
  store.orders.unshift(order);
  store.events.push({
    id: randomUUID(),
    type: 'Purchase',
    at: now,
    value: order.total,
    source,
  });
  store.events = store.events.slice(-10000);
  return order;
}
export function publicOrder(order: Order) {
  return {
    id: order.id,
    status: order.status,
    history: order.history,
    createdAt: order.createdAt,
    total: order.total,
    payment: order.payment,
    paymentStatus: order.paymentStatus,
    items: order.items.map(({ title, quantity, size }) => ({
      title,
      quantity,
      size,
    })),
  };
}
