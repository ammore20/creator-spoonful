import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const { operation, email, ...params } = await req.json();
    
    // Verify admin access
    if (email !== ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin operation: ${operation}`, params);

    switch (operation) {
      case 'backfill': {
        const { channelId, batchSize = 10 } = params;
        
        // Call ingest function
        const ingestResponse = await fetch(`${SUPABASE_URL}/functions/v1/ingest-youtube`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channelId,
            maxResults: batchSize,
            jobType: 'backfill'
          })
        });

        const ingestData = await ingestResponse.json();
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
        const { batchSize = 5 } = params;
        
        // Get queued items
        const { data: queueItems } = await supabase
          .from('processing_queue')
          .select('id')
          .eq('status', 'queued')
          .limit(batchSize);

        if (!queueItems || queueItems.length === 0) {
          return new Response(
            JSON.stringify({ success: true, message: 'No videos to process', processed: 0 }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Process each item
        const results = [];
        for (const item of queueItems) {
          try {
            const processResponse = await fetch(`${SUPABASE_URL}/functions/v1/process-video`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ queueItemId: item.id })
            });

            const processData = await processResponse.json();
            results.push({ id: item.id, success: processResponse.ok, data: processData });
          } catch (err) {
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