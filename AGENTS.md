# Patch & Press — Agent Guide

> This file is intended for AI coding agents. It describes the real architecture, conventions, and operational details of this project. Do not make assumptions — refer to this doc and the actual file contents.

---

## 1. Project Overview

**Patch & Press** (branded as "Patchuu") is a single-page e-commerce web application where customers customize physical products (canvas totes, keychains, pouches, cardholders) by placing decorative patches on them. The app features:

- A customer-facing landing page with a customizable CMS-driven layout (hero slider, gallery, testimonials, text blocks, image banners, dividers, shape transitions, etc.)
- A design tool (`CustomizePage`) for dragging, resizing, and rotating patches on product images with animated step transitions and a heat-press sequence
- A shopping cart with guest/localStorage and logged-in/cloud sync, including cart merge on login
- Multi-currency support via live exchange rates, with Stripe-powered checkout and shipping address collection
- An admin panel (`AdminPanel`) for managing products, patches, orders, inventory, and site content
- Supabase Auth with email/password

The app is a **client-side SPA with no React Router** — view switching is done via local state (`AppView` type in `src/App.tsx`).

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript (`.tsx`) |
| Build Tool | Vite 7 (`vite.config.ts`) |
| Styling | Tailwind CSS 3 + `tailwindcss-animate` + extensive custom theme (`tailwind.config.js`) |
| UI Components | shadcn/ui (`components.json` style: "new-york", baseColor: slate, icon library: lucide) |
| Animation | `framer-motion` |
| Icons | `lucide-react` |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) |
| Payments | Stripe (`@stripe/react-stripe-js`, `@stripe/stripe-js`) |
| State | React hooks + Context (`CartContext.tsx`, `CurrencyContext.tsx`) |
| Forms | `react-hook-form` + Zod (`@hookform/resolvers`) |
| Utilities | `clsx`, `tailwind-merge`, `uuid`, `date-fns` |
| Scripts | `tsx` (TypeScript execution for Node scripts), `sharp` for image processing |
| Browser Smoke Tests | Puppeteer (`test-website.cjs`) |
| Agent Tooling | `kimi-plugin-inspect-react` is loaded in Vite dev mode only |

---

## 3. Project Structure

