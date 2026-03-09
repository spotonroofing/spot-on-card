# SpotOnRoof Digital Business Card

Digital business card web app for SpotOnRoof roofing company sales reps. Each rep gets a public card page at card.spotonroof.com/firstname-lastname. Physical NFC ID badges tap to open the digital card. Core feature: vCard download button that adds the rep as a contact on iPhone/Android.

## Tech Stack

- Next.js 14+ App Router, TypeScript
- Prisma ORM + PostgreSQL on Railway
- NextAuth.js v5, magic link auth via Resend (no passwords)
- Tailwind CSS
- qrcode npm package for QR generation
- vcards-js or custom vCard v3.0 generation
- Deployed on Railway (Next.js app + managed Postgres)

## Key Commands

```
npm install
npm run dev
npx prisma migrate dev
npx prisma studio
npx prisma generate
npx prisma db seed
```

## Project Structure

- `prisma/schema.prisma` — DB schema (Rep, CompanySettings, AnalyticsEvent models)
- `src/app/[slug]/page.tsx` — Public card page (dynamic route, SSR)
- `src/app/login/page.tsx` — Magic link login
- `src/app/register/page.tsx` — Rep self-registration with invite code
- `src/app/edit/page.tsx` — Rep edits own card (authenticated)
- `src/app/admin/page.tsx` — Admin dashboard: manage reps, company settings, analytics
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth config
- `src/app/api/vcard/[slug]/route.ts` — vCard .vcf download endpoint
- `src/app/api/analytics/route.ts` — Log card_view and contact_tap events
- `src/lib/prisma.ts` — Prisma client singleton
- `src/lib/auth.ts` — NextAuth config and helpers
- `src/lib/vcard.ts` — vCard generation logic

## Coding Conventions

- App Router only, no Pages Router
- Server components by default; 'use client' only when needed for interactivity
- Prisma singleton pattern in src/lib/prisma.ts
- Slugs auto-generated: lowercase firstname-lastname, collisions append -2, -3, etc.
- Company-wide fields (address, logo, company socials) are admin-locked; reps only edit personal fields
- Two roles: 'rep' and 'admin'. Admin can fully create/edit any rep's card without the rep logging in
- Photo uploads resized/compressed server-side (max ~500KB for vCard embedding)
- Analytics: log card_view on page load (skip bots), contact_tap on Save Contact click

## Brand & Design

- Dark theme: black (#000000) background, matching physical NFC ID badges
- SpotOn Blue: #00AEEF (accent, titles, 'On' in logo)
- Teal gradient: #0A7E8C to #004E5A (Save Contact button, mirrors physical card bottom bar)
- White: names, icons, body text on dark bg
- Circular profile photo with white roof/arch SVG element behind it (signature brand element)
- Logo: 'Spot' white, 'On' blue, 'Roof' white — 'O' has house icon
- Typography: bold name (white), job title (blue), clean hierarchy
- Card page is mobile-first — almost all traffic comes from NFC taps on phones
- See SPEC.md for full design reference, layout order, and NFC card image description

## External Services

- Resend: transactional email for magic links. Auth via RESEND_API_KEY env var. Docs: resend.com/docs
- Railway: hosting + managed Postgres. DATABASE_URL env var. Docs: docs.railway.com
- See SPEC.md for full integration details

## Environment Variables

```
DATABASE_URL=            # Railway Postgres connection string
NEXTAUTH_SECRET=         # openssl rand -base64 32
NEXTAUTH_URL=            # https://card.spotonroof.com (http://localhost:3000 for dev)
RESEND_API_KEY=          # From resend.com dashboard
RESEND_FROM_EMAIL=       # e.g. noreply@spotonroof.com
```

## Current State

Status: All 6 phases complete. App builds successfully. All pages, API routes, middleware, and components are implemented.

- Phase 1 Foundation: Done (Next.js, Prisma, NextAuth, login)
- Phase 2 Registration & Profiles: Done (register, edit page, photo upload)
- Phase 3 Public Card Page: Done ([slug] page, vCard endpoint, QR code)
- Phase 4 Analytics: Done (event logging, bot filtering, stats API)
- Phase 5 Admin Dashboard: Done (rep CRUD, company settings, analytics overview)
- Phase 6 Polish: Done (middleware auth guards, OG meta tags, not-found page, SessionProvider)

## Known Gotchas

- vCard v3.0 only — v4.0 breaks on older Android devices
- vCard PHOTO must be base64-encoded JPEG, not a URL, for cross-platform contact import
- iOS Safari needs Content-Type: text/vcard AND Content-Disposition: attachment for the save-contact prompt
- NextAuth magic links expire in 24h by default — show a friendly 'resend' option on expiry
- Prisma: always run 'npx prisma generate' after schema changes before running the app
- Deactivated rep slugs should show 'card no longer active' not 404
