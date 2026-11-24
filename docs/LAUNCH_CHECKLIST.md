# Launch checklist

What has to be true before ShelfLife goes public, and before it takes money. It comes from a
code audit in November 2026, with the main findings spot-checked against the code. Data-source
licensing is covered separately in [DATA_SOURCES.md](DATA_SOURCES.md).

**Who:** 🤖 = code change Claude can make · 👤 = needs Kris (accounts, decisions, sign-offs)

---

## 1. Before anyone outside can sign up

These protect real people's accounts and data.

- [x] 🤖 **Brute-force protection on login.** Five wrong passwords in a row lock an account for
  15 minutes; asking for the password to delete an account counts too. Per-address limits: 10
  sign-ins per 5 minutes and 5 sign-ups an hour. **On deploy:** set `ForwardedHeaders__Enabled=true`
  so limits see the visitor's address rather than the proxy's, and set
  `ForwardedHeaders__ForwardLimit` to the number of proxies in front of the API (1 when the
  browser reaches the API host directly; 2 when the website's host forwards `/api` to it).
- [x] 🤖 **Stronger passwords.** At least 10 characters for new accounts and password changes.
- [x] 🤖 **Secure login cookie.** Sent over HTTPS only outside development, plus HSTS. One
  lifetime: two weeks, renewed while the app is in use.
- [x] 🤖 **Keep people signed in across restarts.** Sign-in keys are stored in the
  `DataProtectionKeys` table. Switching over signs everyone out once.
- [x] 🤖 **Patch vulnerable packages.** EF Core, Identity and the rest are on 8.0.34, and Npgsql
  on 8.0.11. `dotnet list package --vulnerable --include-transitive` reports none.
- [ ] 🤖 **Password reset and email verification.** Neither exists, so a user who forgets their
  password is locked out for good.
- [x] 🤖 **Delete account and export data.** The Account page (menu → Account) downloads a zip
  of the person's details, collection, wishlist and photos. Deleting asks for the password,
  then removes the account, collection, wishlist, hand-typed titles and photo files.
- [ ] 👤 **Pick an email sender** (a free tier is fine). Password reset and email
  verification need it.
- [ ] 🤖👤 **Privacy policy and terms.** Neither page exists. The app collects email, name,
  purchase prices, stores and photos. Claude drafts them from what the code actually does;
  **Kris reviews, ideally with a lawyer.** Link them from the footer and sign-up, and state a
  minimum age (13+).
- [ ] 🤖👤 **Photos off the local disk.** Free hosting wipes its disk, so photos would vanish.
  Move to Cloudflare R2 behind `IPhotoStorage`, add a per-user storage cap, and clean up
  uploads that never got attached to a title. Kris creates the R2 account.

## 2. Before taking money

- [ ] 🤖 **Make "what collectors paid" resistant to fake accounts.** With free, unverified sign-up,
  one person with four fake accounts could pick out the fifth person's exact price. Count only
  verified accounts of a minimum age, and round the published figures.
- [ ] 🤖 **Barcode memory needs agreement.** One account can save any barcode against any title,
  and everyone else's scans then trust it. Require two or more different users to agree.
- [ ] 🤖 **Rate-limit lookups that spend shared outside quota:** search, barcode lookup and eBay
  listings. One account could use up UPCitemdb's 100-a-day trial for everyone.
- [ ] 🤖 **Admin access by verified email or a role.** Admin status comes from an email list,
  so whoever first registers a listed address, verified or not, becomes admin.
- [ ] 🤖 **Verify the database's certificate.** The connection string trusts any certificate.
- [ ] 🤖 **Security headers.** Add a content security policy, frame options, referrer policy and
  HSTS to the site and the API.
- [ ] 🤖 **Sign-up hygiene:** length limits on name fields, and a generic message instead of
  revealing which emails already have an account.
- [ ] 🤖 **Deploy basics:** run migrations as part of the deploy, add a `/health` endpoint,
  error tracking (Sentry has a free tier) and scheduled backups.
- [ ] 👤 **Hosting that allows commercial use.** Vercel's free plan doesn't, so move to
  Cloudflare Pages or a paid Vercel plan. Neon for the database. Kris creates the accounts.
- [ ] 🤖 **Run the Wikidata re-match on the production database**
  (`/api/admin/catalog/rematch`: preview, then apply).
- [ ] 👤 **Rotate the Twitch client secret** that appeared in logs earlier, or delete the app if
  IGDB is no longer used.
- [ ] 👤 **Data-source asks** from DATA_SOURCES.md, Phase D (TMDB, Twitch, MetaBrainz, GCD,
  eBay), plus a project contact email for the app's User-Agent.

## 3. Later

- [ ] 🤖 Record an owner for each photo, and strip photo metadata on the server too, since
  today the browser does it.
- [ ] 🤖 Log barcodes and searches at Debug level in production.
- [ ] 🤖 `npm audit fix` for a react-router advisory. It affects a mode the app doesn't use.
- [ ] 👤 Change the old local Postgres password that sits in early git history, anywhere it's
  reused.
- [ ] 👤 Cover-art decision for Open Library and Cover Art Archive covers (DATA_SOURCES.md).
- No cookie banner is needed today, since there's only a login cookie and local preferences.
  Mention them in the privacy policy, and revisit if analytics are added.
