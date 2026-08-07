# SPEC.md — SpotOn Card

Reverse-engineered specification for the SpotOnRoof Digital Business Card application. This document is generated from source as of 2026-05-21 and is intended to be exhaustive enough for diagnostic and maintenance use.

---

## 1. Overview

SpotOn Card is a Next.js (App Router) web application that serves public, mobile-first digital business cards for SpotOnRoof sales reps at URLs of the form `card.spotonroof.com/<firstname-lastname>`. Each card is intended to be opened by tapping a physical NFC ID badge against a phone; the core feature is a "Save Contact" button that downloads a cross-platform vCard. Reps (and admins) manage their cards via magic-link email auth, and admins can additionally sync the rep roster from a Google Sheet, edit any rep, manage company-wide settings, and view analytics.

---

## 2. Tech Stack

| Layer | Technology |
| --- | --- |
| Language | TypeScript 5.9 (`strict: true`) |
| Runtime | Node.js (declared `"type": "commonjs"` in `package.json`) |
| Framework | Next.js 14.2 (App Router, `output: "standalone"`) |
| UI Library | React 18.3 + React DOM 18.3 |
| Styling | Tailwind CSS 3.4 with custom theme; global font variables loaded via `next/font/google` (Outfit, DM Sans) |
| Auth | NextAuth.js v5 beta (`next-auth@^5.0.0-beta.30`) with `@auth/prisma-adapter` and Email (magic link) provider |
| Email | Resend (`resend@^6.9.3`) for transactional magic-link emails |
| ORM | Prisma 5.22 (`@prisma/client`, `prisma`) |
| Database | PostgreSQL (provider `postgresql`); Prisma generator targets `native` and `linux-musl-openssl-3.0.x` binaries |
| Image processing | `sharp@^0.34.5` (server-side resize/compress) |
| Photo cropping (client) | `react-easy-crop@^5.5.6` |
| QR codes | `qrcode@^1.5.4` |
| Google Sheets | `googleapis@^171.4.0` (service-account JWT auth) |
| CSS tooling | PostCSS 8.5 + Autoprefixer 10.4 |
| Lint | ESLint 9 + `eslint-config-next` 16.1 |
| Seed runner | `tsx@^4.21.0` |
| TS path alias | `@/*` → `./src/*` |
| Deploy target | Railway (Next.js app + Railway-managed Postgres). No Dockerfile, `railway.toml`, or `Procfile` is checked into the repo — Railway is expected to auto-detect Next.js and run `npm run build` / `npm start`. |

---

## 3. Directory Structure

