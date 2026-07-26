# Spot On Roof — Digital Business Card App

## Project Spec for Claude Code

---

## Overview

Build a web app that gives each sales rep at Spot On Roof their own digital business card at a unique URL (e.g., `card.spotonroof.com/firstname-lastname`). Reps can log in, fill out a simple form with their info, and instantly have a polished, mobile-first card page. The card's main purpose is to let prospects tap "Add to Contacts" and save the rep's full contact info (vCard) to their phone — iPhone or Android.

**Brand reference:** See the physical NFC ID card design (uploaded image). The digital card should take direct inspiration from this design. The NFC cards will link to the digital card — so they should feel like the same product.

**Company website:** `spotonroof.com`

---

## Brand & Design Reference (from NFC ID Card)

The physical ID card establishes the visual language. The digital business card should feel like the digital twin of this card.

### Brand Colors
| Color | Hex (approximate) | Usage |
|-------|-------------------|-------|
| **Black** | `#000000` | Primary background |
| **SpotOn Blue** | `#00AEEF` | "On" in logo, accent color, title text |
| **White** | `#FFFFFF` | Logo text, name text, icons |
| **Teal Gradient** | `#0A7E8C` → `#004E5A` | Bottom name/title bar gradient |

### Logo
- "Spot" in white, "On" in SpotOn Blue, "Roof" in white
- The "O" in "On" contains a small house/location-pin icon
- Logo sits at the top of the card on a black background

### Design Elements
- **Circular photo cutout** with a white arch/roof shape behind the headshot — this is a signature brand element
- **Teal-to-dark gradient bar** at the bottom displaying the rep's name (bold, white) and title (SpotOn Blue)
- **Black background** overall — the digital card should also use a dark theme
- **NFC icon** on the back of the physical card — the digital card can reference this with a "Tap to share" or similar motif
- **Clean, bold typography** — large name, clear hierarchy

### Digital Card Design Direction
The digital card page should:
- Use the **black/dark background** as the primary canvas (matching the ID card front)
- Feature the **SpotOnRoof logo** at the top
- Show the **rep's photo in a circular frame** with the signature white roof arch behind it
- Display **name in bold white** and **title in SpotOn Blue** — same hierarchy as the physical card
- Use the **teal gradient** for the "Save Contact" CTA button
- Keep the overall feel: bold, clean, premium, dark-themed
- Feel like a natural digital extension of the physical NFC card

### Company Info (from card back)
- **Address:** 130 E Wilson Bridge Rd Suite 300, Worthington, OH 43085
- **Domain:** spotonroof.com

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | **Next.js 14+ (App Router)** | React-based, SSR for fast card loading, API routes built in |
| Language | **TypeScript** | Type safety across the app |
| Database | **PostgreSQL** | Hosted on Railway |
| ORM | **Prisma** | Schema management, migrations, type-safe queries |
| Auth | **NextAuth.js (Auth.js v5)** | Magic link (email) authentication |
| Email | **Resend** | Transactional emails for magic links (free tier: 3k/month) |
| File Storage | **Railway volume or Cloudflare R2** | Rep profile photos |
| Hosting | **Railway** | Single deploy: Next.js app + Postgres |
| Styling | **Tailwind CSS** | Utility-first, easy to match brand |
| QR Codes | **qrcode** npm package | Generate QR code SVGs server-side |
| vCard | **vcards-js** or custom | Generate .vcf files for "Add to Contacts" |

---

## Domain & URL Structure

- **Card URLs:** `card.spotonroof.com/firstname-lastname`
  - Auto-generated from first + last name on profile creation
  - Lowercase, hyphenated (e.g., `john-smith`)
  - Handle collisions by appending a number (e.g., `john-smith-2`)
- **App URLs:**
  - `card.spotonroof.com/login` — magic link login
  - `card.spotonroof.com/register` — rep self-registration (with company code)
  - `card.spotonroof.com/edit` — rep edits their own card (auth required)
  - `card.spotonroof.com/admin` — admin dashboard (auth required, admin role)

---

## User Roles

### Rep
- Self-registers with email + a company invite code (prevents random signups)
- Receives magic link to log in (no passwords)
- Fills out a simple form to set up / edit their card
- Can view their own card's analytics (view count, contact tap count)

### Admin
- Everything a rep can do, plus:
- **Create and fully set up a rep's card** — fill in all fields (photo, name, title, phone, socials, bio) so the card is live without the rep ever needing to log in
- **Edit any rep's card** — full access to all fields on any rep's profile
- View/manage all reps (activate, deactivate, delete)
- Set company-wide defaults (locked fields)
- View analytics across all reps
- Set/reset the company invite code

