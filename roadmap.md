# Roadmap

## Phase 0 (done, waiting on inputs)
- [x] Read-only report: suspicious active subscriptions
- [x] Lock subscriptions writes to server only
- [x] Shared idempotent activation + earnings
- [x] Remove free creator month and Rs 299 price
- [ ] Creator Beta: token + expiry built; waiting on CREATOR_BETA_TOKEN secret and end date from user
- [x] Honest copy on /for-creators and Premium

## Phase 1 (done, waiting on inputs)
- [ ] Real transcripts built; waiting on SUPADATA_API_KEY from user
- [x] Honest extraction prompt + confidence
- [x] review_status / confidence / transcript_source / duration
- [x] Only approved recipes public; legacy approved
- [x] Admin review queue, creator picker, per-creator reprocess with estimate
- [x] Scheduled job every 15 min, 30/day cap, error stop; real cost tracking
- [x] process-video requires service role or admin

## Phase 3 (done)
- [x] books, book_recipes (100 cap, approved only, 3 samples), purchases, purchase_intents, book_earnings, link_visits, fee setting
- [x] Server entitlement + my_books(); admin book builder; manual PayU grant/refund
- [x] Scaling handles "unknown" and Marathi digits

## Phase 4 (done)
- [x] /c/:slug book page, home book grid (recipes at /recipes), reader /book/:slug, 7-day refund page

## Phase 5 (done)
- [x] Offline pack RPCs, IndexedDB storage, install banner + add-to-home-screen, update/restore/revoke, safe service worker, manifest + icons

## Later (not started): Phase 2 (PayU API, needs credentials), Phase 6
- [x] Phase 6: creator dashboard /creator, admin payouts, link creator
- [x] Phase 2: PayU checkout for books (flag payu_checkout_enabled)
- [x] Phase 7: creator promo codes, ₹499 base price

- [ ] Contact number + email on /for-creators and /contact
- [ ] Marathi translation toggle on /for-creators
