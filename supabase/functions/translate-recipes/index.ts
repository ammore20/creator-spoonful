import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TRANSLATION_PROMPT = `You are a Marathi translation expert for Indian recipes. Translate the given recipe content to Marathi.

Return ONLY valid JSON with this exact structure:
{
  "title_mr": "Recipe title in Marathi",
  "description_mr": "Brief description in Marathi",
  "ingredients_mr": ["ingredient 1 in Marathi", "ingredient 2 in Marathi"],
  "steps_mr": ["step 1 in Marathi", "step 2 in Marathi"]
}

RULES:
1. Keep ingredient quantities in numerals (e.g., "2 कप तांदळाचे पीठ")
2. Use natural Marathi cooking terms
3. Keep the same number of ingredients and steps as the original
4. Translate accurately - do not add or remove content`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { batchSize = 5 } = await req.json().catch(() => ({}));

    // Fetch recipes without Marathi translation
    const { data: videos, error } = await supabase
      .from('videos')
      .select('id, video_id, title, extracted_recipe_json')
      .eq('status', 'done')
      .not('extracted_recipe_json', 'cs', '{"no_recipe":true}')
      .is('extracted_recipe_json->>title_mr', null)
      .order('published_at', { ascending: false })
      .limit(batchSize);

    if (error) throw error;

    if (!videos || videos.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All recipes are already translated', translated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Translating ${videos.length} recipes to Marathi...`);
    let translated = 0;
    const errors: string[] = [];

    for (const video of videos) {
      try {
        const recipe = video.extracted_recipe_json as any;
        if (!recipe || !recipe.title) continue;

        const userContent = JSON.stringify({
          title: recipe.title,
          description: recipe.description || `A ${recipe.cuisine || 'Indian'} ${recipe.meal_type || ''} recipe`,
          ingredients: recipe.ingredients || [],
          steps: recipe.steps || [],
        });

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [
              { role: 'system', content: TRANSLATION_PROMPT },
              { role: 'user', content: `Translate this recipe to Marathi:\n${userContent}` },
            ],
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.log('Rate limited, stopping batch');
            break;
          }
          throw new Error(`AI error: ${response.status}`);
        }

        const data = await response.json();
        let translationText = data.choices?.[0]?.message?.content || '';

        // Parse JSON from response
        if (translationText.includes('```json')) {
          translationText = translationText.split('```json')[1].split('```')[0].trim();
        } else if (translationText.includes('```')) {
          translationText = translationText.split('```')[1].split('```')[0].trim();
        }

        const translation = JSON.parse(translationText);

        // Merge translation into existing recipe JSON
        const updatedRecipe = {
          ...recipe,
          title_mr: translation.title_mr,
          description_mr: translation.description_mr,
          ingredients_mr: translation.ingredients_mr,
          steps_mr: translation.steps_mr,
        };

        await supabase
          .from('videos')
          .update({ extracted_recipe_json: updatedRecipe })
          .eq('id', video.id);

        translated++;
        console.log(`Translated: ${recipe.title} → ${translation.title_mr}`);

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        const msg = `Failed ${video.video_id}: ${err instanceof Error ? err.message : 'Unknown'}`;
        console.error(msg);
        errors.push(msg);
      }
    }

    return new Response(
      JSON.stringify({
        translated,
        remaining: videos.length - translated,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Translation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
