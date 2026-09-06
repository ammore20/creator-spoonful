import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BETA_EMAIL = "creator-beta@recipemaker.in";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1) Resolve (or provision) the single shared Creator Beta account.
    let link = await admin.auth.admin.generateLink({ type: "magiclink", email: BETA_EMAIL });

    if (link.error || !link.data?.user) {
      const created = await admin.auth.admin.createUser({
        email: BETA_EMAIL,
        email_confirm: true,
        password: crypto.randomUUID() + crypto.randomUUID(),
        user_metadata: { creator_beta: true },
      });
      if (created.error && !`${created.error.message}`.toLowerCase().includes("already")) {
        console.error("creator-beta: provisioning failed", created.error.message);
        return json({ error: "provisioning_failed" }, 500);
      }
      link = await admin.auth.admin.generateLink({ type: "magiclink", email: BETA_EMAIL });
      if (link.error || !link.data?.user) {
        console.error("creator-beta: link failed", link.error?.message);
        return json({ error: "provisioning_failed" }, 500);
      }
    }

    const userId = link.data.user.id;

    // 2) Entitlement lives in the database, not in the browser.
    const { error: roleError } = await admin
      .from("user_roles")
      .upsert({ user_id: userId, role: "creator_beta" }, { onConflict: "user_id,role" });
    if (roleError) {
      console.error("creator-beta: role grant failed", roleError.message);
      return json({ error: "provisioning_failed" }, 500);
    }

    // 3) Exchange the server-generated token for a real session.
    const tokenHash = (link.data.properties as { hashed_token?: string } | undefined)?.hashed_token;
    if (!tokenHash) return json({ error: "provisioning_failed" }, 500);

    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const verified = await anon.auth.verifyOtp({ type: "email", token_hash: tokenHash });
    if (verified.error || !verified.data.session) {
      console.error("creator-beta: verify failed", verified.error?.message);
      return json({ error: "session_failed" }, 500);
    }

    return json({
      access_token: verified.data.session.access_token,
      refresh_token: verified.data.session.refresh_token,
    });
  } catch (e) {
    console.error("creator-beta: unexpected", e instanceof Error ? e.message : "error");
    return json({ error: "unexpected" }, 500);
  }
});
