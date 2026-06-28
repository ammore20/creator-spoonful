# RecipeMaker Production-Readiness Audit & Critical Fixes

## Deliverables (3 things)

### 1. Audit report — `/mnt/documents/recipemaker-audit.md`

A single downloadable markdown report covering all 5 phases you listed. Each finding will include: file/location, severity (Critical / High / Medium / Low), why it matters, and the recommended fix. Structure:

- **Phase 1 — Architecture**: folder layout, frontend (React Query usage, routing, component size), edge functions (`admin-operations`, `ingest-youtube`, `process-video`, `razorpay-*`, `translate-recipes`, `setup-admin`), DB schema (12 tables), auth model, AI pipeline, payment flow.
- **Phase 2 — Product**: user journey from landing → recipe → premium gate → checkout, subscription UX, premium feel, friction points, missing/excess features.
- **Phase 3 — Technical issues**: bugs, duplication (e.g. `src/data/recipes.ts` vs DB-backed recipes), TS strictness disabled in `tsconfig.json`, missing zod validation, RLS gaps, slow queries (run via `slow_queries` tool), React anti-patterns.
- **Phase 4 — Scaling plan**: concrete steps for 100 → 100k users (DB indexes, image CDN, queue workers, edge function concurrency, cost caps on OpenAI/Lovable AI, logging/monitoring).
- **Phase 5 — Business**: pricing, Razorpay funnel, affiliate/referrals table usage, SEO (`SEO.tsx`, sitemap function, robots), analytics gaps, retention hooks.

Each phase ends with a **prioritized action list** (P0 → P3).

### 2. Critical fixes applied this pass

From the security scan + initial review, these are P0 and will be fixed in the same turn as the report:

1. **`videos` table leaks internal fields publicly** (`raw_transcript`, `error_message`, `retry_count`, `manual_reviewed`, `extracted_recipe_json`). Fix: create a `public_videos` view exposing only display columns, repoint the frontend reads to it, and tighten the `videos` RLS/grants so `anon` cannot select internal columns.
2. **`SECURITY DEFINER` functions executable by `anon`/`authenticated`** (3 functions, flagged twice each by the linter). Fix: `REVOKE EXECUTE ... FROM anon, authenticated` on the ones that should only run from triggers or service_role (`handle_new_user`, `update_updated_at_column`); keep `has_role` callable by `authenticated` only.
3. **Admin gating audit**: confirm `/admin` and `admin-operations` edge function both enforce `has_role(auth.uid(), 'admin')` server-side and aren't trusting `VITE_ADMIN_EMAIL` on the client. Fix any client-only checks found.
4. **Razorpay webhook hardening**: verify HMAC signature check, idempotency on `razorpay_payment_id`, and that subscription state is only written from the webhook — not from `razorpay-checkout` client callback.
5. **Input validation on public edge functions** (`generate-sitemap`, `translate-recipes` — both `verify_jwt = false`): add zod schemas + size/rate limits so they can't be abused.

Anything Medium/Low stays in the report as recommendations — not auto-fixed.

### 3. Code export instructions (in the report's appendix)

Two paths, since you're already deployed on Netlify via GitHub:

- **GitHub (recommended, since Netlify is wired to it)**: open repo → `Code → Download ZIP`, or `git clone <repo-url>` locally. That repo already has everything an external reviewer needs.
- **Direct download from Lovable** (paid workspace): Code Editor → `Download codebase` at the bottom of the file tree.
- **What NOT to share**: real `.env` (contains your publishable key — low risk, but still). I'll include an `.env.example` template in the export instructions. Database data exports as CSV per table from Cloud → Database → Tables; full pg_dump isn't available on Lovable Cloud.

## What this plan does NOT include

- Implementing Phase 2 product redesigns or new features.
- Rewriting the AI pipeline (only flags issues).
- Phase 4 scaling work itself — only the written plan for it.
- Phase 3 Medium/Low refactors — listed, not executed.

If you want any of those done after you read the report, we do them as separate follow-up turns.

## Technical execution order

1. Spawn deeper exploration of edge functions + frontend data layer (already in flight).
2. Run `supabase--slow_queries` and `supabase--linter` to feed Phase 3.
3. Write `/mnt/documents/recipemaker-audit.md` and emit it as a `<presentation-artifact>`.
4. Apply the 5 P0 fixes via one migration + targeted file edits.
5. Verify: re-run `security--run_security_scan`, confirm scan delta in the chat reply.
