import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Called every 15 minutes by pg_cron. Processes a few queued videos with a hard daily cap
// and stops automatically if errors spike.
const DAILY_CAP = 30;
const PER_RUN = 3;
const SPIKE_MIN_FAILURES = 5;
const SPIKE_RATIO = 0.5;

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const URL_ = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(URL_, SERVICE);

  const key = req.headers.get("x-cron-key") ?? "";
  const { data: ok } = await db.rpc("check_internal_key", { _name: "cron", _value: key });
  if (ok !== true) return json({ error: "forbidden" }, 403);

  // IST midnight in UTC
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3600_000);
  ist.setUTCHours(0, 0, 0, 0);
  const dayStart = new Date(ist.getTime() - 5.5 * 3600_000).toISOString();
  const last24h = new Date(now.getTime() - 24 * 3600_000).toISOString();

  const { data: today } = await db.from("processing_jobs")
    .select("processed_count, failed_count").eq("job_type", "scheduled").gte("created_at", dayStart);
  const usedToday = (today ?? []).reduce((n, r) => n + (r.processed_count ?? 0) + (r.failed_count ?? 0), 0);
  if (usedToday >= DAILY_CAP) return json({ skipped: "daily_cap", usedToday });

  const { data: recent } = await db.from("processing_jobs")
    .select("processed_count, failed_count").eq("job_type", "scheduled").gte("created_at", last24h);
  const rp = (recent ?? []).reduce((n, r) => n + (r.processed_count ?? 0), 0);
  const rf = (recent ?? []).reduce((n, r) => n + (r.failed_count ?? 0), 0);
  if (rf >= SPIKE_MIN_FAILURES && rf / Math.max(rp + rf, 1) >= SPIKE_RATIO) {
    console.error("scheduled_processing_paused_error_spike", { rp, rf });
    return json({ skipped: "error_spike", processed: rp, failed: rf });
  }

  const limit = Math.min(PER_RUN, DAILY_CAP - usedToday);
  const { data: items } = await db.from("processing_queue")
    .select("id").eq("status", "queued").order("created_at", { ascending: true }).limit(limit);
  if (!items?.length) return json({ skipped: "empty_queue" });

  const { data: job } = await db.from("processing_jobs").insert({
    job_type: "scheduled", status: "running", batch_size: items.length, started_at: new Date().toISOString(),
  }).select("id").single();

  let processed = 0, failed = 0;
  for (const item of items) {
    try {
      const r = await fetch(`${URL_}/functions/v1/process-video`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
        body: JSON.stringify({ queueItemId: item.id }),
      });
      await r.text();
      r.ok ? processed++ : failed++;
    } catch {
      failed++;
    }
  }

  if (job?.id) {
    await db.from("processing_jobs").update({
      status: "completed", processed_count: processed, failed_count: failed, completed_at: new Date().toISOString(),
    }).eq("id", job.id);
  }
  return json({ processed, failed, usedToday: usedToday + processed + failed });
});