---

## Data Model

### Company Settings (single record, admin-managed)

These fields are **locked** — reps cannot change them. They appear on every card.

| Field | Type | Example |
|-------|------|---------|
| `companyName` | string | "SpotOnRoof" |
| `companyAddress` | string | "130 E Wilson Bridge Rd Suite 300, Worthington, OH 43085" |
| `companyPhone` | string (optional) | "(555) 123-4567" |
| `companyWebsite` | string | "https://spotonroof.com" |
| `companyLogo` | file (image) | Logo image |
| `companyInstagram` | string (URL) | Instagram page URL |
| `companyFacebook` | string (URL) | Facebook page URL |
| `companyLinkedIn` | string (URL, optional) | LinkedIn page URL |
| `companyTikTok` | string (URL, optional) | TikTok page URL |
| `inviteCode` | string | Code reps use to self-register |
| `brandPrimaryColor` | string (hex) | Primary brand color |
| `brandSecondaryColor` | string (hex) | Secondary brand color |

### Rep Profile (per user)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | uuid | auto | Primary key |
| `email` | string | yes | Login identity, shown on card |
| `firstName` | string | yes | |
| `lastName` | string | yes | |
| `slug` | string | auto | URL slug: `firstname-lastname` |
| `jobTitle` | string | yes | e.g., "Sales Representative" |
| `phone` | string | yes | Rep's direct phone |
| `profilePhoto` | file (image) | yes | Headshot, displayed on card |
| `personalInstagram` | string (URL) | no | Rep's own Instagram (optional) |
| `personalLinkedIn` | string (URL) | no | Rep's own LinkedIn (optional) |
| `personalFacebook` | string (URL) | no | Rep's own Facebook (optional) |
| `personalTikTok` | string (URL) | no | Rep's own TikTok (optional) |
| `personalWebsite` | string (URL) | no | Rep's own website (optional) |
| `bio` | text | no | Short personal bio (optional) |
| `role` | enum | auto | `rep` or `admin` |
| `isActive` | boolean | auto | Default true; admin can deactivate |
| `createdAt` | datetime | auto | |
| `updatedAt` | datetime | auto | |

### Analytics Events

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key |
| `repId` | uuid | FK to rep profile |
| `eventType` | enum | `card_view` or `contact_tap` |
| `timestamp` | datetime | When it happened |
| `userAgent` | string (optional) | Browser/device info |
| `referrer` | string (optional) | Where they came from |

---

## Pages & Features

### 1. Public Card Page — `card.spotonroof.com/firstname-lastname`

This is the main deliverable. Mobile-first, fast-loading, branded.

**Layout (top to bottom, dark background, mirroring the physical NFC card):**

