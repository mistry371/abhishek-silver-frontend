# Abhishek Silver — Jewellery Storefront

Customer-facing frontend for **Abhishek Silver**, a gold & silver jeweller in Surat — built frontend-first with
**Next.js 16 (App Router), React 19, TypeScript and Tailwind CSS v4**, and designed to plug into the
future Node.js backend without UI rewrites.

> The storefront currently runs on a built-in **mock API** so every flow (catalogue, cart, checkout,
> accounts, enquiries) is interactive today. Set `NEXT_PUBLIC_API_BASE_URL` to switch to the real backend.

---

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in values
npm run dev                   # http://localhost:3000
```

| Script              | Purpose                          |
| ------------------- | -------------------------------- |
| `npm run dev`       | Development server (Turbopack)   |
| `npm run build`     | Production build                 |
| `npm run start`     | Serve the production build       |
| `npm run typecheck` | TypeScript check                 |
| `npm run lint`      | ESLint                           |

### Demo data (mock mode)

| What              | Value                                                |
| ----------------- | ---------------------------------------------------- |
| Demo account      | `demo@example.com` / `Demo@1234`                     |
| OTP login         | Mobile `9000000000`, code `123456`                   |
| Demo coupons      | `WELCOME5`, `FESTIVE2000`, `SILVER10`                |
| Payment           | Demo gateway dialog (simulate success or failure)    |

Mock customer data (orders, addresses, enquiries) is stored in the browser's `localStorage`.

---

## ⚠️ Replace before launch

**Supplied by the business** (in `src/config/site.ts`): brand name, logo (`public/brand/abhishek-silver-logo.jpg`,
also `src/app/icon.jpg`), store address (103/104 Silver Arcade, Near Sadriwala Market, Bhagal Main Road, Surat 395003),
map location, Instagram and Facebook links.

**To confirm** (taken from public listings): phone numbers, which number is on WhatsApp, and store opening days/hours.

**Still placeholders** — must come from the business:

| Item                                   | Where                                           |
| -------------------------------------- | ----------------------------------------------- |
| Email address (hidden while empty)     | `src/config/site.ts`                            |
| Legal/registered business name         | `src/config/site.ts` (`legalName`)              |
| Store photos (currently stock imagery) | `src/lib/media.ts` (`editorial.store`)          |
| High-resolution / vector logo          | `public/brand/`                                 |
| Policies (shipping, returns, privacy, terms) | CMS / `src/mocks/data/content.ts`         |
| About page story, vision, mission      | `src/content/about.ts`                          |
| Certifications / hallmark claims       | `src/content/about.ts`, trust items (only if supplied) |
| Testimonials (currently marked *Sample*) | CMS; set `NEXT_PUBLIC_SHOW_SAMPLE_CONTENT=false` |
| Product photography                    | `src/lib/media.ts` + backend product media      |
| Demo catalogue, metal rates, coupons   | Replaced by backend data                        |

No years in business, awards, certifications or customer counts are shown unless the business adds them.

Demo photography is from Unsplash (Unsplash License) and referenced from a single registry,
`src/lib/media.ts`. Add the business's media host with `NEXT_PUBLIC_MEDIA_HOST`.

---

## Architecture

```
src/
  app/
    (site)/          Full storefront chrome: home, shop, product, account, content pages
    (checkout)/      Distraction-free checkout layout
    sitemap.ts, robots.ts, manifest.ts, not-found.tsx
  components/
    ui/              Design-system primitives (Button, Field, Dialog, Carousel, Tabs…)
    layout/          Header + mega menu, mobile menu, search overlay, footer, floating utilities
    home/ catalog/ product/ cart/ checkout/ orders/ account/ auth/ forms/ …
  config/            site.ts (business config), navigation.ts (menus)
  lib/
    api/             API client, customer-safe errors, service functions (mock ⇄ real)
    catalog/         URL ⇄ filter parsing, labels
    pricing/         Reference jewellery price engine
    seo.ts           Metadata + JSON-LD builders
  mocks/             Mock backend (data + handlers) — delete once the API is live
  stores/            Zustand stores: cart, wishlist, compare, auth, UI
  types/             Domain models & API contracts