```
spoton-card/
├── .env.example                       # Template for required env vars (DATABASE_URL, NEXTAUTH_*, RESEND_*)
├── .forge-prompt-1.txt                # Untracked prompt artifact from this documentation task
├── .gitignore                         # Excludes node_modules, .next, .env, .claude, .vercel, etc.
├── .npmrc                             # Sets node-options=--use-openssl-ca (use system trust store)
├── CLAUDE.md                          # Project guidance for Claude Code (tech, conventions, brand, state)
├── next.config.mjs                    # Next.js config: output=standalone, allow any HTTPS remote image host
├── package.json                       # Scripts, deps; declares "type": "commonjs", prisma seed = npx tsx prisma/seed.ts
├── package-lock.json                  # npm lockfile
├── postcss.config.js                  # PostCSS plugins: tailwindcss + autoprefixer
├── spot-on-digital-card-spec.md       # Original product/design spec (separate from this reverse-engineered SPEC.md)
├── tailwind.config.js                 # Tailwind config: custom colors (spoton-blue, card-bg, card-surface), font families
├── tsconfig.json                      # TS config: strict, bundler resolution, "@/*" → "./src/*"
├── prisma/
│   ├── schema.prisma                  # DB schema: User/Account/Session/VerificationToken (NextAuth) + Rep, CompanySettings, AnalyticsEvent
│   └── seed.ts                        # Seed: default CompanySettings, admin@spotonroof.com (inactive), brack@ (admin rep), jane-smith (sample rep)
├── public/
│   └── images/
│       └── logo-white.png             # SpotOnRoof wordmark used on every page header and in magic-link email
└── src/
    ├── middleware.ts                  # Edge middleware protecting /edit (any auth) and /admin/* (admin role)
    ├── types/
    │   └── index.ts                   # Module augmentation for next-auth Session/JWT (adds repId, role, slug)
    ├── lib/
    │   ├── auth.ts                    # NextAuth v5 config: PrismaAdapter, Email provider with Resend, JWT strategy, cookie names, jwt/session/redirect callbacks
    │   ├── prisma.ts                  # Global PrismaClient singleton (HMR-safe)
    │   ├── utils.ts                   # generateSlug(firstName,lastName) with collision suffixing, isBot(userAgent)
    │   └── vcard.ts                   # generateVCard() — builds vCard v3.0 string (N, FN, ORG, TITLE, TEL, EMAIL, ADR, URL, PHOTO)
    ├── components/
    │   └── PhotoCropModal.tsx         # Client modal wrapping react-easy-crop; outputs cropped JPEG Blob (1:1 aspect)
    └── app/
        ├── layout.tsx                 # Root layout: loads Outfit+DM Sans fonts, viewport meta, wraps in <Providers>
        ├── providers.tsx              # Client-only wrapper exporting next-auth SessionProvider
        ├── globals.css                # Tailwind base/components/utilities + bg/text defaults
        ├── page.tsx                   # Server component that redirect()s "/" → "/login"
        ├── not-found.tsx              # 404 page (logo + back-home button)
        ├── post-login/
        │   └── page.tsx               # Server: reads auth(), redirects admin→/admin, others→/edit
        ├── login/
        │   ├── layout.tsx             # Metadata title only
        │   └── page.tsx               # Client login form, calls signIn('email'); success view when ?sent=true
        ├── register/
        │   └── page.tsx               # Client self-registration form (POST /api/register)
        ├── edit/
        │   ├── layout.tsx             # Metadata title only
        │   └── page.tsx               # Client rep edit dashboard: own analytics, QR link, URL copy, profile form, read-only company info
        ├── admin/
        │   ├── layout.tsx             # Metadata title only
        │   └── page.tsx               # Client admin dashboard: Reps / Settings / Analytics tabs; Rep CRUD modal; Sync Roster button
        ├── [slug]/
        │   ├── page.tsx               # Server: looks up Rep by slug, returns inactive notice / 404 / CardClient
        │   └── CardClient.tsx         # Client: full public card UI (hero photo, name, bio, contact rows, share/save-contact buttons, maps modal)
        └── api/
            ├── auth/
            │   └── [...nextauth]/
            │       └── route.ts       # Exports GET/POST from src/lib/auth.ts handlers
            ├── register/
            │   └── route.ts           # POST: invite-code-gated rep self-registration
            ├── reps/
            │   └── route.ts           # GET own Rep, PUT update own Rep (rep-editable fields only)
            ├── company/
            │   └── route.ts           # GET singleton CompanySettings (public — no auth)
            ├── upload/
            │   └── route.ts           # POST image → sharp resize 500x500 cover → JPEG base64 data URI
            ├── vcard/
            │   └── [slug]/
            │       └── route.ts       # GET: builds and returns text/vcard attachment for Rep+Company
            ├── qrcode/
            │   └── [slug]/
            │       └── route.ts       # GET: PNG QR encoding `${NEXTAUTH_URL}/${slug}`, transparent background, white pixels
            ├── analytics/
            │   ├── route.ts           # POST event: card_view (bot-filtered) or contact_tap
            │   └── stats/
            │       └── route.ts       # GET own (view, tap) counts (authenticated rep)
            └── admin/
                ├── reps/
                │   ├── route.ts       # GET list of all reps w/ stats; POST create rep (admin)
                │   └── [id]/
                │       └── route.ts   # PUT update any rep, DELETE rep (admin, blocks self-delete)
                ├── settings/
                │   └── route.ts       # PUT company settings (admin)
                ├── analytics/
                │   └── route.ts       # GET company-wide analytics with ?range=7|30|all (admin)
                └── sync-roster/
                    └── route.ts       # POST Google-Sheets-driven roster sync (admin)
```

Notes on files explicitly NOT present in the repo:
- No `Dockerfile`, `railway.toml`, `railway.json`, `Procfile`, `nixpacks.toml`, `vercel.json`, `.github/workflows/*` — deployment is assumed to be Railway's auto-detected Next.js buildpack/nixpacks.
- No `next-env.d.ts` (gitignored; Next.js regenerates on build).
- No `.eslintrc*` / `eslint.config.*` (relies on `eslint-config-next` defaults).
- No tests, no CI configuration, no Storybook.

---

## 4. Environment Variables

Variables read by the application code (`process.env.*` grep) and from the seed/Prisma config:

| Variable | Required | Used in | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | `prisma/schema.prisma` (`datasource db { url = env(...) }`) | PostgreSQL connection string for Railway-managed Postgres. Used by Prisma at build time (`prisma generate`) and runtime. |
| `NEXTAUTH_SECRET` | Yes (prod) | `src/lib/auth.ts`, `src/middleware.ts` | Secret used to sign/verify NextAuth JWTs and CSRF tokens. Both files fall back to `AUTH_SECRET` if unset. |
| `AUTH_SECRET` | No (fallback) | `src/lib/auth.ts`, `src/middleware.ts` | Alternate env var name accepted as a fallback for `NEXTAUTH_SECRET`. |
| `NEXTAUTH_URL` | Yes (prod) | `src/app/api/qrcode/[slug]/route.ts` (base for QR contents); implicitly used by NextAuth for callback URLs | Public origin of the app (e.g. `https://card.spotonroof.com`). Falls back to `http://localhost:3000` only inside QR generation. |
| `RESEND_API_KEY` | Yes | `src/lib/auth.ts` (`getResend()`) | Resend API key used to send magic-link verification emails. Throws on the sign-in path if unset. |
| `RESEND_FROM_EMAIL` | No (default) | `src/lib/auth.ts` | "From" address for magic-link email. Defaults to `noreply@spotonroof.com`. |
| `NODE_ENV` | No (Node default) | `src/lib/prisma.ts`, `src/lib/auth.ts` | Standard Node env. Controls (a) whether the Prisma client is cached on `globalThis` (dev only) and (b) whether NextAuth `debug` is enabled (any non-`production` value). |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Only for roster sync | `src/app/api/admin/sync-roster/route.ts` | Full JSON of a Google service-account key (must contain `client_email` and `private_key`). Parsed at request time. |
| `GOOGLE_SHEET_ID` | Only for roster sync | `src/app/api/admin/sync-roster/route.ts` | ID of the Google Sheet whose tabs (excluding `Appointment Setters`) define the roster. |

