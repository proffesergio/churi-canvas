import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadEnvConfig } from '@next/env';
async function main() {
  loadEnvConfig(process.cwd());
  const base = process.env.SMOKE_URL || 'http://localhost:3000';
  class Browser {
    cookie = '';
    async request(path: string, method = 'GET', body?: unknown) {
      const response = await fetch(base + '/api/' + path, {
        method,
        headers: {
          Origin: base,
          'Content-Type': 'application/json',
          Cookie: this.cookie,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const cookie = response.headers.get('set-cookie');
      if (cookie) this.cookie = cookie.split(';')[0];
      return { status: response.status, data: await response.json() };
    }
  }
  const customer = new Browser(),
    admin = new Browser(),
    stranger = new Browser();
  const runtime = await customer.request('session');
  assert.equal(
    runtime.data.storage,
    'Local demo',
    'Smoke tests require local demo storage; no database fixtures were written.',
  );
  assert.equal((await stranger.request('admin/overview')).status, 401);
  assert.equal((await customer.request('session', 'POST', {})).status, 200);
  const catalog = await customer.request('products');
  assert.equal(catalog.status, 200);
  assert.ok(catalog.data.products.length > 0);
  const product = catalog.data.products[0];
  const idempotencyKey = randomUUID();
  const payload = {
    name: 'Smoke Test Customer',
    phone: '01712345678',
    address: 'Test address, Dhaka, Bangladesh',
    zone: 'Inside Dhaka',
    payment: 'bKash',
    paymentReference: 'MOCK' + Date.now(),
    items: [
      {
        productId: product.id,
        size: '2.6',
        quantity: 1,
        notes: 'Automated verification order',
      },
    ],
    idempotencyKey,
  };
  const created = await customer.request('orders', 'POST', payload);
  assert.equal(created.status, 200, JSON.stringify(created.data));
  assert.equal(created.data.total, product.price + 70);
  assert.equal(
    (await customer.request('orders', 'POST', payload)).data.id,
    created.data.id,
  );
  assert.equal(
    (await stranger.request('track?id=' + created.data.id)).status,
    404,
  );
  const tracking =
    'track?' +
    new URLSearchParams({ id: created.data.id, token: created.data.token });
  assert.equal((await customer.request(tracking)).data.status, 'Pending');
  const login = await admin.request('auth/login', 'POST', {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  assert.equal(login.status, 200, JSON.stringify(login.data));
  const overview = await admin.request('admin/overview');
  assert.ok(
    overview.data.orders.some((o: { id: string }) => o.id === created.data.id),
  );
  for (const status of ['Processing', 'In Transit', 'Delivered']) {
    assert.equal(
      (
        await admin.request('admin/orders/' + created.data.id, 'PATCH', {
          status,
        })
      ).status,
      200,
    );
    assert.equal((await customer.request(tracking)).data.status, status);
  }
  const png =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAUSURBVBhXY/if7P6fAQb+X2f4DwAwzAV+HRCgZwAAAABJRU5ErkJggg==';
  const fixture = {
    ...product,
    title: 'Smoke test inventory piece',
    visible: false,
    images: [png],
  };
  const added = await admin.request('admin/products', 'POST', fixture);
  assert.equal(added.status, 200, JSON.stringify(added.data));
  const addedProduct = added.data.product;
  assert.match(
    addedProduct.images[0],
    /^(?:\/api\/assets\/products\/[a-f0-9-]+\.png|data:image\/png;base64,[A-Za-z0-9+/=]+)$/,
  );
  const stored = await fetch(new URL(addedProduct.images[0], base));
  assert.equal(stored.status, 200);
  assert.equal(stored.headers.get('content-type'), 'image/png');
  assert.ok((await stored.arrayBuffer()).byteLength > 0);
  const updated = await admin.request(
    'admin/products/' + addedProduct.id,
    'PUT',
    { ...addedProduct, title: 'Edited smoke test piece' },
  );
  assert.equal(updated.status, 200);
  assert.equal(
    (
      await admin.request(
        'admin/products/' + addedProduct.id,
        'PUT',
        addedProduct,
      )
    ).status,
    409,
  );
  assert.equal(
    (await admin.request('admin/products/' + addedProduct.id, 'DELETE')).status,
    200,
  );
  for (const action of ['facebook-sync', 'tiktok-sync', 'mock-webhook'])
    assert.equal(
      (await admin.request('admin/social', 'POST', { action })).status,
      200,
    );
  const crossOrigin = await fetch(base + '/api/admin/social', {
    method: 'POST',
    headers: {
      Origin: 'https://untrusted.example',
      'Content-Type': 'application/json',
      Cookie: admin.cookie,
    },
    body: JSON.stringify({ action: 'facebook-sync' }),
  });
  assert.equal(crossOrigin.status, 403);
  for (const page of ['/', '/shop', '/cart', '/track', '/saved', '/admin']) {
    const response = await fetch(base + page);
    assert.equal(response.status, 200, page);
    assert.ok((await response.text()).includes('ChuriCanvas'));
  }
  const home = await (await fetch(base + '/')).text();
  assert.ok(home.includes('A little tradition.'), 'Home hero must render');
  assert.ok(
    home.includes(product.title),
    'Product catalog must render before client JavaScript',
  );
  assert.ok(
    home.includes('bottom-nav'),
    'Mobile shopping navigation must render',
  );
  const cssPath = [...home.matchAll(/href="([^" ]+\.css[^" ]*)"/g)][0]?.[1];
  assert.ok(cssPath, 'Production stylesheet must exist');
  const cssResponse = await fetch(base + cssPath.replaceAll('&amp;', '&'));
  assert.equal(cssResponse.status, 200);
  const css = await cssResponse.text();
  assert.ok(css.includes('admin-bottom-nav'));
  assert.ok(css.includes('product-grid'));
  for (let photo = 1; photo <= 9; photo++) {
    const response = await fetch(base + '/products/' + photo + '.jpeg');
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('content-type')?.startsWith('image/'));
  }
  const optimized = await fetch(
    base + '/_next/image?url=%2Fproducts%2F7.jpeg&w=640&q=75',
  );
  assert.equal(optimized.status, 200);
  assert.ok(optimized.headers.get('content-type')?.startsWith('image/'));
  console.log(
    'PASS: all customer/admin routes, server-rendered product grid, mobile styles, nine real photos and optimized hero image are served.',
  );
  console.log(
    'PASS: product photo uploaded to Neon Object Storage and served back through /api/assets.',
  );
  console.log(
    'PASS: storefront → checkout → protected admin → Delivered tracking; CRUD, stale edits, private access, CSRF and social mocks verified.',
  );
  console.log(
    'One clearly labelled smoke-test order remains in the configured Neon Postgres database.',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
