# Architecture rules

- Subscription activation and creator earnings go only through the `activate_subscription` database function (service role). Why: one idempotent step, so earnings are recorded once whichever payment path runs first.
- Only `review_status = 'approved'` recipes are exposed by `public_videos` and the recipe access functions. Why: AI-extracted recipes need human review before going public.
- Recipe processing (`process-video`) only accepts the service role or an admin. Scheduled processing authenticates with a private internal key held in the database. Why: AI spend must not be triggerable by the public.
- Creator Beta access is gated by a backend secret token and a database expiry setting (`app_settings.creator_beta_expires_at`) that `is_premium` checks. Why: the server enforces it, not browser flags.
