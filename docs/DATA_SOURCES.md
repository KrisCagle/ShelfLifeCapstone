# Data sources: switching to free sources a paid app may use

ShelfLife will have a paid tier, which makes it a commercial product. Several of the APIs it
uses today don't allow that, or only allow it with a paid agreement. This plan moves the app
onto sources that are free **and** allow a paid app, so nothing breaks the day Pro launches.

**Ground rule:** no workarounds. That means no scraping against a site's terms, no extra keys
or user agents to dodge limits, and no hiding commercial use. A key can be revoked overnight,
which would break the app for paying customers, and it's a legal risk for the business. Every
step below is either allowed outright or asks the provider first.

*Checked November 2026. This is a reading of each provider's published terms, not legal advice.
Get written confirmation for anything the business depends on.*

---

## Where each source stands

| Source | Used for | In a paid app | Plan |
|---|---|---|---|
| MusicBrainz | Music titles, artists, barcodes | ✅ Core data is CC0 (public domain). Commercial users are asked to become supporters. | Keep. Join the supporter program once there's revenue. |
| Open Library | Books | ✅ Allowed, but not as a high-traffic backend | Keep. Move to its free monthly data dumps as traffic grows. |
| Grand Comics Database | Comics | ✅ CC BY-SA 4.0, with credit and share-alike | ✅ Imported from its data download into our own tables (Phase B). Credit in the footer and a link to GCD for each record. |
| TMDB | Movies | ❌ Commercial use needs a written agreement, possibly with fees. Data can't be cached for more than 6 months. | Replace with Wikidata (Phase C), and ask TMDB for a price. |
| IGDB (Twitch) | Games | ⚠️ Unclear. Sources conflict, and newer ones say a partnership is needed. | Replace with Wikidata (Phase C), and ask Twitch. |
| UPCitemdb | Barcode lookups | ⚠️ Free trial is 100 lookups a day, shared by every user. Commercial terms weren't found. Paid plan is $99/month. | Keep as a fallback behind ShelfLife's own barcode memory (Phase A). |
| eBay: value estimate | Est. value | ❌ §9.5 bans using eBay content to "suggest or model prices". §8.1(d) needs written permission for figures like average selling price. **This applies whether or not we charge.** | Remove before going public (Phase A). |
| eBay: barcode fallback | Titles for unknown barcodes | ⚠️ Using eBay as a product database is outside what the license describes | Turn off for the public app (Phase A). |
| Cover Art Archive, TMDB/IGDB images, Open Library covers | Cover art | ⚠️ Publishers own the artwork. No source licenses it to us. | Owner photos and generated case art by default. Decision below. |
| Wikidata | *(new)* Games and movies | ✅ CC0, so commercial use is fine | Add (Phase C). |
| RSS news feeds | Home page headlines | ✅ Headlines link out to the publisher | Keep linking out, and never copy full articles. |

Wikidata tested on real titles: Star Wars Outlaws, Chakan (1992), Mario Kart World, Ready 2
Rumble Round 2, Hocus Pocus and Titan A.E. all came back with year, platforms and
publisher/studio. It has no barcodes and no usable cover art.

---

## Phase A: before the app goes public ✅ done

Small changes, and each one removes a real risk.

1. **Replace the value estimate.** Remove the eBay-based estimate and the price check.
   - **Current eBay listings for a title:** shown as listed, kept no more than 6 hours old, each
     linking to eBay. Helping people buy is what eBay's Browse API is for. Through the eBay
     Partner Network those links can earn ShelfLife a commission. *Confirm with eBay before
     launch.*
   - **"What collectors paid":** ShelfLife's own data, the purchase prices users enter. It shows a
     range only once at least 5 different users have logged that title, so no one's price can be
     picked out. Nobody can revoke it, and no other app has it.
2. **Barcode memory.** When someone scans a barcode and saves a title from a shared catalog
   entry, store barcode → entry, not who scanned it. The next scan of that barcode is answered
   instantly, with no outside call. UPCitemdb becomes a fallback that's needed less as people
   scan.
3. **Turn off the eBay barcode fallback** for the public app (a config switch), and keep it for
   local testing.
4. **Identify the app properly.** Open Library and Wikimedia want a contact in the User-Agent
   header, and Open Library allows 3× the requests to identified apps. *Needs a project contact
   address from Kris.*

## Phase B: our own comic database ✅ done

