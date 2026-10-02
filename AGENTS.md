# Architecture rules

- Subscription activation and creator earnings go only through the `activate_subscription` database function (service role). Why: one idempotent step, so earnings are recorded once whichever payment path runs first.
- Only `review_status = 'approved'` recipes are exposed by `public_videos` and the recipe access functions. Why: AI-extracted recipes need human review before going public.
- Recipe processing (`process-video`) only accepts the service role or an admin. Scheduled processing authenticates with a private internal key held in the database. Why: AI spend must not be triggerable by the public.
- Creator Beta access is gated by a backend secret token and a database expiry setting (`app_settings.creator_beta_expires_at`) that `is_premium` checks. Why: the server enforces it, not browser flags.
- Book purchases (manual grants now, automatic PayU later) go only through `record_book_purchase`, which stores tax, gateway fee and a held creator earning; refunds go only through `refund_book_purchase`. Why: one idempotent path keyed by unique provider reference, so a payment is never granted twice.
- Book recipe content is returned only by `get_book_recipe`, which checks free sample, paid purchase, membership, admin or Creator Beta via `has_book_access`. Why: public pages must only ever receive previews.
- The gateway fee is a setting (`app_settings.gateway_fee_percent`), not code. Why: the real PayU rate is not confirmed yet.
- Offline book packs come only from `get_book_offline_pack` (purchasers, admin, active Creator Beta; rate-limited) and live in IndexedDB keyed by user id + slug; `book_pack_status` drives update, restore and revocation. Why: subscribers' access must not outlive their plan, and recipe content must never enter the service-worker cache.
- The service worker is registered only from `src/lib/pwa.ts` (never in dev, preview or iframes), precaches the app shell only, serves the shell for offline page loads, and runtime-caches only fonts and public images. Why: stale-screen and data-leak safety.