`.env.example` ships `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`. The two Google variables are not in `.env.example`; they must be configured in Railway separately for the Sync Roster button to work.

---

## 5. Database

PostgreSQL via Prisma. Schema in `prisma/schema.prisma`. Cuid string IDs throughout.

### 5.1 Enums

```prisma
enum Role      { rep | admin }
enum EventType { card_view | contact_tap }
```

### 5.2 NextAuth-required models (PrismaAdapter)

#### `User`
| Field | Type | Notes |
| --- | --- | --- |
| id | `String` @id @default(cuid()) | |
| name | `String?` | |
| email | `String?` @unique | Used as join key by `Rep` via app-level lookup (no FK). |
| emailVerified | `DateTime?` | Set by NextAuth after magic link is clicked. |
| image | `String?` | NextAuth field — unused by the app UI; reps' photos live on `Rep.profilePhoto`. |
| accounts | `Account[]` | Relation |
| sessions | `Session[]` | Relation |

#### `Account`
| Field | Type | Notes |
| --- | --- | --- |
| id | `String` @id @default(cuid()) | |
| userId | `String` | FK → `User.id`, `onDelete: Cascade`. |
| type / provider / providerAccountId | `String` | |
| refresh_token / access_token / id_token | `String?` @db.Text | |
| expires_at | `Int?` | |
| token_type / scope / session_state | `String?` | |
| user | relation | `@@unique([provider, providerAccountId])`. |

#### `Session`
| Field | Type | Notes |
| --- | --- | --- |
| id | `String` @id @default(cuid()) | |
| sessionToken | `String` @unique | |
| userId | `String` | FK → `User.id`, `onDelete: Cascade`. |
| expires | `DateTime` | |

Note: although a `Session` table exists, the active session strategy is **JWT** (`session.strategy = 'jwt'` in `src/lib/auth.ts`). The adapter still requires the table to exist.

#### `VerificationToken`
| Field | Type | Notes |
| --- | --- | --- |
| identifier | `String` | Email of the requester. |
| token | `String` @unique | One-time token in the magic link. |
| expires | `DateTime` | NextAuth default 24h. |
| | | `@@unique([identifier, token])` |

### 5.3 Application models

#### `CompanySettings` (singleton, looked up via `findFirst`)
| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| id | `String` @id @default(cuid()) | | Seed uses literal `'default'`. |
| companyName | `String` | | |
| companyAddress | `String` | | Free-form, split on commas by `vcard.ts`. |
| companyPhone | `String?` | | |
| companyWebsite | `String` | | |
| companyLogo | `String?` | | (Settable via API; not currently shown anywhere besides `/images/logo-white.png` hardcoded). |
| companyInstagram / companyFacebook / companyLinkedIn / companyTikTok / companyYouTube | `String?` | | URLs. |
| reviewLink | `String?` | | URL used by "Leave a Review" row; falls back in CardClient to `https://review.spotonroofing.com/`. |
| inviteCode | `String` | | Required to self-register. |
| brandPrimaryColor | `String` | `"#00AEEF"` | Stored but not consumed dynamically — CardClient hardcodes brand hex values. |
| brandSecondaryColor | `String` | `"#0A7E8C"` | Same as above. |
| createdAt / updatedAt | `DateTime` | now()/auto | |

#### `Rep`
| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| id | `String` @id @default(cuid()) | | |
| email | `String` @unique | | Source of truth joining `Rep` ↔ NextAuth `User`. |
| firstName / lastName | `String` | | |
| slug | `String` @unique | | URL slug. Generated by `generateSlug()` (lowercase, strips non-`a-z0-9-`, appends `-2`, `-3`, … on collision). |
| jobTitle | `String` | `""` | |
| phone | `String` | `""` | |
| profilePhoto | `String?` | | Stored as `data:image/jpeg;base64,...` data URI (see Upload route). |
| personalInstagram / personalLinkedIn / personalFacebook / personalTikTok / personalWebsite | `String?` | | URLs. |
| bio | `String?` | | Capped to 200 chars by every write path. |
| role | `Role` | `rep` | |
| isActive | `Boolean` | `true` | Inactive reps show "card no longer active" on their slug. |
| createdAt / updatedAt | `DateTime` | | |
| analyticsEvents | `AnalyticsEvent[]` | | Relation. |

