# RecipeMaker → Creator Recipe Books: Phased Plan

## Your findings, checked against the code

- Confirmed: process-video only sends the title and description to the AI. The prompt tells it to use "standard recipes" when no transcript exists, and it asks for at least 5 ingredients. That pushes the AI to make up content. The "transcription" cost row stores the text length, not a real cost. `raw_transcript` holds title plus description.
- Confirmed: admin backfill picks the creator with the newest `created_at`. No schedule exists. `manual_reviewed` is never required.
- Confirmed: a unique index on `subscriptions.razorpay_payment_id` skips only `admin_grant%` rows, so a second `free_creator_<slug>` insert fails. The insert result is never checked.
- Confirmed: the `subscriptions` INSERT policy is `auth.uid() = user_id` with no limit on status or amount, and no UPDATE policy exists. So the user-JWT update in verify-payment updates nothing. My earlier probe already showed a user can insert an "active" row for themselves.
- Confirmed: the /for-creators stats (10K+, 500+, 4.9★) and "Our AI watches your videos" are hardcoded.
- Correction on install support: it is not just icons. `vite-plugin-pwa` is already active. It registers its own service worker automatically, has no guards for preview or iframe, has no `?sw=off` kill switch, and precaches HTML (so a stale screen after a deploy is possible). The manifest name is still "Creator Spoonful". `capacitor.config.ts` is unused for the web.
- Not yet checked: the referral, creator-beta and Premium-page claims in your list. Each phase will start by checking them.

## Phases (effort is rough, in build turns)

### Phase 0: security and honesty (1–2 turns, low risk)
- Drop the user INSERT on `subscriptions`. Only the payment functions (server key) write to it. Make verify-payment and the webhook use the server client so payments really activate.
- Remove the free creator month (books are one-time purchases). Keep existing rows.
- Tie the ₹299 price to a server-checked referral, or remove it. Recommendation: remove it, since books are flat ₹499.
- Creator Beta: require a secret token (backend secret) in the link, add `noindex`, and add an expiry date check on the server.
- /for-creators and Premium: remove the made-up stats and testimonial, and reword the AI line and any unbuilt features.
- Risk: existing premium users are unaffected. Only new self-inserts get blocked.

### Phase 1: recipe quality (3–4 turns, medium risk, uses credits)
- Real transcripts: YouTube captions through a transcript provider (needs a new API key, for example Supadata or a similar service). Fallback: send the audio to a speech model (Whisper, about ₹0.5 per 10 minutes). Alternative: Gemini reading the video directly, which costs more.
- New prompt: use only what the video says, write "unknown" for missing quantities, return a `confidence` score, and drop the 5-ingredient minimum.
- New columns: `review_status` (draft/approved/rejected), `confidence`, `transcript_source`, and a filled `duration` from the YouTube API.
- `public_videos` and books only show approved recipes. Existing recipes are approved as-is (decision below).
- Backfill per chosen creator; a scheduled job (pg_cron) processes the queue every 15 minutes with a daily cap.
- **Credits/cost flag:** reprocessing all 130 videos with real transcripts is a significant AI spend. Each phase gets its own cap.

### Phase 2: PayU (3 turns, high risk because it handles money)
- New functions: `payu-initiate` (server builds the SHA-512 hash, price from the database), `payu-return` (success and failure pages, used for display only), `payu-webhook`, and `payu-verify` (calls PayU's `verify_payment` API before granting anything).
- Idempotent by `txnid` with a unique index. Razorpay stays live until PayU passes an end-to-end test.
- **Needed from you:** PayU Merchant Key and Salt (test and live), a business account with webhook/S2S callback enabled, and approval for the success/failure URLs on recipemaker.in. Split settlement only if you want it (decision below).

### Phase 3: books and purchases (3 turns, medium risk)
- Tables: `books` (creator_id unique, title EN/MR, cover, price_paise default 49900, status), `book_recipes` (book_id, video_id, position, is_free_sample, max 100 enforced by a trigger), `purchases` (user, book, amount, gateway, txn_id unique, status, refunded_at), `creator_earnings` (purchase_id, share, status held/payable/paid/reversed, payable_at).
- RPC `get_book_recipe(book, video)`: returns content only if the user owns the book or the recipe is a free sample. RPC `my_books()`.
- Admin screen to pick and order up to 100 recipes and mark the free samples.
- Existing subscribers: honour them until their expiry (recommendation: give them access to all books until it ends), then stop selling subscriptions.

### Phase 4: storefront and home (2 turns, low risk)
- Home: the headline, subline and grid of book cards you described.
- /c/:slug: the book page you described. This replaces the current redirect, which breaks links already shared (decision below). Visits are logged on the server in a `link_visits` table (creator, day, hashed visitor), with no personal data stored.
- English and Marathi copy, with the existing design tokens.

### Phase 5: reader and offline install (3–4 turns, high risk)
- Rebuild the install setup: guarded registration in one place, no service worker in preview or dev, `?sw=off` kill switch, network-first pages, and a manifest per book or one app that holds the buyer's books.
- The service worker does not cache recipe content publicly. After an ownership check, the app saves the book in browser storage (IndexedDB) tied to the signed-in user. Thumbnails go into a private cache.
- When online: on sign-in and on each app open, check ownership. If refunded or revoked, wipe the saved copy. If storage was cleared, download the book again.
- The install banner shows only to buyers. Timers, servings, checklist and filters run on the local copy.
- iOS Safari: there is no install prompt (users must use Share → Add to Home Screen, so we show instructions). Storage can be cleared after about 7 days without use, so we re-download. The installed app has storage separate from Safari, so the user signs in once inside it. YouTube video embeds do not work offline.

### Phase 6: creator dashboard and payouts (2–3 turns, medium risk)
- Add `creators.user_id`. The admin links a creator to a login (invite by email).
- /creator dashboard: visits, books sold, payable now, in hold, a recent sales table, and UPI edit (stored in `creator_payout_details`, visible only to that creator).
- Admin marks payouts as paid. Refunds reverse unpaid earnings or carry a negative balance forward.

## Main risks
- Changing /c/:slug breaks referral behaviour already shared. Old local referral data gets ignored.
- Offline content protection is best effort: a buyer can always read their own saved copy.
- Reprocessing recipes may change titles and ingredients users have already seen.
- PayU onboarding and approval timing is outside our control.

## Open decisions (my recommendation for each)
1. Share basis: 50% of the amount after GST and gateway fees. It is clearer and safer for your margin. The current code uses gross.
2. Hold period: 15 days, matching the refund window. A refund within the hold cancels the share; after payout it is netted from the next payout.
3. Refund wording: "Refund within 7 days if fewer than 5 recipes opened". I will update /refund to match.
4. Free samples: 3 per book.
5. Price per creator: allow it to vary (stored per book), default ₹499, admin-set only.
6. Payouts: manual UPI payouts by you first. PayU split settlement later if your account supports it.
7. GST: treat ₹499 as GST-inclusive (18% for digital services, if you are registered) and store the tax part per purchase. Please confirm with your accountant.
8. Existing data: keep all creators and recipes. Mark current recipes "approved (legacy)" so books can start right away, and reprocess them over time.

## Questions for you
- Do existing subscribers keep access to all books until expiry, or do they get one book each?
- Should Creator Beta continue at all in the book model?
- Buyers sign in with email only, or add Google too?

## Technical notes
- Every new table gets grants, RLS and policies in the same migration. Payment and earnings writes happen only from the server.
- No data is deleted. Retired columns get a "deprecated" comment.