1. **SpotOnRoof logo** — centered at top on dark background (matching physical card)
2. **Profile photo** — large circular headshot with the **signature white roof arch** behind it (recreate the physical card's design element in CSS/SVG)
3. **Rep name** — bold, white, large (matching the physical card's bold name treatment)
4. **Job title** — SpotOn Blue (#00AEEF), directly below name (matching the physical card)
5. **⬇ "Save Contact" button** — large, prominent, teal gradient background (matching the physical card's bottom bar gradient), white text
   - Generates and downloads a `.vcf` (vCard) file
   - vCard includes: first name, last name, phone, email, job title, company name, company address, company website, profile photo (embedded as base64)
   - Works on both iOS and Android — tapping opens the native "Add Contact" screen with all fields pre-filled
6. **Contact info section** (white or light text on dark background):
   - Phone number (tappable `tel:` link)
   - Email (tappable `mailto:` link)
   - Company address (tappable link to Google Maps)
   - Company website link
7. **Social links section** — icon row (white icons on dark background)
   - Company socials (always shown): Instagram, Facebook, etc.
   - Rep's personal socials (if they added any)
8. **Personal bio** (if the rep added one) — short text block, light text
9. **QR code section** — small, at the bottom
   - QR code that links back to this card's URL (white on dark)
   - "Share my card" label
   - Useful for reps showing their phone to someone in person

**Behavior:**
- Log a `card_view` analytics event on every page load
- Log a `contact_tap` event when the "Save Contact" button is clicked
- Deactivated reps show a "This card is no longer active" message
- Page should be fast (SSR or static generation with ISR)
- Meta tags for social sharing (og:title, og:image using the rep's photo)

### 2. Login Page — `/login`

- Email input field
- "Send Magic Link" button
- User enters email → receives a login link via email → clicks link → logged in
- Clean, simple, branded
- Link to `/register` for new reps

### 3. Registration Page — `/register`

- Fields: first name, last name, email, company invite code
- Validates invite code against the one set in Company Settings
- On success: creates rep profile, sends magic link to log in
- Auto-generates the URL slug from first + last name

### 4. Rep Edit Page — `/edit` (authenticated)

A simple form. Not a dashboard — just a form with a live preview.

**Form fields:**
- Profile photo upload (with preview)
- First name, last name (pre-filled)
- Job title
- Phone number
- Email (pre-filled from auth, editable)
- Bio (optional, textarea, max ~200 chars)
- Personal social links (optional): Instagram, LinkedIn, Facebook, TikTok, website

**Also show on this page:**
- Live preview of their card (or a link to view it)
- Their card URL (copyable)
- Their QR code (downloadable as PNG)
- Simple analytics summary: total card views, total contact taps

**Company fields (display only, not editable by rep):**
- Show the locked company info (address, company socials, logo) as read-only so the rep knows what appears on their card

### 5. Admin Dashboard — `/admin` (authenticated, admin role only)

**Sections:**

**Rep Management:**
- Table of all reps: name, email, slug, status (active/inactive), card views, contact taps
- Actions per rep: view card, **edit card (full access to all rep fields)**, deactivate/reactivate, delete, make admin
- "Add New Rep" button (manually create a rep account **with all fields filled in** — admin can fully set up a rep's card without the rep ever logging in)
- **"Edit Rep" opens the same form as the rep's `/edit` page**, but the admin can edit any rep's profile — photo, name, title, phone, email, bio, personal socials, everything
- Admin-created reps should have a fully functional card immediately (no login required from the rep to have a working card)

**Company Settings:**
- Edit all company-wide fields (logo, address, socials, colors)
- Set/reset the invite code

**Analytics Overview:**
- Total card views across all reps
- Total contact taps across all reps
- Simple bar chart or table showing per-rep stats
- Date range filter (last 7 days, 30 days, all time)

---

## vCard (Save Contact) — Implementation Details

This is the most important feature. It must work flawlessly on iOS and Android.

**vCard format:** v3.0 (best cross-platform compatibility)

**Fields to include:**
```
BEGIN:VCARD
VERSION:3.0
N:LastName;FirstName;;;
FN:FirstName LastName
ORG:Spot On Roof
TITLE:Job Title
TEL;TYPE=CELL:+15551234567
EMAIL:rep@email.com
ADR;TYPE=WORK:;;123 Main St;City;ST;12345;US
URL:https://spotonroof.com
PHOTO;ENCODING=b;TYPE=JPEG:[base64 encoded photo]
END:VCARD
```

**Delivery method:**
- Generate the `.vcf` file server-side via an API route (`/api/vcard/[slug]`)
- "Save Contact" button triggers a download of the `.vcf` file
- Set response headers:
  - `Content-Type: text/vcard`
  - `Content-Disposition: attachment; filename="FirstName-LastName.vcf"`

**Testing priority:**
- iOS Safari — should prompt "Add to Contacts" natively
- Android Chrome — should download and open in Contacts
- Test with and without the embedded photo (photos increase file size significantly)

---

## QR Code — Implementation Details

- Generate an SVG QR code for each rep's card URL
- Display on the public card page (small, bottom section)
- Available as downloadable PNG on the rep's edit page
- Reps can screenshot or download to print on physical cards, email signatures, etc.

---

## Authentication Flow

**Magic Link (no passwords):**

1. Rep enters email on `/login`
2. Server checks if email exists in the database
3. If yes → sends a magic link email via Resend
4. Rep clicks link → NextAuth creates a session
5. Rep is redirected to `/edit`

**Registration:**

1. New rep goes to `/register`
2. Fills in name, email, invite code
3. Server validates invite code
4. Creates rep profile with auto-generated slug
5. Sends magic link to log in
6. Rep clicks link → logged in → redirected to `/edit` to finish setup

**Session:** Use NextAuth JWT strategy (no session database needed).

---

## Design & Branding

- **Dark theme** — black/near-black background matching the physical NFC ID card
- **Directly inspired by the physical card design** — the digital card is the "digital twin" of the NFC badge
- Mobile-first — the card page will be viewed almost exclusively on phones (tapped via NFC)
- Recreate the **circular photo with white roof arch** element from the physical card in CSS/SVG
- **SpotOnRoof logo** at the top, matching the physical card layout
- Name in **bold white**, title in **SpotOn Blue (#00AEEF)**
- "Save Contact" button uses the **teal gradient** from the physical card's bottom bar
- Social icons in white on the dark background
- The card should feel like a premium, polished product — not a generic template
- Smooth, subtle animations are fine (e.g., fade-in on load, slight scale on the photo) but don't overdo it
- The card page should load in under 2 seconds
- The NFC tap experience: someone taps the physical card → phone opens the digital card URL → they see the same branding → tap "Save Contact" → done

---

## Deployment — Railway

**Services to deploy:**
1. **Next.js app** — single Railway service
2. **PostgreSQL** — Railway managed Postgres addon

**Environment variables to configure:**
```
DATABASE_URL=           # Railway Postgres connection string
NEXTAUTH_SECRET=        # Random secret for JWT signing
NEXTAUTH_URL=           # https://card.spotonroof.com
RESEND_API_KEY=         # For sending magic link emails
RESEND_FROM_EMAIL=      # e.g., noreply@spotonroof.com
```

**Custom domain:** Point `card.spotonroof.com` to the Railway service via CNAME.

**Database migrations:** Run `npx prisma migrate deploy` on each deploy (add to Railway build command or start script).

---

## Project Structure (suggested)

```
spot-on-card/
├── prisma/
│   └── schema.prisma          # Database schema
├── public/
│   └── images/                # Static assets (logo fallback, etc.)
├── src/
│   ├── app/
│   │   ├── [slug]/
│   │   │   └── page.tsx       # Public card page (dynamic route)
│   │   ├── login/
│   │   │   └── page.tsx       # Login page
│   │   ├── register/
│   │   │   └── page.tsx       # Registration page
│   │   ├── edit/
│   │   │   └── page.tsx       # Rep edit form (protected)
│   │   ├── admin/
│   │   │   └── page.tsx       # Admin dashboard (protected)
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   │   └── route.ts   # NextAuth config
│   │   │   ├── vcard/[slug]/
│   │   │   │   └── route.ts   # vCard download endpoint
│   │   │   ├── analytics/
│   │   │   │   └── route.ts   # Log analytics events
│   │   │   ├── reps/
│   │   │   │   └── route.ts   # CRUD for rep profiles
│   │   │   ├── upload/
│   │   │   │   └── route.ts   # Photo upload endpoint
│   │   │   └── admin/
│   │   │       └── route.ts   # Admin operations
│   │   ├── layout.tsx
│   │   └── page.tsx           # Root redirect (→ login or marketing page)
│   ├── components/
│   │   ├── CardPreview.tsx     # Reusable card display component
│   │   ├── SocialIcons.tsx     # Social media icon row
│   │   ├── SaveContactButton.tsx
│   │   └── QRCode.tsx
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── auth.ts            # NextAuth config
│   │   ├── vcard.ts           # vCard generation logic
│   │   └── utils.ts           # Slug generation, helpers
│   └── types/
│       └── index.ts           # TypeScript types
├── .env.local
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## Build Order (for Claude Code)

Work through these phases in order. Each phase should be fully working before moving to the next.

### Phase 1: Foundation
1. Initialize Next.js 14+ project with TypeScript and Tailwind
2. Set up Prisma with PostgreSQL schema (all tables above)
3. Run initial migration
4. Set up NextAuth with magic link (email provider) via Resend
5. Create login page and test auth flow end to end

### Phase 2: Rep Registration & Profile
1. Build registration page with invite code validation
2. Auto-generate slug from name (handle collisions)
3. Build the rep edit form (all fields, photo upload)
4. Save profile data to database
5. Test: register → login → edit profile

### Phase 3: Public Card Page
1. Build the dynamic `[slug]` page with full card layout
2. Implement vCard generation and download endpoint
3. Test "Save Contact" on iOS Safari and Android Chrome
4. Add QR code generation and display
5. Style everything to match the brand

### Phase 4: Analytics
1. Create analytics event logging (card views, contact taps)
2. Add view tracking to card page (server-side, avoid double-counting bots)
3. Add contact tap tracking to Save Contact button
4. Show basic stats on the rep edit page

### Phase 5: Admin Dashboard
1. Build admin layout with rep table
2. Implement activate/deactivate/delete rep actions
3. Build company settings editor
4. Add analytics overview with per-rep stats
5. Protect admin routes (role check)

### Phase 6: Polish
1. Add Open Graph meta tags for social sharing
2. Optimize card page performance (ISR or on-demand revalidation)
3. Add loading states, error handling, and form validation
4. Mobile-test everything thoroughly
5. Set up Railway deployment and custom domain

---

## Edge Cases to Handle

- **Slug collisions:** If two "John Smith" reps exist, second gets `john-smith-2`
- **Deactivated reps:** Card page shows a clean "no longer active" message, not a 404
- **Missing photo:** Show a nice placeholder/initials avatar
- **Long names or titles:** Truncate gracefully on the card
- **Invalid invite code:** Clear error message on registration
- **Expired magic links:** Friendly error with a "resend" option
- **Large photos:** Resize/compress on upload (max ~500KB for vCard embedding)
- **Bot traffic:** Don't count obvious bot user agents in analytics

---

## Out of Scope (for v1)

- NFC programming (handled by the physical card vendor — they just encode the card URL)
- Custom themes per rep (everyone uses the company brand)
- Multi-company / white-label support
- SMS magic links
- Appointment booking / calendar integration
- Payment processing
- Native mobile app

---

## Claude Code — One-Shot Prompt Strategy

### How to use this spec

This spec is designed to be fed directly into Claude Code. For the best chance of a successful one-shot build, follow this approach:

### Step 1: Set up the project folder first (you do this manually)

```bash
mkdir spot-on-card && cd spot-on-card
git init
```

### Step 2: Create a CLAUDE.md file in the project root

Create a file called `CLAUDE.md` in the root of your project. This is Claude Code's memory file — it reads this on every task. Paste in:

```markdown
# SpotOnRoof Digital Business Card

## Project Overview
Digital business card web app for SpotOnRoof sales reps.
Each rep gets a URL: card.spotonroof.com/firstname-lastname
Physical NFC cards tap to open the digital card.

## Tech Stack
- Next.js 14+ (App Router) with TypeScript
- Prisma + PostgreSQL (Railway)
- NextAuth.js v5 with magic link auth (Resend for email)
- Tailwind CSS
- Deployed on Railway

## Key Commands
- `npm run dev` — start dev server
- `npx prisma migrate dev` — run migrations
- `npx prisma studio` — browse database
- `npx prisma generate` — regenerate client after schema changes

## Architecture Decisions
- App Router (not Pages Router)
- Server components by default, "use client" only when needed
- Prisma singleton in src/lib/prisma.ts
- All API routes in src/app/api/
- Auth config in src/lib/auth.ts

## Brand
- Dark theme (black background)
- SpotOn Blue: #00AEEF
- Teal gradient: #0A7E8C → #004E5A
- White text for names, blue for titles
- Circular photo with white roof arch behind it
```

### Step 3: Feed the spec to Claude Code

Open Claude Code in the project directory and use this prompt:

```
Read the file @spot-on-digital-card-spec.md — this is the full spec for the app.

Build the entire app end to end following the spec exactly. Work through the Build Order phases in sequence. After each phase, make sure the app runs without errors before moving on.

Start with Phase 1 (Foundation): initialize the Next.js project, set up Prisma schema, configure NextAuth with magic link auth. Then continue through all 6 phases.

For the public card page design, match the physical NFC card design described in the Brand & Design Reference section — dark background, circular photo with white roof arch, bold white name, blue title, teal gradient Save Contact button.

Use placeholder/seed data so I can see a working card immediately in dev.
```

### Step 4: Upload the ID card image

After Claude Code has the project scaffolded, share the NFC ID card image with it and say:

```
Here's our physical NFC card design. The digital card page should visually match this — same colors, same photo treatment with the circular cutout and white roof arch, same typography hierarchy. Refine the card page to match this closely.
```

### Tips for one-shot success

1. **Don't interrupt** — let Claude Code work through all 6 phases. It will make mistakes and self-correct. Interrupting resets its context.

2. **Seed data matters** — the prompt asks for placeholder data so you can see a working card in dev without needing to register. This lets you verify the design immediately.

3. **If it stalls or errors out**, give it a focused follow-up:
   ```
   The app has an error: [paste error]. Fix this and continue from where you left off.
   ```

4. **Environment variables** — you'll need to set these up in a `.env.local` file before the app will fully work:
   ```
   DATABASE_URL=postgresql://...        # Your Railway Postgres URL
   NEXTAUTH_SECRET=your-random-secret   # Run: openssl rand -base64 32
   NEXTAUTH_URL=http://localhost:3000   # For dev
   RESEND_API_KEY=re_...                # From resend.com
   RESEND_FROM_EMAIL=noreply@spotonroof.com
   ```

5. **Railway Postgres first** — spin up the Railway Postgres instance before starting so you have a real DATABASE_URL. Claude Code can run migrations against it directly.

6. **One spec file, one prompt** — don't break this into multiple conversations. The whole point of a detailed spec is that Claude Code has everything it needs in one shot.
