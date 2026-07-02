import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Status = "ok" | "degraded" | "down" | "unknown";
type Check = { status: Status; latency_ms?: number; detail?: string };

async function timed<T>(fn: () => Promise<T>): Promise<{ ms: number; ok: boolean; err?: string }> {
  const t = Date.now();
  try {
    await fn();
    return { ms: Date.now() - t, ok: true };
  } catch (e) {
    return { ms: Date.now() - t, ok: false, err: e instanceof Error ? e.message.slice(0, 120) : "error" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1) Database
  const dbT = await timed(async () => {
    const { error } = await supabase.from("videos").select("id", { count: "exact", head: true }).limit(1);
    if (error) throw error;
  });
  const database: Check = { status: dbT.ok ? "ok" : "down", latency_ms: dbT.ms, detail: dbT.err };

  // 2) Supabase auth
  const authT = await timed(async () => {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY },
    });
    if (!r.ok) throw new Error(`auth ${r.status}`);
  });
  const auth: Check = { status: authT.ok ? "ok" : "down", latency_ms: authT.ms, detail: authT.err };

  // 3) Edge Function runtime (self-check — we're running)
  const edge: Check = { status: "ok" };

  // 4) AI provider — only surface configuration presence, don't burn tokens.
  const aiConfigured = !!Deno.env.get("OPENAI_API_KEY");
  const ai: Check = { status: aiConfigured ? "ok" : "degraded", detail: aiConfigured ? undefined : "OPENAI_API_KEY missing" };

  // 5) Razorpay — reachability check to public API root.
  const rzpConfigured = !!Deno.env.get("RAZORPAY_KEY_ID");
  const rzpT = rzpConfigured
    ? await timed(async () => {
        const r = await fetch("https://api.razorpay.com/v1/", { method: "GET" });
        // Any non-5xx means the service is reachable.
        if (r.status >= 500) throw new Error(`rzp ${r.status}`);
      })
    : { ms: 0, ok: false, err: "not configured" };
  const razorpay: Check = {
    status: !rzpConfigured ? "degraded" : rzpT.ok ? "ok" : "down",
    latency_ms: rzpConfigured ? rzpT.ms : undefined,
    detail: rzpT.err,
  };

  const checks = { database, auth, edge, ai, razorpay };
  const worst = Object.values(checks).some((c) => c.status === "down")
    ? "down"
    : Object.values(checks).some((c) => c.status === "degraded")
    ? "degraded"
    : "ok";

  return new Response(
    JSON.stringify({
      status: worst,
      timestamp: new Date().toISOString(),
      version: Deno.env.get("APP_VERSION") ?? "unknown",
      checks,
    }),
    {
      status: worst === "down" ? 503 : 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
