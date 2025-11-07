import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's JWT for auth check
    const supabaseAuth = createClient(
      SUPABASE_URL!,
      SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Create service role client for operations
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate request body
    const requestSchema = z.object({
      operation: z.enum(['backfill', 'reprocess', 'mark_done', 'update_recipe', 'get_stats', 'process_batch']),
      channelId: z.string().nullish(),
      maxResults: z.number().int().min(1).max(50).nullish(),
      batchSize: z.number().int().min(1).max(100).nullish(),
      videoId: z.string().nullish(),
      recipe: z.any().nullish(),
      pageToken: z.string().nullish(),
    });

    const rawBody = await req.json();
    const validationResult = requestSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request parameters', 
          details: validationResult.error.errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { operation, ...params } = validationResult.data;

    console.log(`Admin operation: ${operation}`, params);

    switch (operation) {
      case 'backfill': {
        const { batchSize, pageToken } = params;
        const actualBatchSize = batchSize ?? 10;
        
        // Get the most recent channel ID from creators table
        const { data: creators, error: creatorError } = await supabase
          .from('creators')
          .select('channel_id')
          .order('created_at', { ascending: false })
          .limit(1);

        if (creatorError || !creators || creators.length === 0) {
          throw new Error('No creator configured');
        }
        
        const creator = creators[0];
        
        // Prepare request body, only include pageToken if it exists
        const requestBody: any = {
          channelId: creator.channel_id,
          maxResults: actualBatchSize,
          jobType: 'backfill'
        };
        
        if (pageToken) {
          requestBody.pageToken = pageToken;
        }
        
        // Call ingest function
        const { data: ingestData, error: ingestError } = await supabase.functions.invoke('ingest-youtube', {
          body: requestBody
        });

        if (ingestError) throw ingestError;

        return new Response(
          JSON.stringify(ingestData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reprocess': {
        const { videoId } = params;
        
        // Find video and requeue
        const { data: video, error } = await supabase
          .from('videos')
          .select('id')
          .eq('video_id', videoId)
          .single();

        if (error || !video) {
          throw new Error(`Video not found: ${videoId}`);
        }

        // Reset status
        await supabase
          .from('videos')
          .update({
            status: 'queued',
            error_message: null,
            retry_count: 0
          })
          .eq('id', video.id);

        // Create new queue entry
        await supabase
          .from('processing_queue')
          .insert({
            video_id: video.id,
            status: 'queued',
            attempts: 0
          });

        return new Response(
          JSON.stringify({ success: true, message: 'Video requeued' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'mark_done': {
        const { videoId } = params;
        
        await supabase
          .from('videos')
          .update({ status: 'done', error_message: null })
          .eq('video_id', videoId);

        return new Response(
          JSON.stringify({ success: true, message: 'Video marked as done' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_recipe': {
        const { videoId, recipe } = params;
        
        await supabase
          .from('videos')
          .update({
            extracted_recipe_json: recipe,
            manual_reviewed: true
          })
          .eq('video_id', videoId);

        return new Response(
          JSON.stringify({ success: true, message: 'Recipe updated' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_stats': {
        const { data: stats } = await supabase
          .rpc('get_processing_stats');

        const { data: videos } = await supabase
          .from('videos')
          .select('status, retry_count')
          .order('created_at', { ascending: false })
          .limit(100);

        const statusCounts = videos?.reduce((acc: any, v: any) => {
          acc[v.status] = (acc[v.status] || 0) + 1;
          return acc;
        }, {}) || {};

        return new Response(
          JSON.stringify({ 
            success: true,
            statusCounts,
            totalVideos: videos?.length || 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'process_batch': {
        const { batchSize } = params;
        const actualBatchSize = batchSize ?? 5;
        
        // Get queued items
        const { data: queueItems } = await supabase
          .from('processing_queue')
          .select('id')
          .eq('status', 'queued')
          .limit(actualBatchSize);

        if (!queueItems || queueItems.length === 0) {
          return new Response(
            JSON.stringify({ success: true, message: 'No videos to process', processed: 0 }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Processing batch of ${queueItems.length} videos`);

        // Process each item
        const results = [];
        for (const item of queueItems) {
          try {
            console.log(`Invoking process-video for queue item: ${item.id}`);
            const { data: processData, error: processError } = await supabase.functions.invoke('process-video', {
              body: { queueItemId: item.id },
              headers: {
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
              }
            });

            if (processError) {
              console.error(`Error processing item ${item.id}:`, processError);
            } else {
              console.log(`Successfully processed item ${item.id}`);
            }

            results.push({ id: item.id, success: !processError, data: processData, error: processError });
          } catch (err) {
            console.error(`Exception processing item ${item.id}:`, err);
            results.push({ id: item.id, success: false, error: err instanceof Error ? err.message : 'Unknown' });
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            processed: queueItems.length,
            results
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

  } catch (error) {
    console.error('Admin operation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});