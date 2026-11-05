# ShelfLife Roadmap

From capstone to a product collectors pay for.

**Positioning:** one app for the whole retro shelf. Today's tools are single-format —
PriceCharting is games, Discogs is music, and VHS has nothing good. Thrift-store and
flea-market hunters buy all of it. ShelfLife treats every media type as a first-class
citizen and adds new ones as users ask for them.

What a collector needs, in priority order:

1. **"Do I already own this?"** — answered in two seconds, standing in a store.
2. **"What's it worth?"** — real market data, not guesses.
3. **"How complete is my set?"**
4. **Showing it off.**

---

## Decisions (2026-11-04)

| Topic | Decision |
|---|---|
| Spending | Free tiers and free APIs only until people sign up. Paid data sources and hosting get added once there's demand. |
| Name | Open to a rebrand with a more app-like name — see [Naming](#naming). |
| TypeScript | Migrate the React client gradually, starting in Phase 1. |
| Hosting | Build first, choose hosting along the way. Leaning toward **Supabase** for Postgres + file storage (free tier, scales up, and it's plain Postgres so EF Core works unchanged). The .NET API stays the backend and keeps ASP.NET Identity for login. |
| Media scope | **All media types equal** (games, music, movies at launch). The data model must make adding a new media type a config change, not a rewrite. |

---

## Phase 0 — Stabilize (≈1 week)

Fix what's broken in production today.

- [ ] Vercel rewrites `/api/*` to the API, so the browser sees one site. This fixes cross-site login cookies being dropped and the calls that had `/api/...` hardcoded.
- [ ] Vercel SPA fallback, so refreshing `/wishlist` or any route other than `/` stops returning 404.
- [ ] One API base URL on the client. Every request goes through `services/`, with no raw `fetch` calls in pages.
- [ ] Async all the way down in `AuthController` (no `.Wait()`). Use `UserManager` for password checks.
- [ ] A global exception handler that returns ProblemDetails, so server errors no longer send `ex.Message` to clients.
- [ ] Logout becomes `POST`. CORS is limited to configured origins instead of any `*.vercel.app` site.
- [ ] Remove the leftover JWT package and the localStorage `token` code.
- [ ] Connection-string parsing handles `postgres://` and URL-encoded passwords (Supabase/Render style).

## Phase 1 — Professional foundation (≈3–4 weeks)

**The big change: separate the catalog from the user's copy.**

- `CatalogEntry` (shared): title, media type, platform/format, release year, UPC, cover art,
  external IDs (IGDB, Discogs, TMDB), region.
- `OwnedCopy` (per user): condition, completeness, variant, grade, purchase price, date,
  store, shelf location, photos, notes.

This split is what makes barcode scanning, price tracking, set checklists and "who else
owns this" possible.

**Equal media, extensible by design.**

- `MediaType` (Games, Music, Movies, …) → `Platform/Format` (SNES, Vinyl, VHS, …).
- Each media type defines its own **attribute definitions**: games track cart/box/manual
  and region, vinyl tracks pressing, color variant and matrix, and VHS tracks clamshell vs.
  slipcase and rental copy. The values are stored as Postgres `jsonb` on the copy, so a new
  media type (comics, cassettes, Funko…) means adding definitions, not running a schema migration.

**Engineering**

- [ ] Service layer and DTOs. Controllers only translate HTTP.
- [ ] Request validation (DataAnnotations or FluentValidation).
- [ ] Server-side search, filtering, sorting and pagination.
- [ ] Rate limiting (the built-in .NET rate limiter), especially on external lookups.
- [ ] Auth hardening: email confirmation, password reset, lockout, account deletion, data export.
- [ ] Image upload to object storage (Supabase Storage), replacing pasted image URLs.
- [ ] Tests: xUnit + `WebApplicationFactory` integration tests against real Postgres
      (Testcontainers), and Vitest + React Testing Library on the client.
- [ ] GitHub Actions CI on every PR: build, test, lint.
- [ ] Client: TypeScript migration, TanStack Query for server state, an auth context with protected
      routes, React Hook Form + Zod, and breaking up the 800-line `CollectionPage`.
- [ ] Forms show errors and stay put when a save fails. Today Add Item navigates
      home even on a 400 (e.g. no condition picked), silently losing the item.
- [ ] A root `README.md` with local setup, architecture and screenshots.

## Phase 2 — Collector core (≈4 weeks)

- [ ] **Barcode scanning** with the phone camera → catalog match → add in one tap.
- [ ] **Metadata lookup**: games (IGDB), music (Discogs), movies (TMDB), with cover art auto-filled.
- [ ] **Hunt mode**: a fast "do I own this?" screen, installable PWA, works offline.
- [ ] **Hauls**: log a whole trip at once. Spending by month, store and media type.
- [ ] Tags, custom shelves, physical location ("Box 3"), loaned-out tracking.
- [ ] CSV import and export (export is always free — your data is yours).
- [ ] Dashboard: counts, spend, and breakdowns by media type and platform.

## Phase 3 — Value engine (≈4 weeks)

- [ ] Price snapshots stored in the database and refreshed by a background job, so we're not calling eBay on page views.
- [ ] Item price history and collection value over time vs. cost basis.
- [ ] Prices by condition tier: loose / CIB / sealed (games), VG+ / NM (vinyl), etc.
- [ ] Wishlist price alerts by email ("notify me under $X").
- [ ] Deal finder: listings below market, with affiliate links as a revenue source.
- [ ] Insurance report PDF.

## Phase 4 — Monetization & launch (≈3 weeks)

- [ ] Stripe Checkout, customer portal and webhooks. Feature limits are enforced on the **server**.
- [ ] Landing page, pricing page, onboarding, privacy policy, terms.
- [ ] Error tracking (Sentry), structured logs (Serilog), privacy-friendly analytics.
- [ ] Closed beta with collector communities.

## Phase 5 — Growth (post-launch)

Public showcase profiles, set-completion checklists ("34 / 714 NES"), trade and for-sale
lists, a native app wrapper (Capacitor), and new media types as users request them.

---

## Free vs. Pro (draft)

| | Free | Pro (~$4.99/mo or $39/yr) |
|---|---|---|
| Items | ~150 | Unlimited |
| Barcode scan + metadata | ✅ | ✅ |
| Wishlist, hauls, basic stats | ✅ | ✅ |
| CSV export | ✅ | ✅ |
| Collection value | Total only, monthly | Per item, daily, with history |
| Price alerts / deal finder | — | ✅ |
| Set checklists, insurance PDF, CSV import | — | ✅ |
| Photos per item | 1 | Unlimited |

Consider a limited **Founder lifetime** tier (~$99) at launch.

---

## Data sources — free first

| Need | Source | Status |
|---|---|---|
| Live listings / asking prices | eBay Browse API | In use. Free, but **active listings only** — not sold prices. |
| Game metadata + cover art | IGDB (Twitch dev account) | To verify: commercial-use terms. |
| Music metadata + barcodes | Discogs API | To verify: rate limits, attribution, marketplace stats access. |
| Movie metadata | TMDB | To verify: commercial-use terms. |
| Sold-price data | eBay Marketplace Insights, PriceCharting | **Later / paid** — revisit once there's user demand. |

Check every source's license before launch. Some free APIs prohibit commercial use or require attribution.

---

## Naming

The goal is something short and app-like that speaks to collectors across all media.
Candidates (availability not yet checked — domain, app stores, trademark):

- **Retrove** — retro + trove
- **Haulbook** — collector slang for a day's finds
- **Grailbox** — "holy grail" is the item every collector hunts
- **Lootshelf**
- **Stackd**

Shortlist 2–3, then check `.com`/`.app` domains, App Store/Play Store names and USPTO before committing.
