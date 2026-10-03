# Go-live review: Phases 0, 1, 3, 4, 5 and the draft book

This is a read-only review. Nothing was changed. Approving this plan does not publish anything. It only means the fixes in section 3 and the checklist can start in a later build turn.

## 1. Environments: one shared backend

- **There is no separate Test and Live backend.** The preview and the published site (creator-spoonful.lovable.app and recipemaker.in) use the same database and the same server functions. The project settings say so: one backend serves both.
- **Everything on the backend is already live.** That covers every database change from Phases 0, 1, 3 and 5, every server-function change, the 15-minute schedule and the Sarita's Kitchen draft book. Backend changes take effect the moment they are made. Publishing only updates the website itself.
- **Only the website is still old.** I loaded the live site today. It still calls itself "Creator Spoonful", still starts at "/", and runs the same old code on both addresses. So Phase 4 and 5 screens (home book grid, book page, reader, offline, new admin screens) exist only in the preview.
- **The draft book is not visible to the public.** Signed-out visitors get "not available", and the old site has no book page at all.

## 2. What the old live site gets wrong today (worst first)

I checked this by reading the code the live site actually runs.

1. **Admin "grant free membership" fails.** The old admin page writes memberships straight from the browser, and the backend now refuses that. Impact: admin only, no customer harm.
2. **Creator Beta link is broken.** The old page sends no token, and the token secret doesn't exist yet. Everyone who opens /creator-beta gets turned away. Impact: creator demos.
3. **The ₹299 yearly option on Premium fails.** The old Premium page still shows it, but the payment server now only accepts ₹49 and ₹499. Pressing it shows an error and no money is taken. ₹49 and ₹499 still work.
4. **The free-month banner still shows for referred visitors.** It shows when a free creator month exists, but none are created any more, so nothing is granted. Cosmetic only.
5. **The old Premium and For Creators wording is still live.** That includes the made-up stats and claims removed in Phase 0. This is an honesty issue, not a breakage.
6. **Recipes awaiting review are hidden.** Only approved recipes show, and the 109 existing ones are all approved. No visible change today.
7. **Recipe pages and the daily free unlock work normally.** The old site uses the same server checks, and they still exist.

Nothing the old site relies on was removed. The safest order is simply: **publish the new website soon.** Waiting longer only keeps problems 1 to 5 live. There is no backend step left to sequence.

## 3. Why the book is "saritas-kitchen-2"

The creators table:

| Name | Slug | YouTube channel | Videos | Referrals | Book |
|---|---|---|---|---|---|
| Sarita's Kitchen | sk | UCxxxxxxxxxxxxxx (placeholder) | 0 | 0 | none |
| Sarita's Kitchen | saritas-kitchen-2 | UCyO4P6y_F7O7whLhPJwQUuQ (real) | 110 | 0 | draft |
| Kitchen Cook In Tips Marathi | kcitm | UCkl-G-Z5n7LyvrSava5vqOQ | 40 | 2 | none |

- **Cause:** a duplicate creator. An early test row ("sk", fake channel ID) exists alongside the real one, and the "-2" was added when the slug was generated to avoid a clash. Nobody uses the "saritas-kitchen" slug.
- **Old links:** /c/saritas-kitchen goes to nothing today. On the new site it would show "not available". On the old site it just went to the home page. No referrals or earnings point at Sarita's Kitchen, so no money is tied to the old link.
- **Proposed fix (not applied):**
  1. Rename the real creator's slug to `saritas-kitchen` and the book's slug to match.
  2. Rename the fake row's slug to `sk-unused` and mark it unused. Don't delete it.
  3. Make /c/saritas-kitchen-2 and /c/sk forward to /c/saritas-kitchen.
  4. Keep the PayU link as it is.

  Do this before you share any book link.

## 4. Secrets and settings needed before go-live

| Item | Exists? | If missing |
|---|---|---|
| CREATOR_BETA_TOKEN | No | Creator Beta link turns everyone away |
| Creator Beta end date | No | When a token exists, beta access never ends |
| SUPADATA_API_KEY | No | Recipe extraction is off. The 15-minute job skips and the 20 queued videos wait. Existing recipes are unaffected |
| Gateway fee % | Default 2.36 | Creator shares use 2.36% until you change it in admin |
| Razorpay keys | Yes | Memberships keep working |
| PayU link on the book | Yes (draft) | Confirm in PayU that it charges ₹299 |
| PayU API keys | No | Not needed now (manual grants) |
| Book cover | No | Book shows a plain cover |

## 5. Go-live checklist

**Before publishing**
1. Fix the book slug (section 3).
2. In PayU, confirm the link charges ₹299. If it doesn't, keep the book in draft.
3. Add CREATOR_BETA_TOKEN and the end date, or accept that Creator Beta stays off.
4. Optional: add SUPADATA_API_KEY. Without it you have no new recipes, but nothing breaks.
5. In the preview, sign in as admin and open the book page, a free sample and the reader. Confirm no errors.
6. Run the security scan and review any critical findings.

**Publish**

7. Publish the website. Keep the book as a draft at first.
   - Rollback: restore the previous version from History and publish again. The backend stays as it is.

**After publishing (signed-out, then signed-in)**

8. Home page: it shows "Books are on the way". The old recipe list is under Recipes.
9. Sign up with email, then with Google, on a fresh account.
10. Open a recipe: the daily free unlock works.
11. Buy ₹49 with Razorpay test or live, and check that the membership turns on.
12. Publish the book in admin.
    - Rollback: unpublish it.
13. Open /c/saritas-kitchen in a private window. Check the price and the 3 free samples, and open one sample signed out.
14. As a test buyer, press Buy. The PayU tab should open and you'll see "After we confirm your payment…". In admin, grant the request with a reference such as TEST-1 and ₹299. The share should be ₹123.16.
15. As the buyer, all 100 recipes open, and the book shows under My books.
16. **On your phones (by hand):**
    - Android Chrome: Install the book, add it to the home screen, turn on airplane mode, open it, change servings, run the timer and switch to Marathi.
    - iPhone Safari: Share → Add to Home Screen first. Open it from the icon, sign in, press Install, then test in airplane mode.
17. Refund the test purchase in admin. Open the book online on the phone. The saved copy should disappear and the share should show "reversed".
    - Rollback: none needed. A refunded test leaves only a record.
18. On an old phone that had the previous app installed, open the site once. It should update without a blank screen.
    - Rollback: open the site with `?sw=off` at the end of the address.

## 6. Risks and unfinished items

- One backend for test and live, so any test purchase or grant is real data. Use clear references like TEST-1 and refund them.
- One active ₹49 membership has no payment record (signed up 16 Feb 2026, active until Feb 2027). That person also gets all books free. Decide whether to keep it.
- Creator payouts can't be marked as paid until Phase 6.
- Payment matching is manual. People who pay with a different email need "Grant book to an email".
- Offline copies on a phone that never goes online again survive a refund.
- The fake "sk" creator row and the "kcitm" referrals (2) are leftovers. Harmless, but confusing.
- Reprocessing a creator moves their recipes back to draft until they are re-approved.
- Not tested: real iPhone, the real Android install pop-up, a real PayU payment.

## Most important first

Fix the duplicate creator slug and publish the new website. The live site is already running against the new backend, and the old pages are what's currently broken.
