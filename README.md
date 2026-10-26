<div align="center">

<img src="src/app/icon.svg" alt="ChuriCanvas bangle mark" width="64" />

# ChuriCanvas

### A little tradition. A lot of you.

A mobile-first shop for handmade Bangladeshi bangles — from finding your colour to following your order home.

[**Explore the live shop ↗**](https://churicanvas.vercel.app) · [Features](#made-for-everyday-celebrations) · [Get started](#run-it-locally) · [Operations guide](docs/OPERATIONS.md)

[![CI](https://github.com/proffesergio/churi-canvas/actions/workflows/ci.yml/badge.svg)](https://github.com/proffesergio/churi-canvas/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-App_Router-302a28?style=flat-square&logo=nextdotjs)
![Handmade in Bangladesh](https://img.shields.io/badge/Handmade_in-Bangladesh-792b38?style=flat-square)
![Version](https://img.shields.io/badge/Release-v1_MVP-b89468?style=flat-square)

</div>

---

## Little circles. Distinct personalities.

Real product photography, traditional details, and small touches that make each set personal.

<table>
  <tr>
    <td align="center" width="33%"><img src="public/products/7.jpeg" alt="Crimson silk bangles with gold floral mirror details" width="250" /></td>
    <td align="center" width="33%"><img src="public/products/5.jpeg" alt="Green silk bangles with pink and gold mirror embellishments" width="250" /></td>
    <td align="center" width="33%"><img src="public/products/3.jpeg" alt="Blue, pink and crimson square silk-wrapped bangles" width="250" /></td>
  </tr>
  <tr>
    <td align="center"><strong>Laal Golap</strong><br /><sub>A little festive colour</sub></td>
    <td align="center"><strong>Mehendi Mirror</strong><br /><sub>Traditional details, a personal touch</sub></td>
    <td align="center"><strong>Trio of Traditions</strong><br /><sub>A different kind of everyday</sub></td>
  </tr>
</table>

The starter collection includes **nine real product photos**. Titles, prices, availability, and image galleries are editable from the admin workspace.

## Made for everyday celebrations

| For the shopper | For the maker |
| --- | --- |
| Browse, search, filter, and sort the collection | Add, edit, hide, and delete products |
| Save favourites and keep a bag on the same device | Set BDT prices and stock for each size |
| Choose **2.4, 2.6, or 2.8** and add a custom note | Upload multiple photos and choose a cover |
| Check out with a Bangladeshi mobile number and address | Review addresses, payment methods, and custom notes |
| Choose **Inside Dhaka / Outside Dhaka** delivery | Update fulfilment status from a phone |
| Follow a private order-tracking link | View storefront events and try social-channel simulations |

**Built around Bangladesh:** prices in **৳ BDT**, cash on delivery, local delivery zones, and clearly labelled **bKash / Nagad demo workflows**.

**Designed for a phone:** thumb-friendly bottom navigation, responsive product grids, mobile filter sheets, touch-sized controls, and an admin workspace that fits a small screen.

### From a favourite to a doorstep

**Choose a piece → Pick a size → Add your note → Check out → Save your private tracking link**

`Pending → Processing → In Transit → Delivered`

The server calculates totals from current inventory, checks stock across duplicate bag lines, and reserves it transactionally. Checkout retries reuse an idempotency key. Admin inventory edits use revision checks so an older form cannot overwrite a newer stock change.

## A small shop, thoughtfully connected

- **Private by default:** signed HTTP-only customer/admin sessions, protected admin APIs, validated requests, and order tracking that omits contact details.
- **A resilient storefront:** TanStack Query synchronization, safe-read retries, request timeouts, toast feedback, and recovery screens.
- **A social studio to explore:** simulated Facebook catalog sync, TikTok product/variant anchors, and inbound Messenger enquiries.
- **Useful signals:** PageView, AddToCart, and server-recorded Purchase events.

> **MVP boundaries:** bKash, Nagad, social syncs, Messenger webhooks, and advertising integrations are simulations. No wallet funds move and no external messages are sent. Customers use anonymous browser sessions; cross-device access uses the private tracking link.

## Under the canvas

| Layer | Implementation |
| --- | --- |
| Storefront & admin | Next.js App Router, React, TypeScript |
| Styling & icons | Tailwind CSS, responsive CSS, Lucide |
| API state | TanStack Query and a shared Fetch wrapper |
| Backend | Next.js route handlers |
| Database | PostgreSQL / Neon with a Vercel-aware connection pool |
| Product uploads | Private Neon object storage, served through the application |
| Authentication | Signed JWT sessions in HTTP-only cookies |
| Delivery | Vercel production deployment from GitHub `main` |

### Find your way around

| Route | Purpose |
| --- | --- |
| `/` | Storefront and featured collection |
| `/shop` | Searchable, paginated collection |
| `/saved` | Favourites saved on this device |
| `/cart` | Bag, customization notes, and checkout |
| `/track` | Private tracking and same-browser order history |
| `/admin` | Protected shop workspace |

## Run it locally

**Requirements:** Node.js 24 LTS and npm.

```sh
npm ci
cp .env.example .env.local
```

Set `ADMIN_EMAIL`, an `ADMIN_PASSWORD` of at least 12 characters, and a random `SESSION_SECRET` of at least 32 characters. Keep all credentials in ignored environment files.

```sh
npm run dev
```

Open **http://localhost:3000**. Sign in at **/admin** with your configured credentials.

Without `DATABASE_URL`, the app uses persistent local demo storage in `data/store.json`. Local photo uploads remain available without cloud storage. Production uses PostgreSQL and configured object storage.

<details>
<summary><strong>Checks, production builds, and the complete order-flow test</strong></summary>

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run start
```

With a separate local demo server running:

```sh
npm run test:e2e
```

The smoke test checks checkout, order privacy, admin CRUD, photo upload, status changes, stale-edit protection, social mocks, rendered pages, and real images. It refuses to create fixtures when the server reports a connected database.

For managed Windows shell settings and environment isolation, see the [operations guide](docs/OPERATIONS.md).

</details>

## Push to main. Ship to the shop.

**Production:** [churicanvas.vercel.app](https://churicanvas.vercel.app)

Vercel is connected to [proffesergio/churi-canvas](https://github.com/proffesergio/churi-canvas) and tracks `main` for production. Every push to `main` starts a deployment and updates the production domain after verification and build succeed.

- **GitHub Actions** checks lint, types, unit tests, a production build, and the local storefront-to-admin flow.
- **Vercel** runs lint, types, unit tests, and the production build before publishing.
- Vercel's native Git integration owns deployment; a second GitHub Actions deployment job is unnecessary.
- Runtime secrets belong in Vercel project environment variables, never in the repository.

See the [operations guide](docs/OPERATIONS.md) for database, storage, environment, and deployment details.

---

<div align="center">
<sub>Rooted in Bangladesh. Made by hand. Worn with heart.</sub>
</div>
