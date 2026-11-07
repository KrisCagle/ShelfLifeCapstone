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

- [x] Vercel rewrites `/api/*` to the API, so the browser sees one site. This fixes cross-site login cookies being dropped and the calls that had `/api/...` hardcoded.
- [x] Vercel SPA fallback, so refreshing `/wishlist` or any route other than `/` stops returning 404.
- [x] One API base URL on the client. Every request goes through `services/`, with no raw `fetch` calls in pages.
- [x] Async all the way down in `AuthController` (no `.Wait()`). Use `UserManager` for password checks.
- [x] A global exception handler that returns ProblemDetails, so server errors no longer send `ex.Message` to clients.
- [x] Logout becomes `POST`. CORS is limited to configured origins instead of any `*.vercel.app` site.
- [x] Remove the leftover JWT package and the localStorage `token` code.
- [x] Connection-string parsing handles `postgres://` and URL-encoded passwords (Supabase/Render style).

## Phase 1 — Professional foundation (≈3–4 weeks)

**The big change: separate the catalog from the user's copy.** ✅ Done (Nov 2026): `CatalogEntries` +
`Items` as owned copies, per-media attributes in `jsonb`. Shared entries are only ever created from
data the server fetched from the source itself; hand-typed titles stay private to their author.

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

- [~] Service layer and DTOs. Items, wishlist and catalog use DTOs and a `CatalogService`;
      the remaining controllers still return entities.
- [~] Request validation: DataAnnotations on the item, wishlist, catalog and news DTOs.
- [ ] Server-side search, filtering, sorting and pagination.
- [ ] Rate limiting (the built-in .NET rate limiter), especially on external lookups.
- [ ] Auth hardening: email confirmation, password reset, lockout, account deletion, data export.
- [ ] Image upload to object storage (Supabase Storage), replacing pasted image URLs.
- [ ] Tests: xUnit + `WebApplicationFactory` integration tests against real Postgres
      (Testcontainers), and Vitest + React Testing Library on the client.
- [ ] GitHub Actions CI on every PR: build, test, lint.
- [x] Client: TypeScript, TanStack Query for server state, an auth context with protected
      routes, and the 800-line `CollectionPage` broken into components (UI rework, Nov 2026).
      Form validation is hand-rolled for now; React Hook Form + Zod can come with bigger forms.
- [x] Forms show errors and stay put when a save fails.
- [ ] A root `README.md` with local setup, architecture and screenshots.

## UI rework (done, Nov 2026)

Pulled forward because a polished front end matters before anything goes live.

- [x] Design system: Tailwind tokens (neon palette, platform colors, fonts), glass panels,
      shared Button / Field / Modal / Skeleton / Toast components, generated wood-grain wall.
- [x] Landing page for everyone: neon hero with a 3D shelf, live news ticker, collector news
      (RSS headlines + pinned ShelfLife posts), features and how-it-works for visitors, and a
      welcome-back snapshot (stats, format breakdown, top hunts) for signed-in users.
- [x] News API: `/api/news/headlines` aggregates the RSS/Atom feeds in `appsettings.json`
      (cached 30 min, one shared refresh); `/api/news/posts` with an admin-only editor.
- [x] Collection: URL-synced search (`/` shortcut), filters and sort; shelf / grid / list views;
      responsive shelves (2 per shelf on phones); tilting case cards with generated box art.
- [x] Item pages: live preview while editing, genres suggested by format, delete with Undo,
      price-range bar with gain/loss vs. what you paid.
- [x] Wishlist: priority filters, inline price check, "Found it" moves a hunt to the shelf.
- [x] 404 page, skip link, focus rings, reduced-motion support, route-level code splitting.

## Phase 2 — Collector core (≈4 weeks)

- [x] **Barcode scanning** with the phone camera (native BarcodeDetector, ZXing WebAssembly
      fallback, photo upload and typed digits as backups) → catalog match → add in one tap.
- [x] **Metadata lookup** with cover art: music via MusicBrainz + Cover Art Archive (free, no key,
      live now); games via IGDB and movies via TMDB once their free keys are set
      (`Igdb:ClientId`/`Igdb:ClientSecret`, `Tmdb:ApiKey`); any barcode via UPCitemdb's trial tier.
- [~] **Hunt mode**: "Scan" in the nav answers *you own this / it's on your wishlist / new to you*
      in one scan. Still to do: installable PWA and offline use.
- [x] **Haul mode**: from any scan result, keep the camera open and scan a stack, or read several
  barcodes from one photo. Review them together, share store and date, split the total, and save
  all or nothing. The batch is kept on the device until it's added.
- [x] **Photos of your copy**: take or choose a photo on any title or haul row. It's shrunk in the
  browser, which also strips its location data, and stored behind an interface so hosting can move
  it to object storage.
- [x] **Books**: ISBN scanning and title search through Open Library (free, no key), collector
  fields, and a Books tab. Collection tabs now split every media type into its own shelf, and
  titles carry a description from their source. Open Library asks not to be a high-traffic
  commercial backend, so move to its monthly data dumps before that matters.
- [x] **Comics, stage one**: issue search through the Grand Comics Database ("Saga 12"), with
  Direct and Newsstand editions, collector fields, and a Comics tab. Covers come from the
  user's own photo, because GCD's aren't licensed for reuse.
- [ ] **Comics, stage two**: exact-issue scanning. The main barcode only names the series; the
  5-digit add-on beside it gives issue, variant and printing, and the scanner ignores add-ons
  today. Metron has the UPC lookup, but asks each user of a multi-user app to bring their own
  account, so this needs a conversation with them first.
- [ ] **Before launch**: comic search can't stay on GCD's anonymous API. Testing used up its limit
  within a few dozen requests, and all users would share that allowance from one server. Use a
  GCD account or import its data downloads, and confirm its terms for an app like this and what
  share-alike means for the shared catalog.
- [x] **Separate book and comic collections**: each has its own page under Collection, kept off the
  main shelf, and adding from one offers only its formats. Books stand spine-out on a bookshelf.
- [ ] **Haul history**: keep each haul as a record, with spending by month, store and media type.
- [ ] Tags, custom shelves, physical location ("Box 3"), loaned-out tracking.
- [ ] CSV import and export (export is always free — your data is yours).
- [ ] Dashboard: counts, spend, and breakdowns by media type and platform.

### Ideas backlog (UI/UX)

Candidates for the next rounds, roughly in order of payoff:

- **Shelf photo reading**: an AI vision pass that reads titles off spines, as a possible Pro feature.
  It has a per-photo API cost, so try it once there are paying users.
- **Stats page**: spending over time, by store and by format; most valuable items; biggest gains.
- **Command palette (Ctrl+K)**: jump to any title, add, scan, or switch views from the keyboard.
- **Onboarding checklist** for new accounts: add 3 titles, scan a barcode, add a hunt, check a price.
- **Bulk select**: move to a shelf/location, change condition, delete several at once.
- **Shelf locations**: "Box 3", "Living room shelf A", and a filter for them.
- **Shareable showcase**: a read-only public link to a shelf or the whole collection.
- **Trade list**: mark duplicates or spare copies as available for trade.
- **Keyboard shortcut help** (`?`) and more shortcuts (`n` new, `s` scan).
- **Theme variants** (CRT green, synthwave pink) — a natural Pro perk.

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
