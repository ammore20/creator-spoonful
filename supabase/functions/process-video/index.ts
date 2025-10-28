import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RECIPE_EXTRACTION_PROMPT = `You are a recipe extraction expert. Analyze the transcript and extract a structured recipe.

Return ONLY valid JSON with this exact structure:
{
  "title": "Recipe name",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "steps": ["step 1", "step 2"],
  "taste_tags": ["spicy", "sweet", "savory"], 
  "cuisine": "Maharashtrian",
  "meal_type": "Lunch",
  "prep_time": "30 mins",
  "difficulty": "Medium",
  "servings": 4
}

Valid taste_tags: spicy, sweet, sour, bitter, tangy, savory, balanced
Valid cuisine: Maharashtrian, South Indian, North Indian, Fusion, Global
Valid meal_type: Breakfast, Lunch, Dinner, Snack, Dessert
Valid difficulty: Easy, Medium, Hard`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const { queueItemId } = await req.json();
    
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

    // Step 1: Get transcript using YouTube URL with Whisper
    console.log('Step 1: Transcribing video...');
    
    // Note: Whisper doesn't directly support YouTube URLs, so we'll simulate with description
    // In production, you'd download audio first or use a service like youtube-dl
    const transcript = video.description || `Recipe video: ${video.title}`;
    
    // For demonstration, we'll use the description as "transcript"
    // In real implementation, download audio and transcribe
    console.log('Transcript obtained (simulated from description)');

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
    let extractedRecipe;
    try {
      extractedRecipe = JSON.parse(recipeText);
    } catch (parseError) {
      console.error('Failed to parse GPT response:', recipeText);
      throw new Error('Invalid recipe JSON from GPT');
    }

    console.log('Recipe extracted successfully');

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
      const { queueItemId } = await req.json();
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

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
    } catch (updateError) {
      console.error('Error updating failure status:', updateError);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});