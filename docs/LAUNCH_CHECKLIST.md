# Launch checklist

What has to be true before ShelfLife goes public, and before it takes money. It comes from a
code audit in November 2026, with the main findings spot-checked against the code. Data-source
licensing is covered separately in [DATA_SOURCES.md](DATA_SOURCES.md).

**Who:** 🤖 = code change Claude can make · 👤 = needs Kris (accounts, decisions, sign-offs)

---

## 1. Before anyone outside can sign up

These protect real people's accounts and data.

- [ ] 🤖 **Brute-force protection on login.** Login checks the password with a call that never
  counts failed attempts, and only photo uploads are rate-limited. Switch to Identity lockout
  (`CheckPasswordSignInAsync(..., lockoutOnFailure: true)`), add per-IP limits on login and
  register, and read the real client IP from the forwarded headers set by the hosting proxy.
- [ ] 🤖 **Stronger passwords.** The minimum is 6 characters. Raise it to 10 or more.
- [ ] 🤖 **Secure login cookie.** The cookie's Secure flag isn't set, so behind a proxy it can
  go out over plain HTTP. Set `SecurePolicy = Always` and add HSTS.
- [ ] 🤖 **Keep people signed in across restarts.** Sign-in keys live in the container, so every
  deploy, and every free-tier sleep, signs everyone out. Store them in the database.
- [ ] 🤖 **Patch vulnerable packages.** Indirect dependencies resolve to Npgsql,
  System.Text.Json and Microsoft.Extensions.Caching.Memory 8.0.0, each with a high-severity
  advisory. Move to the latest 8.0.x patches.
- [ ] 🤖 **Password reset and email verification.** Neither exists, so a user who forgets their
  password is locked out for good.
- [ ] 🤖👤 **Delete account and export data.** A user can't delete their account or download
  their data. Deletion must also remove their photo files and private titles, which the
  database alone wouldn't. Kris picks an email sender (a free tier is fine), which this item
  and the one above both need.
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
- [ ] 🤖 One deliberate login-cookie lifetime (today it's 7 days in one setting and 24 hours in
  another).
- [ ] 👤 Change the old local Postgres password that sits in early git history, anywhere it's
  reused.
- [ ] 👤 Cover-art decision for Open Library and Cover Art Archive covers (DATA_SOURCES.md).
- No cookie banner is needed today, since there's only a login cookie and local preferences.
  Mention them in the privacy policy, and revisit if analytics are added.