#### `AnalyticsEvent`
| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| id | `String` @id @default(cuid()) | | |
| repId | `String` | | FK → `Rep.id`, `onDelete: Cascade`. |
| eventType | `EventType` | | `card_view` or `contact_tap`. |
| timestamp | `DateTime` | now() | |
| userAgent | `String?` | | Captured from request header. |
| referrer | `String?` | | Captured from request `referer` header. |
| | | | Indexes: `@@index([repId])`, `@@index([eventType])`, `@@index([timestamp])`. |

### 5.4 Relationship summary

- `User 1—N Account`, `User 1—N Session` (NextAuth; cascade on User delete)
- `Rep 1—N AnalyticsEvent` (cascade on Rep delete)
- `Rep` is linked to `User` only by `email` equality (no FK); deleting a rep also calls `prisma.user.deleteMany({ where: { email } })` to keep them in sync.

### 5.5 Migrations

- `prisma/migrations/` is **not** present in the repo. The app relies on `npm start` running `prisma migrate deploy` before starting Next.js. This implies either (a) migrations exist in a branch/deploy artifact not checked in, or (b) Railway's deploy uses `prisma db push` semantics. **Investigate before any schema change.**

### 5.6 Seed

`prisma/seed.ts` (run via `npx tsx prisma/seed.ts`, configured under `package.json#prisma.seed`):
1. Upserts a single `CompanySettings` row with id `default`, address `130 E Wilson Bridge Rd Suite 300, Worthington, OH 43085`, invite code `SPOTON2024`.
2. Upserts a standalone admin Rep `admin@spotonroof.com` (`role: admin`, `isActive: false`, slug `admin`) plus matching `User`.
3. Upserts an admin rep `brack@spotonroof.com` (Brack Dillon, slug `brack-dillon`, `role: admin`, active) plus matching `User`.
4. Upserts a sample rep `jane@spotonroof.com` (Jane Smith, slug `jane-smith`, `role: rep`) plus matching `User`.

---

## 6. Authentication & Authorization

### 6.1 Sign-in flow (magic link)

1. User enters email on `/login` → `signIn('email', { email, redirect:false, callbackUrl:'/post-login' })`.
2. NextAuth (`src/lib/auth.ts`) generates a `VerificationToken` row and invokes `sendVerificationRequest`, which calls `Resend.emails.send` with a dark-themed HTML template (CTA → tokenized URL). `from` is `RESEND_FROM_EMAIL` (default `noreply@spotonroof.com`).
3. On success the browser is sent to `/login?sent=true` (the verifyRequest page is also set to that URL in `pages.verifyRequest`).
4. User clicks email link → NextAuth verifies the token, ensures a matching `User` row exists (PrismaAdapter), sets the JWT cookie `next-auth.session-token`, and bounces back to `callbackUrl`.
5. `/post-login` (server component) reads `auth()`. If `session.user.role === 'admin'` → redirect `/admin`, otherwise → redirect `/edit`.
6. `redirect` callback only allows relative URLs or same-origin URLs.

### 6.2 Session shape

- Strategy: `jwt` (cookie name explicitly `next-auth.session-token` for both prod and dev; flagged `httpOnly`, `sameSite:'lax'`, `secure:true`, `path:'/'`).
- The `jwt` callback enriches the token with `repId`, `role`, and `slug` by looking up `Rep` by email on every encode.
- The `session` callback exposes `repId`, `role`, `slug` on `session.user` (typed via `src/types/index.ts` module augmentation).
- `trustHost: true` is enabled.
- `debug: true` whenever `NODE_ENV !== 'production'`.

### 6.3 Roles

| Role | Source | Capabilities |
| --- | --- | --- |
| `rep` (default) | `Rep.role` | Can view their own card publicly; can sign in to `/edit` to update **only their own editable fields** via `PUT /api/reps`; can view their own analytics via `GET /api/analytics/stats`. |
| `admin` | `Rep.role` | All rep capabilities plus full CRUD on any Rep, mutation of CompanySettings, viewing global analytics, and triggering Google Sheets roster sync. |

### 6.4 Route protection

**Edge middleware** — `src/middleware.ts`:
- `matcher: ['/edit', '/admin/:path*']`
- For both, reads NextAuth JWT (`getToken({ cookieName: 'next-auth.session-token' })`). If absent → redirect `/login`.
- For `/admin/*`, additionally requires `token.role === 'admin'`; else redirect `/edit`.

**API-route guards** — Each admin API route imports `auth()` from `src/lib/auth.ts`, checks `session.user.repId`, and re-queries `Rep` to confirm `role === 'admin'`. On failure they respond `403 { error: 'Unauthorized' }`. The user-facing rep routes (`/api/reps`, `/api/analytics/stats`) require a session but no role check (`401 { error: 'Unauthorized' }` if missing). Public endpoints (vCard, QR, register, company GET, public analytics POST, `/[slug]`) have no auth.

**Client-side guard** — `/admin/page.tsx` additionally re-checks `useSession()` and pushes to `/login` or `/edit` based on role, providing UX feedback even before middleware can run.

### 6.5 Self-registration

`POST /api/register` is open (no session). It validates the inviteCode against `CompanySettings.inviteCode`, rejects duplicates, generates a slug, creates `Rep` + `User`, then redirects users to `/login` (UI flow) to receive a magic link.

