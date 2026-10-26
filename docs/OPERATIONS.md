# ChuriCanvas · Operations guide

Mobile-first handmade bangle shop for Bangladesh, built with Next.js App Router, React, TypeScript, Tailwind CSS, Lucide, TanStack Query, signed HTTP-only cookie sessions and PostgreSQL. Your nine original photos are served from public/products; all titles and images are editable in /admin.

## Run locally

Use Node.js 24 LTS and npm. A private .env.local has been generated for this workspace. It contains your admin email, random password and session secret. It is excluded from Git and Vercel uploads. For a fresh clone, copy .env.example to .env.local, set ADMIN_EMAIL, choose an ADMIN_PASSWORD of at least 12 characters, and generate SESSION_SECRET with node -e "console.log(require('crypto').randomBytes(48).toString('hex'))".

1. npm install
2. npm run lint
3. npm run typecheck
4. npm test
5. npm run build
6. npm run start

Open http://localhost:3000. Use /admin and the credentials from .env.local. For development, npm run dev supports hot reload. npm run test:e2e runs against a started server and leaves one clearly labelled demo order; use only a disposable local/test database. SMOKE_URL can select another local test server, never production.

Without DATABASE_URL, the app saves local demo data to data/store.json using a serialized queue and atomic file replacement. Run one local server process. Do not use local file storage across replicas or serverless hosts. The UI marks this mode explicitly. Vercel rejects storage operations unless DATABASE_URL is configured.

## Connect Neon / PostgreSQL and Vercel

1. Connect the GitHub repository to Vercel and select main as its production branch. The native Git integration deploys each push to main; pull requests receive previews.
2. Configure production DATABASE_URL (pooled), DATABASE_URL_UNPOOLED (direct), ADMIN_EMAIL, ADMIN_PASSWORD and SESSION_SECRET in Vercel. Keep secrets out of Git. The adapter creates its state table on first use; local demo data is not imported.
3. Configure AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION and NEON_STORAGE_BUCKET for private product uploads. Use separate preview credentials when enabling previews with data access.
4. GitHub Actions verifies lint, types, unit tests, production build and the disposable local order pipeline. Vercel also runs lint, types, unit tests and build before publishing. No Vercel token is needed in GitHub Actions.
5. Assign churicanvas.vercel.app to production and keep automatic Git deployments enabled. Avoid a second CLI deployment job for the same pushes.

Replace the storefront placeholder contact before launch. Restrict production access to the owner and arrange database backups.

## Customer flow

Browse / or /shop, filter/sort/search, save favourites, select size 2.4, 2.6 or 2.8, add a customization note, and check out in /cart. Inside Dhaka costs ৳70 and outside Dhaka ৳130. Prices are whole BDT. The server calculates every total, combines stock demand across duplicate lines, and reserves inventory transactionally. An idempotency key prevents duplicate orders on a retry. Stock edits use a revision check to prevent stale admin forms from overwriting checkout changes.

Customers receive a signed anonymous customer session; accounts and cross-device sign-in are not implemented. This session links orders to browser history. /track polls every 10 seconds and accepts a private order link with a high-entropy capability token. Public tracking returns status, order lines and total, without names, phones or addresses. Keep private links confidential. The shopper must save their link for access from another browser.

COD is an actual order method with payment due on delivery. bKash and Nagad are explicitly mock workflows: no money moves, no PIN is requested, and transaction references are not verified by a provider. Admin shows those orders as Mock payment. Customization requests need a phone confirmation; delivery times are not guaranteed by the demo.

## Admin and integrations

/admin protects server rendering and every admin API. Admin sessions expire after 8 hours; customer sessions after 30 days. Cookies use HttpOnly, SameSite=Lax and Secure in production. Mutations require a matching Origin. Login attempts are limited in persistent storage; product and checkout payloads are validated at the API boundary. Admin can edit titles/descriptions, whole-BDT prices, category, label, per-size stock, visibility, and up to five images; uploaded photos are resized in the browser and saved durably as validated image data. Original photos remain selectable. Hiding is reversible; deleting removes the product while preserving historical order snapshots.

Order statuses are Pending → Processing → In Transit → Delivered. Admin can correct a status backwards, and every change is recorded. Order cancellation, stock restoration and refunds are not included.

Social studio simulates Facebook catalog sync, TikTok variant/video-anchor sync and an inbound Messenger enquiry. All simulations are protected admin actions. A Messenger enquiry does not automatically create an order. No outbound messages are sent and no external credentials are used. Analytics records actual local PageView, AddToCart and server-side Purchase events; ad spend and ROAS remain unavailable until real integrations are connected. Counts are events rather than unique users; the latest 10,000 events are retained.

The Fetch wrapper retries safe reads on network/5xx errors with exponential backoff and a timeout. Mutations never retry automatically. TanStack Query refreshes storefront and admin data, errors have user-facing toasts, and page/global error boundaries support recovery.

## Operating limits

The PostgreSQL adapter uses one locked JSONB state row, appropriate for a small single-shop catalog. This keeps stock reservation atomic without a large ORM. Normalize products/orders/events into separate indexed tables before high-volume traffic or large imports. In local demo mode without cloud credentials, validated photos are stored inline. When cloud storage is configured, uploads use the private Neon assets bucket and are served through the application’s image endpoint. Configure AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION and optionally NEON_STORAGE_BUCKET (defaults to assets) before using uploads with PostgreSQL/Vercel. Local storage requires a browser that permits it. No service worker or offline checkout is provided.

Before real sales: connect production PostgreSQL, confirm operational delivery fees/contact details, replace mock payments and social channels where desired, and arrange database backups. Production secrets, live provider payments, email/SMS notifications, real advertising attribution and production deployment require owner configuration.

## Restricted Windows verification

If the managed Windows environment rejects npm’s default child shell, set NPM_CONFIG_SCRIPT_SHELL to C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe for that terminal session. Next.js uses the TypeScript API checker with worker threads, and unit tests use Node’s in-process test mode; full type validation and tests remain enabled. Browser screenshot QA requires an available browser session.
