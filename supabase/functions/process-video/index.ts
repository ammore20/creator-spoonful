import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiter (per-edge-instance)
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // max 20 requests per window

type RateRecord = {
  timestamps: number[];
};

const rateLimitStore: Map<string, RateRecord> = (globalThis as any).rateLimitStore ??
  new Map<string, RateRecord>();
(globalThis as any).rateLimitStore = rateLimitStore;

function getClientKey(req: Request): string {
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for") ??
    "unknown";
  const userId = req.headers.get("x-client-info") ?? "";
  return `${ip}:${userId}`;
}

function isRateLimited(req: Request): boolean {
  const key = getClientKey(req);
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  const record = rateLimitStore.get(key) ?? { timestamps: [] };
  // Remove timestamps outside the window
  record.timestamps = record.timestamps.filter((ts) => ts >= windowStart);

  if (record.timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitStore.set(key, record);
    return true;
  }

  record.timestamps.push(now);
  rateLimitStore.set(key, record);
  return false;
}

const RECIPE_EXTRACTION_PROMPT = `You turn a cooking video's transcript into a structured recipe.

The transcript may be in Marathi, English, Hindi or a mix. Write field values in English.

STRICT RULES:
1. Use ONLY what is said or shown in the transcript text. Never invent ingredients, quantities, steps or times.
2. If a quantity is not stated, write the ingredient with "unknown" as the quantity, e.g. "unknown salt".
3. If a step is not clearly described, write "unknown" for that part instead of guessing.
4. If the transcript is not about cooking a dish (tips, cleaning, vlogs), return { "no_recipe": true }.
5. prep_time, difficulty and servings: give them only if stated or directly implied; otherwise "unknown" (servings: null).
6. confidence: a number from 0 to 1 for how completely the transcript supports this recipe.
7. missing_info: a short list of what was not stated.

Return ONLY valid JSON:
{
  "title": "Dish name",
  "ingredients": ["2 cups rice flour", "unknown salt"],
  "steps": ["Step as described"],
  "taste_tags": ["spicy"],
  "cuisine": "Maharashtrian",
  "meal_type": "Lunch",
  "prep_time": "30 mins",
  "difficulty": "Medium",
  "servings": 4,
  "confidence": 0.8,
  "missing_info": ["exact salt quantity"]
}

Valid taste_tags: spicy, sweet, sour, bitter, tangy, savory, balanced
Valid cuisine: Maharashtrian, South Indian, North Indian, Fusion, Global
Valid meal_type: Breakfast, Lunch, Dinner, Snack, Dessert
Valid difficulty: Easy, Medium, Hard, unknown`;

// gpt-4o-mini pricing (USD per token)
const PRICE_IN = 0.15 / 1_000_000;
const PRICE_OUT = 0.60 / 1_000_000;
const MIN_TRANSCRIPT_CHARS = 200;

function parseIsoDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0));
}
function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return (h ? `${h}:` : '') + `${mm}:${String(s).padStart(2, '0')}`;
}

async function supadataTranscript(videoId: string, mode: 'native' | 'generate', key: string): Promise<string | null> {
  const url = `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&text=true&mode=${mode}`;
  const res = await fetch(url, { headers: { 'x-api-key': key } });
  if (res.status === 202) {
    const { jobId } = await res.json();
    for (let i = 0; i < 20 && jobId; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const poll = await fetch(`https://api.supadata.ai/v1/transcript/${jobId}`, { headers: { 'x-api-key': key } });
      if (!poll.ok) return null;
      const j = await poll.json();
      if (j.status === 'completed') return typeof j.content === 'string' ? j.content : null;
      if (j.status === 'failed') return null;
    }
    return null;
  }
  if (!res.ok) { await res.text(); return null; }
  const j = await res.json();
  return typeof j.content === 'string' ? j.content : null;
}

// Hard caps to prevent runaway AI cost
const MAX_TRANSCRIPT_CHARS = 24_000; // ~6k tokens worst case
const MAX_RECIPE_TOKENS = 2000;
const MAX_BODY_BYTES = 1024;