```

### Design system

Tokens (colours, type scale, motion) live in `src/app/globals.css` (`@theme`). Typography utilities:
`type-display-xl`, `type-display-l`, `type-h1`…`type-h4`, `type-body-lg`, `type-body`, `type-body-sm`,
`type-caption`, `type-eyebrow`, `type-nav`, `type-button`, `type-price`, `type-product-title`.
Fonts: Cormorant Garamond (display) and Jost (UI) via `next/font`.

### State

| Store      | Persistence            | Source of truth after sign-in |
| ---------- | ---------------------- | ----------------------------- |
| Cart       | ids/sizes/qty only     | Server quote (`/cart/quote`)  |
| Wishlist   | localStorage (guest)   | Server wishlist (merged on login) |
| Compare    | localStorage           | Refreshed from `/products/compare` |
| Auth       | localStorage (mock)    | Use httpOnly cookies in production |

Prices shown in the bag, checkout and order pages always come from the server quote — the client
never sends or trusts prices, stock, coupon results or payment status.

---

## Connecting the backend

Set `NEXT_PUBLIC_API_BASE_URL`. Services in `src/lib/api/services/*` then call these endpoints
(JSON, `Authorization: Bearer <token>` where applicable). Errors should return
`{ code, message, fieldErrors? }` using the codes in `src/types/common.ts`.

| Area       | Endpoints |
| ---------- | --------- |
| Catalogue  | `GET /products` (filters: `base, category, sub, collection, metal, purity, gender, size, inStock, new, best, minPrice, maxPrice, minWeight, maxWeight, q, sort, page, pageSize`), `GET /products/:slug`, `GET /products/slugs`, `GET /products/merchandising`, `GET /products/:id/related`, `GET /products/:id/price?size=`, `GET /products/compare?ids=`, `GET /search/suggestions?q=`, `GET /categories`, `GET /categories/:slug`, `GET /collections`, `GET /collections/:slug` |
| Cart       | `POST /cart/quote`, `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:lineId`, `DELETE /cart/items/:lineId` |
| Wishlist   | `GET /wishlist`, `POST /wishlist`, `DELETE /wishlist/:productId`, `POST /wishlist/merge` |
| Orders     | `POST /orders`, `POST /orders/:id/payments/verify`, `POST /orders/:id/payments/failed`, `GET /orders`, `GET /orders/:id` |
| Auth       | `POST /auth/login`, `POST /auth/register`, `POST /auth/otp/request`, `POST /auth/otp/verify`, `POST /auth/password/forgot`, `POST /auth/logout` |
| Customer   | `GET/PATCH /me`, `POST /me/password`, `GET/POST /me/addresses`, `PUT/DELETE /me/addresses/:id`, `GET /me/enquiries` |
| Leads      | `POST /enquiries`, `POST /newsletter` |
| CMS        | `GET /content/homepage`, `/content/testimonials`, `/content/instagram`, `/content/trust`, `/content/faqs`, `/content/policies/:slug`, `/content/store`, `GET /blog`, `GET /blog/:slug`, `GET /offers` |

**Customer-facing responses must never include** purchase price, supplier data, margins, internal
valuation or stock quantities. The `Product` contract in `src/types/catalog.ts` is customer-safe by design.

### Pricing

`src/lib/pricing/engine.ts` documents the formula
`Metal rate × net weight + making + stone + other − discount + GST`. The backend owns rates and rules;
the product page re-validates price on load and on size change (`GET /products/:id/price`).

### Payments (Razorpay)

1. `POST /orders` creates the order and a Razorpay order, returning `paymentIntent { provider: "razorpay", keyId, providerOrderId, amount }`.
2. The storefront opens Razorpay Checkout (`src/lib/payments/razorpay.ts`).
3. The handler posts `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` to `/orders/:id/payments/verify`.
4. Only a server-verified `paid` status shows the confirmation. Keep the Razorpay **secret** on the backend only.

---

## SEO, accessibility & performance

- Per-page metadata, canonical URLs, Open Graph/Twitter, `sitemap.xml`, `robots.txt`.
- JSON-LD: Organization, WebSite (SearchAction), JewelryStore, Product, BreadcrumbList, FAQPage, Article.
- Filtered/sorted listing URLs are `noindex` with canonical to the clean category URL.
- Semantic landmarks, skip link, focus-trapped dialogs, keyboard-operable menus/carousels/tabs,
  visible focus, labelled form controls with inline errors, `prefers-reduced-motion` respected.
- `next/image` with responsive `sizes`, art-directed hero (`getImageProps`), lazy overlays
  (search, cart, quick view loaded on first open), static product/collection/blog pages.
