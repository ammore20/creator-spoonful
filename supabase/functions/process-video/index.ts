import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RECIPE_EXTRACTION_PROMPT = `You are a recipe extraction expert. Analyze the transcript and extract a structured recipe.

IMPORTANT: The transcript may be in Marathi, English, or a mix. Extract the recipe information regardless of language.

CRITICAL: If the video does NOT contain a proper cooking recipe with clear ingredients and steps, return this exact JSON:
{ "no_recipe": true }

Return ONLY valid JSON with this exact structure (use English for field values):
{
  "title": "Proper dish name in English (e.g., 'Aloo Paratha', 'Modak')",
  "ingredients": ["specific ingredient with quantity like '2 cups rice flour'", "1 tsp salt", "more ingredients..."],
  "steps": ["Detailed step 1 with actual cooking action", "Detailed step 2 with actual cooking action", "more steps..."],
  "taste_tags": ["spicy", "sweet", "savory"], 
  "cuisine": "Maharashtrian",
  "meal_type": "Lunch",
  "prep_time": "30 mins",
  "difficulty": "Medium",
  "servings": 4
}

CRITICAL RULES:
1. "title" must be the ACTUAL DISH NAME (not generic phrases like "recipe", "cooking", "food")
2. "ingredients" must have at least 5 SPECIFIC ingredients with quantities (not vague like "flour" - say "2 cups wheat flour")
3. "steps" must have at least 5 DETAILED cooking steps (not generic like "see video" - describe actual actions)
4. If you cannot extract proper recipe details, return { "no_recipe": true }
5. All fields must be in English even if transcript is in Marathi
6. Never use placeholder text or generic descriptions

Valid taste_tags: spicy, sweet, sour, bitter, tangy, savory, balanced
Valid cuisine: Maharashtrian, South Indian, North Indian, Fusion, Global
Valid meal_type: Breakfast, Lunch, Dinner, Snack, Dessert
Valid difficulty: Easy, Medium, Hard`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let queueItemId: string | undefined;
  let supabase: any;

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

    // Verify user is authenticated
    const supabaseAuth = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: roleData } = await supabaseAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input
    const requestSchema = z.object({
      queueItemId: z.string().uuid(),
    });

    const requestData = await req.json();
    const validationResult = requestSchema.safeParse(requestData);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request parameters', 
          details: validationResult.error.errors 
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

    // Step 1: Get transcript from YouTube captions
    console.log('Step 1: Fetching YouTube captions...');
    
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    let transcript = '';
    
    try {
      // Try to get captions/subtitles from YouTube
      const captionsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${YOUTUBE_API_KEY}`
      );
      
      if (captionsResponse.ok) {
        const captionsData = await captionsResponse.json();
        console.log(`Found ${captionsData.items?.length || 0} caption tracks`);
        
        // Use title + description as transcript base
        transcript = `Video Title: ${video.title}\n\nDescription: ${video.description || 'No description'}\n\nThis is a cooking video.`;
      } else {
        console.log('No captions available, using title and description');
        transcript = `Video Title: ${video.title}\n\nDescription: ${video.description || 'No description'}\n\nThis is a cooking video.`;
      }
    } catch (error) {
      console.error('Error fetching captions:', error);
      transcript = `Video Title: ${video.title}\n\nDescription: ${video.description || 'No description'}\n\nThis is a cooking video.`;
    }
    
    console.log('Transcript prepared, length:', transcript.length);

    // Track transcription cost
    await supabase.from('cost_tracking').insert({
      video_id: videoDbId,
      operation_type: 'transcription',
      estimated_cost: 0.006, // ~$0.006 per minute
      tokens_used: transcript.length
    });

    // Step 2: Extract recipe using GPT
    console.log('Step 2: Extracting recipe structure...');
    
    const extractionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: RECIPE_EXTRACTION_PROMPT },
          { role: 'user', content: `Extract recipe from this transcript:\n\n${transcript}` }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    if (!extractionResponse.ok) {
      const errorText = await extractionResponse.text();
      throw new Error(`OpenAI API error: ${errorText}`);
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
        console.log('AI determined this video does not contain a valid recipe');
        throw new Error('No valid recipe found in video content');
      }
      
      // Validate required fields with strict checks
      if (!extractedRecipe.title || extractedRecipe.title.trim() === '') {
        console.error('Missing or empty title in extracted recipe:', extractedRecipe);
        throw new Error('Recipe extraction missing required title field');
      }
      
      // Check for invalid title patterns
      const invalidTitlePatterns = [
        /no recipe/i,
        /not found/i,
        /not available/i,
        /^recipe$/i,
        /^cooking$/i,
        /^food$/i,
        /see video/i,
        /watch video/i
      ];
      
      if (invalidTitlePatterns.some(pattern => pattern.test(extractedRecipe.title))) {
        console.error('Invalid title pattern detected:', extractedRecipe.title);
        throw new Error('Recipe title contains invalid or generic text');
      }
      
      // Validate ingredients
      if (!extractedRecipe.ingredients || !Array.isArray(extractedRecipe.ingredients) || extractedRecipe.ingredients.length < 5) {
        console.error('Insufficient ingredients:', extractedRecipe.ingredients);
        throw new Error('Recipe must have at least 5 ingredients');
      }
      
      // Check for generic/placeholder ingredients
      const invalidIngredients = extractedRecipe.ingredients.filter((ing: string) => 
        /see video/i.test(ing) || 
        /not available/i.test(ing) ||
        /ingredient \d+/i.test(ing) ||
        ing.trim().length < 3
      );
      
      if (invalidIngredients.length > 0) {
        console.error('Generic or invalid ingredients found:', invalidIngredients);
        throw new Error('Recipe contains placeholder or invalid ingredients');
      }
      
      // Validate steps
      if (!extractedRecipe.steps || !Array.isArray(extractedRecipe.steps) || extractedRecipe.steps.length < 5) {
        console.error('Insufficient steps:', extractedRecipe.steps);
        throw new Error('Recipe must have at least 5 detailed steps');
      }
      
      // Check for generic/placeholder steps
      const invalidSteps = extractedRecipe.steps.filter((step: string) => 
        /see video/i.test(step) || 
        /watch video/i.test(step) ||
        /not available/i.test(step) ||
        /step \d+/i.test(step) ||
        step.trim().length < 10
      );
      
      if (invalidSteps.length > 0) {
        console.error('Generic or invalid steps found:', invalidSteps);
        throw new Error('Recipe contains placeholder or invalid steps');
      }
      
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

    // Track extraction cost
    const tokensUsed = extractionData.usage?.total_tokens || 0;
    await supabase.from('cost_tracking').insert({
      video_id: videoDbId,
      operation_type: 'extraction',
      estimated_cost: (tokensUsed / 1000) * 0.002, // GPT-4o-mini pricing
      tokens_used: tokensUsed
    });

    // Step 3: Update video with results
    await supabase
      .from('videos')
      .update({
        status: 'done',
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