// Exponential backoff retry helper for transient HTTP failures (429 / 5xx)
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: { attempts?: number; baseDelayMs?: number; timeoutMs?: number } = {},
): Promise<Response> {
  const { attempts = 3, baseDelayMs = 500, timeoutMs = 30_000 } = opts;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(timer);
      if (res.status !== 429 && res.status < 500) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
    }
    if (i < attempts - 1) {
      const delay = baseDelayMs * Math.pow(2, i) + Math.floor(Math.random() * 250);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('fetch failed');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (isRateLimited(req)) {
    return new Response(
      JSON.stringify({ error: 'Too many requests, please try again later.' }),
      {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  let queueItemId: string | undefined;
  let supabase: any;

  // Only the server (service role) or an admin may run processing
  {
    const auth = req.headers.get('Authorization') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    let allowed = !!serviceKey && auth === `Bearer ${serviceKey}`;
    if (!allowed && auth.startsWith('Bearer ')) {
      const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: auth } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
        const { data: isAdmin } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' });
        allowed = isAdmin === true;
      }
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

    console.log('process_video_invoked');

    // Validate input (with body size cap + JSON guard)
    const requestSchema = z.object({
      queueItemId: z.string().uuid(),
    });

    const rawText = await req.text();
    if (rawText.length > MAX_BODY_BYTES) {
      return new Response(
        JSON.stringify({ error: 'Request body too large' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    let requestData: unknown;
    try {
      requestData = rawText ? JSON.parse(rawText) : {};
    } catch {
      return new Response(
        JSON.stringify({ error: 'Malformed JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const validationResult = requestSchema.safeParse(requestData);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request parameters', 
          details: validationResult.error.flatten() 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    queueItemId = validationResult.data.queueItemId;

    supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    console.log(`Processing queue item: ${queueItemId}`);

    // Get queue item with video details
    const { data: queueItem, error: queueError } = await supabase
      .from('processing_queue')
      .select(`
        id,
        video_id,
        attempts,
        videos (
          id,
          video_id,
          title,
          description,
          creator_id
        )
      `)
      .eq('id', queueItemId)
      .single();

    if (queueError || !queueItem) {
      throw new Error('Queue item not found');
    }

    const video = queueItem.videos as any;
    const videoId = video.video_id;
    const videoDbId = video.id;

    console.log(`Processing video: ${videoId} - ${video.title}`);

    // Update queue status
    await supabase
      .from('processing_queue')
      .update({ 
        status: 'processing',
        attempts: queueItem.attempts + 1
      })
      .eq('id', queueItemId);

    // Update video status
    await supabase
      .from('videos')
      .update({ status: 'processing' })
      .eq('id', videoDbId);

    // Step 1: duration from YouTube + real transcript
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    const SUPADATA_API_KEY = Deno.env.get('SUPADATA_API_KEY');
    let durationSeconds = 0;
    try {
      const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${encodeURIComponent(videoId)}&key=${YOUTUBE_API_KEY}`);
      if (r.ok) {
        const j = await r.json();
        durationSeconds = parseIsoDuration(j.items?.[0]?.contentDetails?.duration ?? '');
      }
    } catch (e) { console.warn('duration_fetch_failed', e instanceof Error ? e.message : e); }

    let transcript = '';
    let transcriptSource = 'none';
    if (SUPADATA_API_KEY) {
      const native = await supadataTranscript(videoId, 'native', SUPADATA_API_KEY).catch(() => null);
      if (native && native.length >= MIN_TRANSCRIPT_CHARS) {
        transcript = native; transcriptSource = 'captions';
      } else {
        const spoken = await supadataTranscript(videoId, 'generate', SUPADATA_API_KEY).catch(() => null);
        if (spoken && spoken.length >= MIN_TRANSCRIPT_CHARS) {
          transcript = spoken; transcriptSource = 'speech';
          await supabase.from('cost_tracking').insert({
            video_id: videoDbId, operation_type: 'transcription', provider: 'supadata',
            audio_minutes: Math.ceil(durationSeconds / 60) || null,
            estimated_cost: null, tokens_used: null,
          });
        }
      }
    } else {
      console.warn('SUPADATA_API_KEY not configured');
    }
    if (!transcript && (video.description ?? '').length >= MIN_TRANSCRIPT_CHARS) {
      transcript = `Video description (no spoken transcript available):\n${video.description}`;
      transcriptSource = 'description';
    }
    if (!transcript) {
      throw new Error('No transcript available for this video');
    }
    transcript = `Video title: ${video.title}\n\n${transcript}`;
    if (transcript.length > MAX_TRANSCRIPT_CHARS) transcript = transcript.slice(0, MAX_TRANSCRIPT_CHARS);
    console.log('transcript_prepared', { length: transcript.length, source: transcriptSource });

    // Step 2: Extract recipe using GPT (with timeout + exponential backoff on 429/5xx)
    console.log('extracting_recipe', { model: 'gpt-4o-mini', maxTokens: MAX_RECIPE_TOKENS });

    const extractionResponse = await fetchWithRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: RECIPE_EXTRACTION_PROMPT },
            { role: 'user', content: `Turn this transcript into a recipe:\n\n${transcript}` }
          ],
          temperature: 0.1,
          max_tokens: MAX_RECIPE_TOKENS,
          response_format: { type: 'json_object' },
        }),
      },
      { attempts: 3, baseDelayMs: 800, timeoutMs: 30_000 },
    );

    if (!extractionResponse.ok) {
      const errorText = await extractionResponse.text();
      console.error('openai_extraction_failed', { status: extractionResponse.status });
      throw new Error(`OpenAI API error (${extractionResponse.status}): ${errorText.slice(0, 200)}`);
    }

    const extractionData = await extractionResponse.json();
    const recipeText = extractionData.choices[0].message.content;
    
    // Parse JSON response
    let extractedRecipe: any;
    try {
      // Try to extract JSON from response (handle markdown code blocks)
      let jsonText = recipeText.trim();
      if (jsonText.includes('```json')) {
        jsonText = jsonText.split('```json')[1].split('```')[0].trim();
      } else if (jsonText.includes('```')) {
        jsonText = jsonText.split('```')[1].split('```')[0].trim();
      }
      
      extractedRecipe = JSON.parse(jsonText);
      
      // Check if AI determined no recipe was found
      if (extractedRecipe.no_recipe === true) {
        console.log('AI determined this video does not contain a valid recipe (e.g., tips, cleaning video)');
        
        // Update video status to indicate no recipe found (not an error)
        await supabase
          .from('videos')
          .update({
            status: 'done',
            review_status: 'draft',
            transcript_source: transcriptSource,
            raw_transcript: transcript,
            duration: durationSeconds ? formatDuration(durationSeconds) : null,
            duration_seconds: durationSeconds || null,
            error_message: 'No recipe content found - video may be tips, cleaning, or non-recipe content',
            extracted_recipe_json: { no_recipe: true }
          })
          .eq('id', videoDbId);

        await supabase
          .from('processing_queue')
          .update({ status: 'completed' })
          .eq('id', queueItemId);

        return new Response(
          JSON.stringify({ success: true, no_recipe: true, message: 'Video does not contain recipe content' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Validate required fields with strict checks
      if (!extractedRecipe.title || extractedRecipe.title.trim() === '') {
        console.error('Missing or empty title in extracted recipe:', extractedRecipe);
        throw new Error('Recipe extraction missing required title field');
      }
      
      if (!Array.isArray(extractedRecipe.ingredients) || extractedRecipe.ingredients.length === 0) {
        throw new Error('No ingredients stated in transcript');
      }
      if (!Array.isArray(extractedRecipe.steps) || extractedRecipe.steps.length === 0) {
        throw new Error('No steps stated in transcript');
      }
      let conf = Number(extractedRecipe.confidence);
      if (!Number.isFinite(conf)) conf = 0;
      conf = Math.max(0, Math.min(1, conf));
      if (transcriptSource === 'description') conf = Math.min(conf, 0.4);
      extractedRecipe.confidence = conf;
      // Ensure taste_tags exist
      if (!extractedRecipe.taste_tags || !Array.isArray(extractedRecipe.taste_tags) || extractedRecipe.taste_tags.length === 0) {
        extractedRecipe.taste_tags = ['savory'];
      }
      
      console.log('Recipe extracted and validated successfully:', extractedRecipe.title);
    } catch (parseError) {
      console.error('Failed to parse GPT response:', recipeText);
      console.error('Parse error:', parseError);
      throw new Error(`Invalid recipe JSON from GPT: ${parseError instanceof Error ? parseError.message : 'Parse error'}`);
    }

    // Track extraction cost (structured log)
    const inTok = extractionData.usage?.prompt_tokens || 0;
    const outTok = extractionData.usage?.completion_tokens || 0;
    const estimatedCost = inTok * PRICE_IN + outTok * PRICE_OUT;
    console.log('ai_extraction_cost', { videoId, inTok, outTok, estimatedCost });
    await supabase.from('cost_tracking').insert({
      video_id: videoDbId,
      operation_type: 'extraction',
      provider: 'openai:gpt-4o-mini',
      estimated_cost: estimatedCost,
      tokens_used: inTok + outTok,
      input_tokens: inTok,
      output_tokens: outTok,
    });

    // Step 3: Translate to Marathi using Lovable AI
    console.log('Step 3: Translating to Marathi...');
    try {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (LOVABLE_API_KEY) {
        const translationResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [
              { role: 'system', content: `You are a Marathi translation expert. Translate the given recipe to Marathi. Return ONLY valid JSON: {"title_mr":"...","description_mr":"...","ingredients_mr":["..."],"steps_mr":["..."]}. Keep quantities in numerals.` },
              { role: 'user', content: JSON.stringify({ title: extractedRecipe.title, ingredients: extractedRecipe.ingredients, steps: extractedRecipe.steps }) },
            ],
            temperature: 0.2,
          }),
        });

        if (translationResponse.ok) {
          const transData = await translationResponse.json();
          let transText = transData.choices?.[0]?.message?.content || '';
          if (transText.includes('```json')) transText = transText.split('```json')[1].split('```')[0].trim();
          else if (transText.includes('```')) transText = transText.split('```')[1].split('```')[0].trim();
          const translation = JSON.parse(transText);
          extractedRecipe.title_mr = translation.title_mr;
          extractedRecipe.description_mr = translation.description_mr;
          extractedRecipe.ingredients_mr = translation.ingredients_mr;
          extractedRecipe.steps_mr = translation.steps_mr;
          console.log('Marathi translation added:', translation.title_mr);
        }
      }
    } catch (transError) {
      console.error('Marathi translation failed (non-fatal):', transError);
    }

    // Step 4: Update video with results
    await supabase
      .from('videos')
      .update({
        status: 'done',
        review_status: 'draft',
        legacy_approved: false,
        reviewed_at: null,
        reviewed_by: null,
        confidence: extractedRecipe.confidence,
        transcript_source: transcriptSource,
        duration: durationSeconds ? formatDuration(durationSeconds) : null,
        duration_seconds: durationSeconds || null,
        raw_transcript: transcript,
        extracted_recipe_json: extractedRecipe,
        error_message: null,
        retry_count: 0
      })
      .eq('id', videoDbId);

    // Update queue item
    await supabase
      .from('processing_queue')
      .update({ status: 'completed' })
      .eq('id', queueItemId);

    console.log(`Successfully processed video: ${videoId}`);

    return new Response(
      JSON.stringify({
        success: true,
        videoId: videoId,
        recipe: extractedRecipe
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Processing error:', error);

    // Update queue and video status on error
    try {
      if (!supabase) {
        supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
      }

      if (queueItemId) {
        const { data: queueItem } = await supabase
          .from('processing_queue')
          .select('video_id, attempts')
          .eq('id', queueItemId)
          .single();

        if (queueItem) {
          const maxRetries = 3;
          const shouldRetry = queueItem.attempts < maxRetries;

          await supabase
            .from('processing_queue')
            .update({
              status: shouldRetry ? 'queued' : 'failed',
              last_error: error instanceof Error ? error.message : 'Unknown error'
            })
            .eq('id', queueItemId);

          await supabase
            .from('videos')
            .update({
              status: 'error',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              retry_count: queueItem.attempts
            })
            .eq('id', queueItem.video_id);
        }
      }
    } catch (updateError) {
      console.error('Error updating failure status:', updateError);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});