1. ✅ Kris downloaded the GCD data dump (SQLite, 6.5 GB unzipped) to his home computer.
2. ✅ `tools/GcdImport` loads only what the app needs into `ComicSeries` and `ComicIssues`:
   series name, start year, publisher, language, issue number, variant, title, year, barcode
   and ISBN. Ids are GCD's own, so every record links back to comics.org.
   - Run it with `dotnet run --project tools/GcdImport -- <path-to-dump.db>`. Add
     `--languages en,es` to limit languages, or `--dry-run` to count without writing.
   - It replaces both tables in one transaction, so a failed import leaves the old data.
   - Barcodes printed on more than 3 different series are placeholders, not real codes, and
     are dropped (166 of them).
   - Result: 231,333 series, 2,472,305 issues, 433,100 barcodes and 237,900 ISBNs, using about
     406 MB of the database. That fits Neon's free 1 GB.
3. ✅ Comic search reads our own copy: no rate limit and no outside call, in about 10–30 ms.
   Names match word by word ignoring punctuation, so "batman/superman" finds "Batman /
   Superman". An exact name ranks first, then names starting with the search, then English
   editions, then the longest runs.
4. ✅ Scanning: a full barcode with its 5-digit add-on finds the exact issue. The main UPC alone
   lists the series' issues, newest first. An ISBN finds the trade paperback.
5. ✅ Licence (CC BY-SA 4.0): the site footer credits GCD, each search result has a "GCD" link
   to its issue page, and an item's page credits GCD with a link. GCD's cover scans aren't
   part of the licence and aren't imported.
6. ⏳ Re-import on a schedule (GCD publishes a new dump regularly). For now it's a manual run.
7. ⏳ The barcode scanner reads only the main code, so scans list the series instead of the
   exact issue. Reading the add-on needs a scanner library that supports EAN-5.

## Phase C: Wikidata for games and movies

1. ✅ A Wikidata provider for title search, year, platform, publisher or studio, and a short
   description. Game results rank titles on the chosen console first, and series or franchise
   items are skipped.
2. ✅ Providers are chosen per media type in config, `Metadata:Providers:Games` and
   `Metadata:Providers:Movies`. Both default to `wikidata`, and setting `igdb` or `tmdb` brings
   those back for local testing, or once there's a written OK.
3. ⏳ Re-match existing IGDB/TMDB catalog entries to Wikidata by title and year. TMDB data can't
   be kept more than 6 months anyway. **Waiting on the cover-art decision below**, because
   switching an entry's source also means deciding what happens to its IGDB/TMDB cover.
4. Follow Wikimedia's API etiquette: a descriptive User-Agent with contact info, one request at a
   time, caching, and backing off when throttled.

## Phase D: ask for permission (cheap, and could improve things)

Short emails from Kris. Answers decide whether a paid source is worth it.

- **TMDB:** commercial license price for a small app. Better movie data and posters.
- **Twitch / IGDB:** written confirmation of commercial use. Better game data and covers.
- **MetaBrainz:** which supporter tier fits a small app.
- **GCD:** confirm terms for this use, and what share-alike means for our shared catalog.
- **eBay:** confirm the listings-and-affiliate design in Phase A.

## Phase E: free hosting

| Piece | Service | Notes |
|---|---|---|
| Website | Cloudflare Pages | Vercel's free plan bans commercial use. Third-party comparisons say Cloudflare allows it, so confirm in its terms. |
| API | Render free web service | Sleeps after 15 minutes idle, so the first visit takes about a minute. Upgrading to $7/month removes the sleep. |
| Database | Neon free (1 GB) | Render's free database is deleted after 30 days. Supabase's free 500 MB is too small with comics and pauses after a week idle. |
| Photos | Cloudflare R2 (10 GB free, no egress fees) | Render wipes its disk when it sleeps. |

---

## Decision for Kris: cover art

No free source licenses cover art. Options:

1. **Owner photos and generated case art only.** Safest, but less polished until people add photos.
2. **Also show covers from Open Library and the Cover Art Archive**, loaded from their own
   servers. Common practice in collector apps, but not licensed.
3. **License covers** with TMDB/IGDB through Phase D.

The code already supports all three: a user's photo always replaces the stock cover.

---

## What changes when there's revenue

- Join the MetaBrainz supporter program.
- Render $7/month, ending the slow first load.
- If Phase D answers are reasonable, add TMDB/IGDB back for richer data and covers.
- UPCitemdb's paid plan if barcode memory isn't covering enough scans yet.
