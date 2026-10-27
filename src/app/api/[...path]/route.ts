import { collectLead, convertLead } from '@/lib/leads';
import { leadSchema, leadUpdateSchema } from '@/lib/validation';
import { catalog } from '@/lib/catalog';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z, ZodError } from 'zod';
import { withStore } from '@/lib/store';
import {
  getSession,
  requireAdmin,
  setSession,
  validPassword,
  sessionCookie,
} from '@/lib/auth';
import { cookies } from 'next/headers';
import { checkoutSchema, productSchema, statusSchema } from '@/lib/validation';
import { HttpError, placeOrder, publicOrder } from '@/lib/orders';
import { persistProductImages, storageConfigured } from '@/lib/storage';
import {
  fetchFacebookPosts,
  fetchTikTokVideos,
  publicSocial,
  resolveToken,
  socialView,
  verifyFacebookPage,
  verifyTikTokProfile,
} from '@/lib/social';
import { encryptSecret } from '@/lib/secrets';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function body(request: NextRequest) {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'A request body is required.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 4_000_000) {
      await reader.cancel();
      throw new HttpError(
        413,
        'Images are too large. Use up to five images optimized for upload.',
      );
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    throw new HttpError(400, 'Invalid JSON request.');
  }
}
async function productImages(images: string[]) {
  try {
    return await persistProductImages(images);
  } catch (error) {
    console.error(
      'Photo storage failed',
      error instanceof Error ? error.message : error,
    );
    throw new HttpError(
      502,
      'Photo storage is unavailable. Please try again.',
    );
  }
}
const facebookSettings = z.object({
  enabled: z.boolean(),
  accountId: z.string().trim().max(120),
  url: z
    .string()
    .trim()
    .max(500)
    .refine(
      (value) =>
        !value ||
        /^https:\/\/(?:www\.|web\.|m\.)?(?:facebook|fb)\.com\//i.test(value),
      'Enter a Facebook Page URL starting with https://.',
    ),
  accessToken: z.string().trim().max(4000).optional(),
});
const tiktokSettings = z.object({
  enabled: z.boolean(),
  accountId: z.string().trim().max(120),
  url: z
    .string()
    .trim()
    .max(500)
    .refine(
      (value) => !value || /^https:\/\/(?:www\.)?tiktok\.com\//i.test(value),
      'Enter a TikTok profile URL starting with https://.',
    ),
  accessToken: z.string().trim().max(4000).optional(),
});
async function handle(request: NextRequest) {
  try {
    const route = request.nextUrl.pathname.slice(5).split('/').filter(Boolean);
    const method = request.method;
    if (method !== 'GET') {
      const origin = request.headers.get('origin');
      if (origin !== request.nextUrl.origin)
        throw new HttpError(
          403,
          'Request origin could not be verified. Refresh this page and try again.',
        );
    }
    const result = await dispatch(request, route, method);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Check your details.' },
        { status: 400 },
      );
    if (error instanceof HttpError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error(
      'API request failed',
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      {
        error: 'We could not complete that request. Please try again shortly.',
      },
      { status: 500 },
    );
  }
}
async function dispatch(
  request: NextRequest,
  r: string[],
  m: string,
): Promise<unknown> {
  if (r[0] === 'session' && m === 'GET') {
    const session = await getSession();
    return {
      role: session?.role || null,
      email: session?.role === 'admin' ? process.env.ADMIN_EMAIL : undefined,
      storage: process.env.DATABASE_URL ? 'PostgreSQL' : 'Local demo',
      objectStorage: storageConfigured,
    };
  }
  if (r[0] === 'session' && m === 'POST') {
    let session = await getSession();
    if (!session) {
      session = { sub: randomUUID(), role: 'customer' };
      await setSession(session);
    }
    return { role: session.role };
  }
  if (r[0] === 'auth' && r[1] === 'login' && m === 'POST') {
    const input = z
      .object({
        email: z.string().email().max(160),
        password: z.string().min(1).max(256),
      })
      .parse(await body(request));
    const ip = process.env.VERCEL
      ? request.headers.get('x-vercel-forwarded-for') || 'unknown'
      : 'local';
    const key = 'login:' + ip;
    const now = Date.now();
    const allowed = await withStore((s) => {
      for (const [k, v] of Object.entries(s.loginAttempts))
        if (v.reset < now) delete s.loginAttempts[k];
      const a = s.loginAttempts[key] ?? { count: 0, reset: now + 900000 };
      const global = s.loginAttempts.global ?? {
        count: 0,
        reset: now + 900000,
      };
      a.count++;
      global.count++;
      s.loginAttempts[key] = a;
      s.loginAttempts.global = global;
      return a.count <= 8 && global.count <= 60;
    }, true);
    if (!allowed)
      throw new HttpError(
        429,
        'Too many sign-in attempts. Try again in 15 minutes.',
      );
    const passwordMatches = validPassword(input.password);
    if (
      input.email.toLowerCase() !==
        (process.env.ADMIN_EMAIL || '').toLowerCase() ||
      !passwordMatches
    )
      throw new HttpError(401, 'Email or password is incorrect.');
    await setSession({ sub: input.email.toLowerCase(), role: 'admin' });
    return { ok: true };
  }
  if (r[0] === 'auth' && r[1] === 'logout' && m === 'POST') {
    (await cookies()).delete(sessionCookie);
    return { ok: true };
  }
  if (r[0] === 'products' && m === 'GET')
    return withStore((s) => catalog(s, request.nextUrl.searchParams));
  if (r[0] === 'orders' && m === 'POST') {
    const session = await getSession();
    if (!session)
      throw new HttpError(
        401,
        'Your shopping session expired. Refresh and try again.',
      );
    const input = checkoutSchema.parse(await body(request));
    return withStore((s) => {
      const order = placeOrder(s, input, session.sub);
      return { id: order.id, token: order.token, total: order.total };
    }, true);
  }
  if (r[0] === 'orders' && m === 'GET') {
    const session = await getSession();
    if (!session) return { orders: [] };
    return withStore((s) => ({
      orders: s.orders
        .filter((o) => o.customerId === session.sub)
        .map((o) => ({ ...publicOrder(o), token: o.token })),
    }));
  }
  if (r[0] === 'track' && m === 'GET') {
    const id = request.nextUrl.searchParams.get('id');
    const token = request.nextUrl.searchParams.get('token');
    const session = await getSession();
    return withStore((s) => {
      const order = s.orders.find(
        (o) =>
          o.id === id &&
          (o.token === token ||
            o.customerId === session?.sub ||
            session?.role === 'admin'),
      );
      if (!order)
        throw new HttpError(
          404,
          'Order not found. Use the private tracking link from checkout or this device’s order history.',
        );
      return publicOrder(order);
    });
  }
  if (r[0] === 'social' && m === 'GET')
    return withStore((s) => publicSocial(s.social));
  if (r[0] === 'leads' && r.length === 1 && m === 'POST') {
    const input = leadSchema.parse(await body(request));
    const ip = process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for') || 'unknown' : 'local';
    const allowed = await withStore(s => {
      const now = Date.now();
      for (const [key, value] of Object.entries(s.loginAttempts)) if (value.reset < now) delete s.loginAttempts[key];
      const key = 'lead:' + ip;
      const limit = s.loginAttempts[key] || { count: 0, reset: now + 3600000 };
      limit.count++;
      s.loginAttempts[key] = limit;
      return limit.count <= 10;
    }, true);
    if (!allowed) throw new HttpError(429, 'Too many enquiries. Please try again in an hour.');
    await withStore(s => { collectLead(s, input); }, true);
    return { ok: true };
  }
  if (r[0] === 'events' && m === 'POST') {
    const input = z
      .object({ type: z.enum(['PageView', 'AddToCart']) })
      .parse(await body(request));
    if (!(await getSession()))
      throw new HttpError(401, 'A shopping session is required.');
    return withStore((s) => {
      s.events.push({
        id: randomUUID(),
        type: input.type,
        at: new Date().toISOString(),
        value: 0,
        source: 'Storefront',
      });
      s.events = s.events.slice(-10000);
      return { ok: true };
    }, true);
  }
  if (r[0] === 'admin') {
    await requireAdmin();
    if (r[1] === 'leads' && r.length === 2 && m === 'POST') {
      const input = leadSchema.parse(await body(request));
      return withStore(s => ({ lead: collectLead(s, input) }), true);
    }
    if (r[1] === 'leads' && r[2] && r.length === 3 && m === 'PATCH') {
      const input = leadUpdateSchema.parse(await body(request));
      return withStore(s => {
        const lead = s.leads.find(l => l.id === r[2]);
        if (!lead) throw new HttpError(404, 'Lead not found.');
        if (lead.orderId) throw new HttpError(409, 'Converted leads are managed in Orders.');
        Object.assign(lead, input, { updatedAt: new Date().toISOString() });
        return { ok: true };
      }, true);
    }
    if (r[1] === 'leads' && r[2] && r[3] === 'order' && r.length === 4 && m === 'POST') {
      const input = checkoutSchema.parse(await body(request));
      return withStore(s => ({ orderId: convertLead(s, r[2], input).id }), true);
    }
    if (r[1] === 'overview' && m === 'GET')
      return withStore((s) => ({
        leads: s.leads,
        products: s.products,
        orders: s.orders.map((o) => ({
          ...o,
          token: undefined,
          customerId: undefined,
          idempotencyKey: undefined,
        })),
        social: socialView(s.social),
        analytics: {
          PageView: s.events.filter((e) => e.type === 'PageView').length,
          AddToCart: s.events.filter((e) => e.type === 'AddToCart').length,
          Purchase: s.events.filter((e) => e.type === 'Purchase').length,
          revenue: s.orders.reduce((sum, o) => sum + o.total, 0),
        },
        storage: process.env.DATABASE_URL ? 'PostgreSQL' : 'Local demo',
        objectStorage: storageConfigured,
      }));
    if (r[1] === 'products' && m === 'POST') {
      const input = productSchema.parse(await body(request));
      const images = await productImages(input.images);
      return withStore((s) => {
        const product = {
          ...input,
          images,
          id: randomUUID(),
          revision: 1,
          createdAt: new Date().toISOString(),
        };
        s.products.unshift(product);
        return { product };
      }, true);
    }
    if (r[1] === 'products' && r[2] && m === 'PUT') {
      const input = productSchema
        .extend({ revision: z.number().int().min(1) })
        .parse(await body(request));
      const images = await productImages(input.images);
      return withStore((s) => {
        const p = s.products.find((p) => p.id === r[2]);
        if (!p) throw new HttpError(404, 'Product not found.');
        if (p.revision !== input.revision)
          throw new HttpError(
            409,
            'This piece changed since you opened it. Close the editor, refresh, and try again.',
          );
        Object.assign(p, input, { images, revision: p.revision + 1 });
        return { product: p };
      }, true);
    }
    if (r[1] === 'products' && r[2] && m === 'DELETE')
      return withStore((s) => {
        const index = s.products.findIndex((p) => p.id === r[2]);
        if (index === -1) throw new HttpError(404, 'Product not found.');
        s.products.splice(index, 1);
        return { ok: true };
      }, true);
    if (r[1] === 'orders' && r[2] && m === 'PATCH') {
      const input = statusSchema.parse(await body(request));
      return withStore((s) => {
        const order = s.orders.find((o) => o.id === r[2]);
        if (!order) throw new HttpError(404, 'Order not found.');
        if (order.status !== input.status) {
          order.status = input.status;
          order.history.push({
            status: input.status,
            at: new Date().toISOString(),
          });
        }
        return { ok: true };
      }, true);
    }
    if (r[1] === 'social' && r[2] === 'facebook' && m === 'PUT') {
      const input = facebookSettings.parse(await body(request));
      if (input.enabled && !input.accountId && !input.url)
        throw new HttpError(
          400,
          'Add your Facebook Page ID or Page URL before enabling the integration.',
        );
      return withStore((s) => {
        const current = s.social.facebook;
        const token = input.accessToken
          ? encryptSecret(input.accessToken)
          : current.token;
        const hasToken = Boolean(
          token || process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
        );
        const identityChanged = input.accountId !== current.accountId;
        const status = !hasToken
          ? 'disconnected'
          : input.accessToken || identityChanged
            ? 'disconnected'
            : current.status;
        s.social.facebook = {
          ...current,
          enabled: input.enabled,
          accountId: input.accountId,
          url: input.url,
          token,
          status,
          verifiedAt: status === 'disconnected' ? null : current.verifiedAt,
          error: null,
        };
        return {
          ok: true,
          message: 'Facebook Page settings saved.',
          social: socialView(s.social),
        };
      }, true);
    }
    if (r[1] === 'social' && r[2] === 'facebook' && m === 'POST') {
      const input = z
        .object({ action: z.enum(['test', 'sync']) })
        .parse(await body(request));
      const connection = await withStore((s) => s.social.facebook);
      const token = resolveToken(connection, 'facebook');
      if (!token)
        throw new HttpError(
          400,
          'Add a Facebook Page access token before testing the connection.',
        );
      try {
        const page = await verifyFacebookPage({
          accountId: connection.accountId,
          token,
        });
        const posts =
          input.action === 'sync'
            ? await fetchFacebookPosts(page.accountId, token)
            : connection.posts;
        const now = new Date().toISOString();
        return await withStore((s) => {
          s.social.facebook = {
            ...s.social.facebook,
            ...page,
            posts,
            count:
              input.action === 'sync'
                ? posts.length
                : s.social.facebook.count,
            syncedAt:
              input.action === 'sync' ? now : s.social.facebook.syncedAt,
            status: 'connected',
            verifiedAt: now,
            error: null,
          };
          return {
            ok: true,
            message:
              input.action === 'sync'
                ? `Synced ${posts.length} Facebook posts.`
                : `Connected to ${page.accountName}.`,
            social: socialView(s.social),
          };
        }, true);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Facebook could not be reached.';
        await withStore((s) => {
          s.social.facebook = {
            ...s.social.facebook,
            status: 'error',
            error: message,
          };
        }, true).catch(() => {});
        throw new HttpError(502, message);
      }
    }
    if (r[1] === 'social' && r[2] === 'facebook' && m === 'DELETE') {
      return withStore((s) => {
        s.social.facebook = {
          ...s.social.facebook,
          enabled: false,
          token: '',
          status: 'disconnected',
          followers: null,
          verifiedAt: null,
          error: null,
          syncedAt: null,
          count: 0,
          posts: [],
        };
        return {
          ok: true,
          message: 'Facebook Page disconnected.',
          social: socialView(s.social),
        };
      }, true);
    }
    if (r[1] === 'social' && r[2] === 'tiktok' && m === 'PUT') {
      const input = tiktokSettings.parse(await body(request));
      if (input.enabled && !input.accountId && !input.url)
        throw new HttpError(
          400,
          'Add your TikTok username or profile URL before enabling the integration.',
        );
      return withStore((s) => {
        const current = s.social.tiktok;
        const token = input.accessToken
          ? encryptSecret(input.accessToken)
          : current.token;
        const hasToken = Boolean(token || process.env.TIKTOK_ACCESS_TOKEN);
        const identityChanged = input.accountId !== current.accountId;
        const status = !hasToken
          ? 'disconnected'
          : input.accessToken || identityChanged
            ? 'disconnected'
            : current.status;
        s.social.tiktok = {
          ...current,
          enabled: input.enabled,
          accountId: input.accountId,
          url: input.url,
          token,
          status,
          verifiedAt: status === 'disconnected' ? null : current.verifiedAt,
          error: null,
        };
        return {
          ok: true,
          message: 'TikTok settings saved.',
          social: socialView(s.social),
        };
      }, true);
    }
    if (r[1] === 'social' && r[2] === 'tiktok' && m === 'POST') {
      const input = z
        .object({ action: z.enum(['test', 'sync']) })
        .parse(await body(request));
      const connection = await withStore((s) => s.social.tiktok);
      const token = resolveToken(connection, 'tiktok');
      if (!token)
        throw new HttpError(
          400,
          'Add a TikTok access token before testing the connection.',
        );
      try {
        const profile = await verifyTikTokProfile({
          accountId: connection.accountId,
          url: connection.url,
          token,
        });
        const videos =
          input.action === 'sync'
            ? await fetchTikTokVideos(token)
            : connection.videos;
        const now = new Date().toISOString();
        return await withStore((s) => {
          s.social.tiktok = {
            ...s.social.tiktok,
            ...profile,
            videos,
            count:
              input.action === 'sync'
                ? videos.length
                : s.social.tiktok.count,
            syncedAt:
              input.action === 'sync' ? now : s.social.tiktok.syncedAt,
            status: 'connected',
            verifiedAt: now,
            error: null,
          };
          return {
            ok: true,
            message:
              input.action === 'sync'
                ? `Synced ${videos.length} TikTok videos.`
                : `Connected to ${profile.accountName}.`,
            social: socialView(s.social),
          };
        }, true);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'TikTok could not be reached.';
        await withStore((s) => {
          s.social.tiktok = {
            ...s.social.tiktok,
            status: 'error',
            error: message,
          };
        }, true).catch(() => {});
        throw new HttpError(502, message);
      }
    }
    if (r[1] === 'social' && r[2] === 'tiktok' && m === 'DELETE') {
      return withStore((s) => {
        s.social.tiktok = {
          ...s.social.tiktok,
          enabled: false,
          token: '',
          status: 'disconnected',
          followers: null,
          verifiedAt: null,
          error: null,
          syncedAt: null,
          count: 0,
          videos: [],
        };
        return {
          ok: true,
          message: 'TikTok disconnected.',
          social: socialView(s.social),
        };
      }, true);
    }
    if (r[1] === 'social' && !r[2] && m === 'POST') {
      const input = z
        .object({
          action: z.enum(['facebook-sync', 'tiktok-sync', 'mock-webhook']),
          productId: z.string().optional(),
        })
        .parse(await body(request));
      return withStore((s) => {
        if (input.action === 'mock-webhook') {
          s.social.messages.unshift({
            id: randomUUID(),
            name: 'Sample customer',
            text: 'Hi! Is the Laal Golap set available in size 2.6? This is a simulated Messenger webhook; no order has been placed.',
            source: 'Facebook Messenger · mock',
            at: new Date().toISOString(),
          });
          s.social.messages = s.social.messages.slice(0, 50);
          return {
            ok: true,
            message: 'Sample order request received in your inbox.',
          };
        }
        const platform =
          input.action === 'facebook-sync' ? 'facebook' : 'tiktok';
        const variants = s.products
          .filter((p) => p.visible)
          .flatMap((p) =>
            Object.entries(p.stock).map(([size, stock]) => ({
              sku: p.id + '-' + size,
              title: p.title,
              size,
              stock,
              price: p.price,
              currency: 'BDT',
              anchor: platform === 'tiktok' ? 'mock-video-' + p.id : undefined,
            })),
          );
        if (platform === 'facebook')
          s.social.facebook = {
            ...s.social.facebook,
            syncedAt: new Date().toISOString(),
            count: variants.length,
          };
        else
          s.social.tiktok = {
            ...s.social.tiktok,
            syncedAt: new Date().toISOString(),
            count: variants.length,
          };
        return {
          ok: true,
          message:
            variants.length +
            ' variants synced to the mock ' +
            platform +
            ' catalog.',
          variants,
        };
      }, true);
    }
  }
  throw new HttpError(404, 'This endpoint does not exist.');
}
export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