---

## 7. API Routes

All routes live under `src/app/api/`. Path params are typed as `Promise<{ ... }>` per Next.js 14.2 behavior. Every JSON error response uses `{ error: string }` shape.

### 7.1 Auth

#### `GET|POST /api/auth/[...nextauth]`
- **File:** `src/app/api/auth/[...nextauth]/route.ts`
- **Auth:** N/A — this IS auth.
- **Behavior:** Re-exports `GET` and `POST` from the NextAuth `handlers` constructed in `src/lib/auth.ts`. Covers `/api/auth/signin`, `/api/auth/callback/email`, `/api/auth/signout`, `/api/auth/session`, `/api/auth/csrf`, `/api/auth/providers`, `/api/auth/verify-request`, etc.

### 7.2 Self-service rep endpoints

#### `POST /api/register`
- **File:** `src/app/api/register/route.ts`
- **Auth:** None (gated by invite code).
- **Request body:** `{ firstName: string, lastName: string, email: string, inviteCode: string }`
- **Response 200:** `{ success: true, slug: string }`
- **Response 400:** missing fields / invalid invite code / duplicate email.
- **Side effects:** Creates `Rep` (default `jobTitle: ''`, `phone: ''`) + upserts `User` so the magic-link flow can find a user record.

#### `GET /api/reps`
- **Auth:** Session required (any rep).
- **Response 200:** Entire `Rep` row for the signed-in user (`findUnique` by session email).
- **404:** If no Rep exists for `session.user.email`.

#### `PUT /api/reps`
- **Auth:** Session required.
- **Request body:** `{ firstName, lastName, jobTitle, phone, email, bio, profilePhoto, personalInstagram, personalLinkedIn, personalFacebook, personalTikTok, personalWebsite }` (all optional but server writes whatever is present). `bio` is `.substring(0, 200)`. Empty social strings collapse to `null`.
- **Response 200:** Updated `Rep` row.
- **Note:** Rep cannot change own `role`, `slug`, `isActive`, or `createdAt` via this endpoint.

#### `GET /api/analytics/stats`
- **Auth:** Session required.
- **Response 200:** `{ cardViews: number, contactTaps: number }` — all-time counts for the signed-in rep.

#### `POST /api/analytics`
- **Auth:** None (public — called from `CardClient` on every card open).
- **Request body:** `{ repId: string, eventType: 'card_view' | 'contact_tap' }`
- **Response 200:** `{ ok: true }` or `{ ok: true, skipped: true }` if `eventType === 'card_view'` and `isBot(userAgent)` matches (regex list in `src/lib/utils.ts`: `bot|crawl|spider|slurp|mediapartners|googlebot|bingbot|yandex|baidu|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|preview|fetch|curl|wget|python`).
- **400:** Missing fields, invalid eventType.
- **Side effects:** Captures `userAgent` and `referer` headers.

### 7.3 Public/utility endpoints

#### `GET /api/company`
- **Auth:** None.
- **Response 200:** Full `CompanySettings` row (`findFirst`). 404 if not seeded.

#### `GET /api/vcard/[slug]`
- **Auth:** None.
- **Behavior:** Looks up active `Rep` by slug. Reads `CompanySettings` for orgName/address/website. Extracts raw base64 if `profilePhoto` is a `data:image/jpeg;base64,...` URI. Calls `generateVCard()` (`src/lib/vcard.ts`) which produces vCard v3.0 with `BEGIN/END:VCARD`, `VERSION:3.0`, `N`, `FN`, `ORG`, `TITLE`, optional `TEL;TYPE=CELL`, optional `EMAIL`, structured `ADR;TYPE=WORK` (split on commas; `;state zip` parsed naively), `URL`, optional `PHOTO;ENCODING=b;TYPE=JPEG`.
- **Response 200:** Plain text body with headers `Content-Type: text/vcard`, `Content-Disposition: attachment; filename="<First>-<Last>.vcf"`.
- **404:** Slug not found or rep not active.

#### `GET /api/qrcode/[slug]`
- **Auth:** None.
- **Behavior:** PNG QR code (`width: 400`, `margin: 2`) encoding `${NEXTAUTH_URL || 'http://localhost:3000'}/${slug}`. Pixels white (`#FFFFFF`), background transparent (`#00000000`).
- **Response 200:** `image/png`, `Content-Disposition: attachment; filename="<slug>-qr.png"`, `Cache-Control: public, max-age=86400`.