```
├── src/
│   ├── App.tsx                  # Root component: navbar, cart drawer, auth modal, view router, CMS load
│   ├── main.tsx                 # React DOM entry (StrictMode); preloads image map
│   ├── index.css                # Tailwind directives + global paper/stationery theme styles
│   ├── App.css                  # Component-scoped / legacy styles
│   ├── AuthModal.tsx            # Login / signup / password reset modal
│   ├── AdminPanel.tsx           # Admin CMS dashboard + shared TypeScript interfaces
│   ├── LandingPage.tsx          # CMS-driven landing page renderer
│   ├── CustomizePage.tsx        # Product design tool (drag-and-drop patches, heat-press sequence)
│   ├── HeroGallery.tsx          # Gallery component
│   ├── ImageTracer.tsx          # SVG polygon tracing utility for placement zones
│   ├── ZoneEditor.tsx           # Placement zone editor
│   ├── SortableItem.tsx         # Draggable sortable item (dnd-kit)
│   ├── SortableSection.tsx      # Draggable section (dnd-kit)
│   ├── components/
│   │   ├── ui/                  # ~50 shadcn/ui primitive components (button, dialog, form, etc.)
│   │   ├── StripeCheckout.tsx   # PaymentElement + AddressElement checkout wrapper
│   │   ├── OrderConfirmation.tsx
│   │   ├── OrderDetailPage.tsx
│   │   ├── OrderItemsList.tsx
│   │   ├── AdminOrderManagement.tsx
│   │   ├── InventoryLogsViewer.tsx
│   │   ├── ProductCard.tsx
│   │   ├── CroppedThumbnail.tsx
│   │   ├── PatchuuLogo.tsx
│   │   ├── PatchuuHeroSection.tsx
│   │   ├── HeroSection.tsx
│   │   ├── DesignEffects.tsx
│   │   ├── DesignPreview.tsx
│   │   ├── MotionStep.tsx
│   │   ├── PatchFlight.tsx
│   │   ├── HeatPressSequence.tsx
│   │   ├── CraftingView.tsx
│   │   ├── StationeryDecorations.tsx
│   │   ├── PaperCard.tsx
│   │   └── Policy pages (PrivacyPolicyPage, TermsOfServicePage, RefundPolicyPage, ShippingPolicyPage)
│   ├── context/
│   │   ├── CartContext.tsx      # Cart state: localStorage + Supabase sync, login merge
│   │   └── CurrencyContext.tsx  # Multi-currency state, exchange rates, Stripe amount formatting
│   ├── hooks/
│   │   ├── useCachedData.ts     # Global 5-minute cache + request deduplication + timeout handling
│   │   ├── useDebounce.ts       # Debounced values and callbacks
│   │   └── use-mobile.ts        # Mobile breakpoint detection
│   ├── lib/
│   │   ├── supabase.ts          # Supabase client, auth helpers, DB helpers, storage helpers, inventory
│   │   ├── cms.ts               # CMS data loader (DB → Storage → static JSON fallback, with TTL cache)
│   │   ├── shipping.ts          # Flat shipping zones/rates (SGD base) + supported destination countries
│   │   ├── utils.ts             # `cn()`, path fixer, `getClipAndCenter()`
│   │   └── sounds.ts            # UI sound effects
├── scripts/
│   ├── export-cms.ts            # Build-time export of CMS data to `public/cms/*.json`
│   ├── bulk-upload-products.ts  # Sharp-based bulk product uploader with auto background removal
│   ├── bulk-upload-python.py    # Python/rembg alternative for bulk uploads
│   ├── BULK_UPLOAD_README.md    # Upload guide
│   └── trigger-vercel-deploy.ts # Triggers a Vercel deploy hook via the rebuild-site Edge Function
├── supabase/
│   ├── functions/
│   │   ├── create-payment-intent/index.ts   # Stripe PaymentIntent creation with reuse/idempotency
│   │   ├── stripe-webhook/index.ts          # Stripe webhook handler + amount validation
│   │   ├── export-products-patches/index.ts # Edge function to export products/patches to Storage
│   │   └── rebuild-site/index.ts            # Rebuild trigger via deploy webhook
│   └── migrations/
│       ├── 20240320120000_add_quantity_columns.sql
│       └── 20240321120000_fix_inventory_logs.sql
├── public/
│   ├── cms/                     # Static exported CMS JSON files (generated at build time; gitignored)
│   ├── hero/                    # Hero images
│   └── *.png                    # Default product and patch images (legacy assets)
├── dist/                        # Vite build output (deployed to Vercel)
├── package.json                 # Project name: "my-app", private, version 0.0.0
├── vite.config.ts               # `base: './'`, `@/` alias → `./src`, `kimi-plugin-inspect-react`
├── tsconfig.app.json            # TS strict mode, `noUnusedLocals`, `noUnusedParameters`
├── tailwind.config.js           # Extensive custom theme (colors, radius, typography, keyframes)
├── eslint.config.js             # Flat config: JS recommended + TS + react-hooks + react-refresh
├── vercel.json                  # Vite framework, SPA rewrites, security headers, asset caching
├── test-website.cjs             # Puppeteer smoke tests
└── index.html                   # Entry HTML (title: "Patch & Press")
```

---

## 4. Build and Development Commands

```bash
# Development server (Vite, http://localhost:5175)
npm run dev

# Production build (export CMS + sync images + type-check + Vite build)
npm run build

# Preview production build locally
npm run preview

# Lint
npm run lint

# Export CMS data from Supabase to `public/cms/*.json`
npm run export-cms

# Full production build (export + build)
npm run build:prod

# Bulk upload products
npm run bulk-upload

# Trigger a Vercel deploy hook (pulls fresh CMS data during the build)
npm run export-and-deploy

# Puppeteer smoke tests (expects dev server on http://localhost:5175)
node test-website.cjs
```

**Important:** `npm run build` automatically runs `export-cms` first. This pulls the latest CMS data from Supabase and writes static JSON files to `public/cms/`. Those files are generated at build time and are gitignored; they do not need to be committed. Default product/patch images stay as local legacy assets; admin-uploaded images are fetched directly from Supabase Storage at runtime.

---

## 5. Code Style Guidelines

### TypeScript
- Strict mode enabled (`strict: true` in `tsconfig.app.json`)
- `noUnusedLocals` and `noUnusedParameters` are **enabled** — unused variables will fail the build
- `verbatimModuleSyntax: true` — use `import type { ... }` for type-only imports
- `erasableSyntaxOnly` and `noUncheckedSideEffectImports` are enabled
- Path alias: `@/` maps to `./src/`

### Component Conventions
- Functional components with hooks
- Props interfaces are defined inline or imported from `AdminPanel.tsx` (which acts as a shared types file)
- shadcn/ui components live in `src/components/ui/` and follow the `components.json` aliases
- Tailwind classes are used extensively; custom CSS is minimal (`App.css` and `index.css` for theme-specific styles)

### Naming
- React components: PascalCase (`StripeCheckout.tsx`)
- Hooks: camelCase starting with `use` (`useCachedData.ts`)
- Utility files: camelCase (`supabase.ts`, `cms.ts`)
- DB-facing types in `lib/cms.ts` use `snake_case` fields to match Supabase schema

### State & Side Effects
- All Supabase auth state changes are handled in `App.tsx` with a consolidated listener
- Cart uses `CartContext` with localStorage for guests and Supabase `cart_items` table for logged-in users
- Currency uses `CurrencyContext` with live exchange rates from `open.er-api.com` and zero-decimal currency handling
- `useCachedData` provides a global 5-minute in-memory cache with request deduplication (1-second window) and fetch/safety timeouts

---

## 6. Testing

### Puppeteer Smoke Tests
`test-website.cjs` is a standalone Puppeteer script that:
- Loads the homepage and checks for key elements
- Tests navigation, product selection, cart, and login modal
- Captures performance metrics and screenshots across viewports

Run it with: `node test-website.cjs` (expects dev server on `http://localhost:5175`)

---

## 7. Architecture Deep Dive

### View Routing (No React Router)
The app uses a single `AppView` state in `App.tsx`:
```ts
type AppView = 'landing' | 'customize' | 'order-detail' | 'admin' | 'privacy' | 'terms' | 'refund' | 'shipping';
```
The `Navbar` and `main` content switch based on this state. URL hash changes are not used for routing. Two exceptions map URL paths into state at mount: `/reset-password` opens the auth modal's set-new-password view, and `/privacy`, `/terms`, `/refund`, `/shipping` open the matching policy view (used by email footer links).

### CMS Data Loading Strategy (`src/lib/cms.ts`)
Product/patch/site content is loaded with freshness as the top priority. Stale or missing
products are unacceptable for an e-commerce site, so the source of truth is always Supabase DB:

1. **Supabase Database** — queried first on every load (or after admin updates with `forceRefresh`)
2. **In-memory TTL cache** — 60-second cache so repeated renders in the same session don’t hammer the DB
3. **In-memory stale cache** — if the DB call fails, the app serves the last-known data from memory
4. **Supabase Storage CDN** — fallback if DB is unreachable; requests are cache-busted with a timestamp
5. **Static JSON files** (`public/cms/*.json` — build-time exported) — last-resort fallback if both DB and Storage fail

Static files and Storage exports are still maintained at build time and after admin saves for
resilience and fast recovery, but normal customer traffic never sees stale cached catalog data.

After admin changes, call `clearCmsCache()` and dispatch `window.dispatchEvent(new Event('cms-updated'))` to trigger a fresh load in `App.tsx`.

### Image Strategy
- **Default/legacy assets** (root-level `/patch-*.png`, `/tote-bag.png`, `/hero/*`, etc.) are stored in `public/` and optimized to WebP/AVIF at build time via `scripts/optimize-images.ts`.
- **Admin-uploaded product/patch images** are kept in Supabase Storage and fetched at runtime from `https://*.supabase.co`. They are **not** copied to `public/`.
- The exported `products.json`/`patches.json` references admin-uploaded images by their Supabase Storage URL.
- `lib/utils.ts` (`fixImagePath`) only applies build-time optimization mappings for local legacy assets; Supabase URLs pass through unchanged.
- The CSP in `vercel.json` allows `img-src 'self' blob: https://*.supabase.co`, so Storage images load without blocking.

### Cart Sync Strategy (`src/context/CartContext.tsx`)
- **Guest users:** cart persists in `localStorage` only (`patchpress-cart-guest`)
- **Logged-in users:** cart syncs to Supabase `cart_items` table with 300ms debounce; localStorage backup is also kept (`patchpress-cart-user`)
- **Login merge:** guest cart is merged with cloud cart on sign-in, deduplicated by product + `JSON.stringify` of front/back patch layouts, keeping the higher quantity for duplicates
- Cart items include `frontPatches` and `backPatches` with full placement metadata (`x`, `y`, `rotation`, `widthPercent`, `heightPercent`)

### Currency Strategy (`src/context/CurrencyContext.tsx`)
- Base currency is **SGD** by default in the checkout component, but the default site content in `App.tsx` uses **USD**
- User currency preference is stored in `localStorage` (`patchpress-user-currency`) and takes precedence over CMS defaults
- Exchange rates are fetched from `https://open.er-api.com/v6/latest/{base}`
- Zero-decimal currencies (`JPY`, `KRW`) are rounded to whole units for Stripe; all others are converted to cents
- `formatPrice()` uses `Intl.NumberFormat` for display

### Shipping Fees (`src/lib/shipping.ts`)
- Flat per-order shipping by destination zone, defined in SGD base: **SG S$3.90** (SingPost Tracked Letterbox), **Southeast Asia (MY, ID, TH, PH, VN) S$9.90** (booked via EasyParcel, MY cost ~S$6 — verify quotes per country on first orders), **rest of supported countries S$21.90** (SingPost Speedpost Saver, counter-only retail product — not bookable on ezy2ship)
- Supported destination countries are listed in `SHIPPING_COUNTRIES` (SG, MY, ID, TH, PH, VN, HK, TW, CN, JP, KR, AU, GB, US)
- The customer picks the destination country in the cart drawer **before** the Stripe form mounts; the Checkout Session's `shipping_address_collection.allowed_countries` is locked to that single country so the charged fee always matches the final address
- The edge function (`create-payment-intent`) recomputes the fee server-side from `shipping_country` — it carries its own copy of the zone table (keep it in sync with `src/lib/shipping.ts`) and never trusts a client-sent amount
- Fees convert to the charge currency through the same FX path as products (including the FX buffer); `pending_orders.shipping_fee` stores the SGD base, `orders.shipping_fee` stores the charge-currency amount
- Changing the country remounts `StripeCheckout` (keyed by country) and the sessionStorage/idempotency keys include the country, so each destination gets its own Checkout Session

### Payment Flow
1. `StripeCheckout` creates a PaymentIntent via the `create-payment-intent` Supabase Edge Function
2. The Edge Function reuses an existing pending PaymentIntent for the same user within the last 5 minutes if it is still in `requires_payment_method`
3. Duplicate prevention uses `sessionStorage` + deterministic idempotency keys + in-flight request tracking
4. `PaymentElement` and `AddressElement` collect card and shipping details
5. On success, the order is created in the DB immediately, inventory is deducted, and the cart is cleared
6. The Stripe webhook (`stripe-webhook`) validates the amount (±$0.01 tolerance) and marks the order as `paid`
7. The webhook then sends a branded order-confirmation email via Resend (`RESEND_API_KEY` edge-function secret, sender `Patchuu <noreply@contact.patchuu.shop>`). Template lives in `buildOrderEmailHtml` in `supabase/functions/stripe-webhook/index.ts`; social links are read from `site_content.footer` at send time (icons appear only when real URLs are set in the admin panel). Sending is gated on the DB update that flips the order to `paid`, so duplicate webhook deliveries cannot double-send.

### Inventory Management (`src/lib/supabase.ts`)
- `inventory.checkAvailability` — checks stock before checkout
- `inventory.deductFromOrder` — deducts product and patch quantities after payment, writes `inventory_logs`, and groups duplicate patch IDs to avoid duplicate log entries
- `inventory.restoreFromOrder` — restores stock on order cancellation
- `inventory.restock` — admin restocking with audit logging
- `inventory.getLogs` — audit trail query

### Auth & Roles
- Supabase Auth with `persistSession: true` in `localStorage` (key: `patchpress-auth`)
- `profiles` table extends `auth.users` with `role` (`user` | `admin`) and `full_name`
- Role is fetched after sign-in and cached in `user.user_metadata` for instant availability; legacy sessions without metadata fall back to a DB fetch
- Admin UI is conditionally rendered based on `currentUser.role === 'admin'`
- Sign-in is email/password only (the Apple Sign-In button was removed from the modal; `auth.signInWithApple` remains in `lib/supabase.ts` but is unused)

---

## 8. Environment Variables

Create a `.env` file in the project root (already gitignored):

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Supabase Edge Function secrets** (configured in Supabase dashboard, not in `.env`):
- `STRIPE_SECRET_KEY` — used by `create-payment-intent` and `stripe-webhook`
- `STRIPE_WEBHOOK_SECRET` — used by `stripe-webhook`
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — used by Edge Functions for admin DB access
- `DEPLOY_WEBHOOK_URL` — required for the admin panel’s “Update Live Site” button; the `rebuild-site` Edge Function uses this to trigger a Vercel deploy. Get it from Vercel → Project Settings → Git → Deploy Hooks.

**Note:** The Stripe **secret key** never touches the client.

---

## 9. Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `products` | Product catalog (id, name, front_image_url, back_image_url, base_price, quantity, width, height, placement_zone, crop_zone, sort_order) |
| `patches` | Patch catalog (id, name, category, image_url, price, quantity, width, height, content_zone, sort_order) |
| `site_content` | CMS data (id='current', landing_page, footer, global_settings, customize_page, navbar) |
| `orders` | Customer orders (order_number, payment_intent_id, items, total_amount, status, fulfillment_status, shipping_address, payment_verified, paid_at) |
| `order_items` | Line items per order (product_id, patches, quantity, unit_price, total_price, design_image_url, front_patches, back_patches) |
| `cart_items` | Persisted carts (user_id, product_id, front_patches, back_patches, total_price, quantity, design_image, placement_zone) |
| `profiles` | User profiles (id → auth.users, full_name, role, avatar_url) |
| `inventory_logs` | Audit trail (product_id, item_type, change_amount, previous_quantity, new_quantity, reason, order_id) |
| `payment_logs` | Failed payment logging (optional) |

Row Level Security (RLS) is enforced. Users can only read/write their own orders and cart items. Admin write access to products/patches/site_content is gated by RLS policies checking the `profiles.role` field.

---

## 10. Deployment

### Primary Platform: Vercel
- `vercel.json` configures the project as a Vite SPA with SPA rewrites (`/*` → `index.html`)
- Security headers are set: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`
- `dist/assets/*` are cached for 1 year (immutable)

### CI/CD
There is no custom GitHub Actions workflow. Content changes are deployed through one of these paths:

1. **Code push:** Vercel’s native Git integration runs `npm run build` on every push, which exports fresh CMS data at build time.
2. **CMS-only update:** Click **“Update Live Site”** in the admin panel. This invokes the `rebuild-site` Supabase Edge Function, which hits your Vercel deploy hook and triggers a new build.

No generated files (`public/cms/`, `robots.txt`, `sitemap.xml`) are committed to git.

### Supabase Edge Functions
Must be deployed separately via the Supabase CLI or dashboard:
- `create-payment-intent`
- `stripe-webhook`
- `export-products-patches`
- `rebuild-site`

---

## 11. Security Considerations

- **Stripe Secret Key** never touches the client. It lives only in Supabase Edge Function secrets.
- **Payment validation:** The webhook validates that the Stripe amount matches the order amount (±$0.01 tolerance). Mismatches mark the order as `amount_mismatch`.
- **RLS:** All user-facing tables have RLS enabled. Admin mutations are protected by role-based policies.
- **Idempotency:** PaymentIntent creation uses idempotency keys, `sessionStorage`, and 5-minute pending-order reuse to prevent double-charges on React Strict Mode remounts and retries.
- **Inventory:** Stock is checked before checkout and sequentially deducted after payment. Race conditions are mitigated but not eliminated by true DB transactions — be aware of this under extreme concurrency.
- **CORS:** Edge functions return CORS headers for the frontend origin.
- **Image serving:** Default product/patch images are local legacy assets. Admin-uploaded images are served directly from Supabase Storage; the CSP allows `https://*.supabase.co`.

---

## 12. Common Gotchas for Agents

1. **No React Router** — Always use the `AppView` state pattern when adding new "pages". Do not install `react-router-dom`.
2. **Unused variables fail the build** — `noUnusedLocals: true`. Comment out or use `_` prefix for intentionally unused parameters.
3. **CMS data caching** — After admin changes, `clearCmsCache()` and `window.dispatchEvent(new Event('cms-updated'))` trigger a fresh load. Static files are only updated at build time; the live app can also fall back to Supabase DB.
4. **Cart items use `frontPatches` and `backPatches`** — Legacy code may reference a flat `patches` array. Both `App.tsx` (cart display) and `StripeCheckout.tsx` (order creation) handle legacy data gracefully.
5. **Image paths** — Root-level images (`/patch-egg.png`, `/tote-bag.png`) are local legacy assets. Admin-uploaded images are stored in Supabase Storage and referenced by full Supabase URLs in `products.json`/`patches.json`. `lib/utils.ts` (`fixImagePath`) only optimizes local legacy assets; Supabase URLs pass through unchanged.
6. **Edge Function URL** — The frontend calls `${VITE_SUPABASE_URL}/functions/v1/create-payment-intent` directly with `fetch` (not `supabase.functions.invoke`) to ensure the `Authorization` header is explicitly set.
7. **shadcn/ui components** — Do not manually edit `src/components/ui/*` unless fixing a bug. Add new shadcn components via the CLI if available, or create custom components in `src/components/`.
8. **Currency** — The default currency is `SGD` in `CurrencyContext` but `USD` in the default site content. The currency selector in the navbar sets the global state and persists to `localStorage`.
9. **Auth loading state** — `isAuthLoading` is used to prevent UI flashes during session recovery. Always respect it when rendering auth-dependent UI.
10. **Puppeteer tests** — `test-website.cjs` runs against a local dev server. It is not part of the CI pipeline and must be run manually.
11. **Build does not sync images** — `npm run build` runs `export-cms`, `optimize-images`, `build-sitemap`, then `tsc` and `vite build`. Admin-uploaded images remain in Supabase Storage and are fetched at runtime. If Supabase env vars are missing, `export-cms` silently uses existing static files and exits successfully.
12. **Heat-press / animation effects** — `CustomizePage.tsx` uses `framer-motion` and a custom sound utility (`lib/sounds.ts`). Adding heavy synchronous work during animations can cause jank.
13. **Vite inspect plugin** — `kimi-plugin-inspect-react` is loaded in `vite.config.ts` for development/tooling; it does not affect production builds.