#### `POST /api/upload`
- **Auth:** Session required.
- **Request body:** `multipart/form-data` with field `file` (image/*).
- **Behavior:** Reads file → `sharp(...).resize(500, 500, { fit: 'cover' }).jpeg({ quality: 85 })` → base64 data URI.
- **Response 200:** `{ url: 'data:image/jpeg;base64,...' }`. The caller is expected to PUT this into `Rep.profilePhoto`.
- **400:** No file or non-image content type.

### 7.4 Admin endpoints

All require admin role (`requireAdmin()` helper in each file — fetches session, re-queries `Rep`, requires `rep.role === 'admin'`).

#### `GET /api/admin/reps`
- **Response 200:** Array of all `Rep` rows ordered `createdAt desc`. Each row is augmented with `cardViews: number` and `contactTaps: number` (per-rep all-time counts). Also includes `_count.analyticsEvents`.
- **403:** Non-admin.

#### `POST /api/admin/reps`
- **Request body:** Same shape as the rep edit form (`firstName`, `lastName`, `email` required; `jobTitle`, `phone`, `bio`, `profilePhoto`, social URLs, `role` optional).
- **Behavior:** Generates slug via `generateSlug()`. Creates `Rep` and upserts `User`. Trims first/last/email. `bio` capped at 200 chars.
- **Response 201:** New `Rep`.
- **400:** Missing required fields / duplicate email.

#### `PUT /api/admin/reps/[id]`
- **Request body:** Partial Rep fields. Each is "if undefined → keep existing, else write". `isActive` and `role` are mutable here (this is how the admin UI toggles active/admin).
- **Response 200:** Updated `Rep`.
- **404:** Rep not found.

#### `DELETE /api/admin/reps/[id]`
- **Response 200:** `{ ok: true }`. Cascade-deletes `AnalyticsEvent`s via FK. Also `prisma.user.deleteMany({ where: { email: rep.email } })`.
- **400:** Cannot delete one's own account (`id === admin.id`).
- **404:** Rep not found.

#### `PUT /api/admin/settings`
- **Request body:** Any subset of `CompanySettings` fields. Same "if undefined keep / else overwrite" semantics; nullable fields use `!== undefined` check so an explicit `null` clears them.
- **Response 200:** Updated `CompanySettings`.
- **404:** No settings row.

#### `GET /api/admin/analytics?range=7|30|all`
- **Query:** `range` = `"7"` | `"30"` | `"all"` (default `"30"`). Numeric values become a `gte` filter relative to now.
- **Response 200:** `{ totalViews: number, totalTaps: number, perRep: Array<{ id, firstName, lastName, slug, views, taps }> }`. `perRep` is filtered to reps with at least one view or tap in range.

#### `POST /api/admin/sync-roster`
- **Behavior:** Imports `googleapis`. Reads `GOOGLE_SERVICE_ACCOUNT_KEY` (JSON string with `client_email` and `private_key`) and `GOOGLE_SHEET_ID`.
  1. `spreadsheets.get` to enumerate tabs. Skips tabs in `EXCLUDED_TABS = ['Appointment Setters']`.
  2. For each remaining tab, `spreadsheets.values.get(range = '<tab>')` (full tab).
  3. Locates columns by header (case-insensitive): `First Name`, `Last Name`, optional `Role`, `Phone`, `Work Email`, `Personal Email`.
  4. For each row, normalizes name (de-uppercases ALL-CAPS via title case), picks `workEmail || personalEmail`. Skips rows missing both names. Skips and counts rows missing email.
  5. Matches existing rep by case-insensitive email; falls back to first/last-name match. Updates name/email/jobTitle (= `Role` cell value or tab name)/phone/role/`isActive=true`.
  6. If no match, generates slug `firstname-lastname` (strips non-`a-z0-9-`). If slug is taken by a different rep, **skips** with an error message. Otherwise creates Rep + upserts `User`.
  7. Hardcoded `ADMIN_EMAILS = ['brack@spotonroof.com', 'jarrod@spotonroof.com', 'admin@spotonroof.com']` always get `role: 'admin'`.
  8. After all tabs processed, any active rep whose email isn't in the roster set and isn't in `ADMIN_EMAILS` is auto-deactivated (`isActive: false`).
- **Response 200:** `{ created: number, updated: number, skipped: number, deactivated: number, errors?: string[] }`.
- **500:** Missing env vars / Google API failure (with `details`).

---

## 8. Frontend

### 8.1 Routing (App Router)

| Path | Renderer | Auth | Description |
| --- | --- | --- | --- |
| `/` | server | none | Redirects to `/login`. |
| `/login` | client (Suspense) | none | Magic-link email form. Reads `?sent=true` for confirmation view. Links to `/register`. |
| `/register` | client | none | Self-registration form (POST `/api/register`). Success view links to `/login`. |
| `/post-login` | server | session | Role-aware redirect → `/admin` or `/edit`. |
| `/edit` | client | session (middleware) | Rep dashboard: own analytics, card URL + copy, QR download link, profile form (photo upload via crop modal, name/title/phone/email/bio/socials), read-only company info. |
| `/admin` | client | admin (middleware + client check) | Tabs: Reps / Settings / Analytics. Includes inline `RepForm` modal (create+edit) and `SettingsForm`. Sync Roster button posts to `/api/admin/sync-roster`. Tabular per-rep analytics with date range selector. |
| `/[slug]` | server + `CardClient` (client) | none | Public card. Renders inactive-notice or 404 as needed. Logs `card_view` on mount; "Save Contact" triggers `contact_tap` then navigates to `/api/vcard/[slug]`. Includes share button (Web Share API w/ clipboard fallback), maps modal (Apple Maps + Google Maps deep links), leave-a-review row, animated entrance sequence. |
| `/<anything-else>` | server | none | Falls back to `src/app/not-found.tsx` if no rep slug matches. |

### 8.2 Layouts and global UI

- `src/app/layout.tsx` — Root layout: loads Google Fonts (Outfit, DM Sans) via `next/font/google`, sets viewport (with `viewportFit:'cover'` for iOS safe area), wraps children in `<Providers>`. Default metadata title `SpotOn Card`.
- `src/app/providers.tsx` — `'use client'` wrapper around `next-auth/react`'s `SessionProvider`.
- Per-section layouts (`admin/layout.tsx`, `edit/layout.tsx`, `login/layout.tsx`) only set their `<title>` metadata; they render `{children}` as-is.
- `src/app/globals.css` — Tailwind directives + a global `html, body { background-color: #111111; color: #fff; }` rule.

### 8.3 State management

- No external state library. State is purely local React hooks (`useState`, `useEffect`, `useRef`) inside client pages.
- Auth state via `useSession()` from `next-auth/react`.
- Server-side data is fetched on the client via `fetch('/api/...')` calls (no SWR/React Query). The admin and edit pages do this on mount and reload after mutations by calling `loadData()` again.

### 8.4 Key components

- **`src/components/PhotoCropModal.tsx`** — Full-screen modal wrapping `react-easy-crop`. Reads selected `File` as data URL, exposes a zoom slider (1–3×), 1:1 crop area. On confirm, draws the cropped region onto a canvas and returns a JPEG `Blob` (`quality: 0.95`) via `onCropComplete`.
- **`src/app/[slug]/CardClient.tsx`** — Public card UI. Notable behaviors:
  - Staggered entrance animation (80 ms per section) with cleanup so no residual `transform` lingers after 1200 ms.
  - Auto-shrinks first/last name font size to prevent wrapping (uses `scrollWidth/clientWidth` and re-runs on resize).
  - Includes inline SVG social icons for Instagram, Facebook, LinkedIn, TikTok, plus a generic Website icon.
  - Maps modal lets users pick Apple Maps (`maps.apple.com/?address=`) or Google Maps (`google.com/maps/search/?api=1&query=`).
  - Share button uses `navigator.share` if available, else copies the URL to clipboard with a "Copied!" toast.
  - "Edit your card" footer link points to `/login`.

### 8.5 Styling

- Tailwind with custom palette in `tailwind.config.js`:
  - `spoton-blue: #00AEEF`
  - `spoton-blue-dark: #0088CC`
  - `card-bg: #111111`
  - `card-surface: #1a1a1a`
- Font families: `font-sans` → DM Sans (`var(--font-dm-sans)`), `font-outfit` → Outfit (`var(--font-outfit)`).
- Dark theme throughout — card pages are intentionally `#111111` to match physical NFC badges.

---

## 9. Deployment

### 9.1 Scripts (`package.json`)

| Script | Command |
| --- | --- |
| `dev` | `next dev` |
| `build` | `prisma generate && next build` |
| `start` | `prisma migrate deploy && next start` |
| `lint` | `next lint` |
| `postinstall` | `prisma generate` |

The `prisma.seed` config (`npx tsx prisma/seed.ts`) is run via `npx prisma db seed`.

### 9.2 Next.js config

- `output: "standalone"` — Next.js emits a self-contained `.next/standalone` server suitable for thin container deployments.
- `images.remotePatterns: [{ protocol: 'https', hostname: '**' }]` — allows `next/image` to optimize any HTTPS source (though the public card uses raw `<img>` tags, not `next/image`).

### 9.3 Build artifacts

- The Prisma client is regenerated at install (`postinstall`) and build, with `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` so it works on Railway's Alpine-based runners.
- `.npmrc` forces Node to use the OS trust store (`node-options=--use-openssl-ca`) so corporate certificates work for `googleapis`/`resend`.

### 9.4 Platform config

- **No Dockerfile, no `railway.toml`, no `Procfile`, no `nixpacks.toml` checked in.** Deployment relies on Railway's auto-detection of a Next.js project: install with `npm install`, build with `npm run build`, start with `npm start`. The server binds to `process.env.PORT` automatically (Next.js default). `prisma migrate deploy` runs as the first step of `npm start`, which requires migrations to exist in `prisma/migrations/` — **not present in the repo** (see §5.5).
- Railway managed Postgres provides `DATABASE_URL`.
- The `CLAUDE.md` document and the original product spec both name `card.spotonroof.com` as the production hostname; `NEXTAUTH_URL` should match.

### 9.5 Static assets

- `public/images/logo-white.png` is the only static asset. Referenced absolutely as `/images/logo-white.png` in every page header and, with the absolute URL `https://card.spotonroof.com/images/logo-white.png`, inside the magic-link email template.

---

## 10. Third-Party Integrations

| Service | Purpose | Touch points |
| --- | --- | --- |
| **Resend** (`resend` SDK) | Sends magic-link verification emails. | `src/lib/auth.ts` `getResend()` → `Resend(process.env.RESEND_API_KEY).emails.send({ from, to, subject, html })`. Lazily instantiated inside `sendVerificationRequest`; throws if `RESEND_API_KEY` is unset. |
| **Google Sheets API** (`googleapis`) | Admin roster sync from a company Google Sheet. | `src/app/api/admin/sync-roster/route.ts`. JWT auth via service account (`client_email`, `private_key` from `GOOGLE_SERVICE_ACCOUNT_KEY`); scope `https://www.googleapis.com/auth/spreadsheets.readonly`. Calls `sheets.spreadsheets.get` and `sheets.spreadsheets.values.get`. |
| **Railway** (hosting + Postgres) | Production runtime. | Connection via `DATABASE_URL`; no SDK usage in code. |
| **PostgreSQL** (`@prisma/client`) | Primary datastore. | All routes go through `src/lib/prisma.ts`. |
| **Apple Maps / Google Maps** (deep links) | Address opens in maps app from card page. | `src/app/[slug]/CardClient.tsx` modal. No API calls — pure URL handoffs. |
| **Web Share API + Clipboard API** | "Share Card" button on the public card. | `navigator.share` with `navigator.clipboard.writeText` fallback. |
| **NextAuth.js** (`next-auth@5.x beta` + `@auth/prisma-adapter`) | Auth and JWT sessions. | `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/middleware.ts`. |

No webhooks are configured. No outbound payment/CRM integrations. No telemetry/analytics SaaS — analytics are stored in-app.

---

## 11. Background Jobs

There are no scheduled jobs, cron tasks, queues, or workers in this repository. No `node-cron`, no Bull/BullMQ, no Inngest, no Railway cron config.

The closest thing to a "background" workflow is **`POST /api/admin/sync-roster`** — an on-demand admin-triggered job that pulls the Google Sheet roster, upserts reps, and deactivates anyone missing from the sheet. It runs in the request lifecycle of a single admin button press. There is no scheduled invocation; it must be triggered manually.

---

## 12. Known Issues / TODOs

The repository contains no `TODO`, `FIXME`, `XXX`, or `HACK` comments (`grep` confirmed empty in `src/`). The notable observations and risks worth flagging for maintenance:

1. **Missing Prisma migrations directory.** `npm start` runs `prisma migrate deploy`, but `prisma/migrations/` is not in the repo. Either migrations are stored outside source control or deploys depend on the database already matching the schema. Adding a schema field without first running `prisma migrate dev` locally and committing the migration will silently desync prod.
2. **CompanySettings is a singleton via `findFirst`.** No code enforces single-row semantics; if multiple rows somehow exist, `findFirst` ordering is non-deterministic and the public card / `/api/company` / `/api/admin/settings` could read different rows.
3. **`brandPrimaryColor` / `brandSecondaryColor` / `companyLogo` / `companyYouTube` are stored but not consumed.** The card UI hardcodes `#00AEEF`/`#0A7E8C` and `/images/logo-white.png`. YouTube is not in the social icon list. Treat these fields as informational until UI wires them up.
4. **Profile photos are stored as base64 data URIs in Postgres** (see `/api/upload`). This keeps the deploy stateless on Railway's ephemeral filesystem but bloats DB row size (~50–80 KB per photo) and slows row scans. Migration to object storage (S3/R2) would be a follow-up.
5. **Auth uses JWT strategy but Account/Session tables exist.** The Account/Session tables are required by PrismaAdapter for the magic-link flow even though sessions don't actually populate. They will accumulate verified-User rows but not Session rows.
6. **`isBot` is heuristic-only.** Several common UA strings (`preview`, `fetch`, `python`, `curl`) are filtered to keep card_view counts clean; legitimate previewers (LinkedIn, Slack) are also filtered (`linkedinbot`, `slackbot` not listed but `bot` catches it).
7. **`generateSlug()` race condition.** Two simultaneous registrations with the same name would both see "slug available" and one would fail with a unique-constraint error on insert (caught only by the generic 500 handler).
8. **`vcard.ts` address parsing is naive.** It splits on `,` and assumes exactly three parts (`street, city, state zip`). Multi-line addresses or international formats will produce malformed `ADR` lines.
9. **`session.user.email` is typed as `string` in the augmented Session type** (`src/types/index.ts`), but NextAuth marks it as optional. `src/app/api/reps/route.ts` passes it directly to `findUnique` without a guard.
10. **Hardcoded ADMIN_EMAILS in `sync-roster/route.ts`** (`brack@`, `jarrod@`, `admin@`) live in code, not in `CompanySettings`. Adding/removing an admin requires a code deploy.
11. **No tests.** The repo has no Jest, Vitest, Playwright, or other test config.
12. **No structured logging.** `console.log/error` are used throughout the sync-roster route and API handlers; nothing pipes to a log aggregator.
13. **`debug: true` in non-production for NextAuth** will log verbose info to server console in local dev — make sure that isn't on in any staging deploy.
14. **CardClient sets `secure: true` cookies even in HTTP local dev.** `src/lib/auth.ts` hardcodes `secure: true` on session/callback/csrf cookies; `http://localhost:3000` will not receive those cookies, so local NextAuth flows require HTTPS or a workaround.

---

*End of SPEC.md.*
