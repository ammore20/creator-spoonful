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
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY not configured');

    // Authenticate user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's JWT to verify authentication
    const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    // Use service role client for admin check and database operations
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Verify user has admin role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify user permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!roleData) {
      console.warn(`Non-admin user ${user.id} attempted to access ingest-youtube`);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin access verified for user: ${user.id}`);

    // Validate input
    const requestSchema = z.object({
      channelId: z.string().min(1).max(100),
      maxResults: z.number().int().min(1).max(50).default(20),
      jobType: z.string().default('seed'),
      pageToken: z.string().optional(),
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

    const { channelId: rawChannelId, maxResults, jobType, pageToken } = validationResult.data;
    
    console.log(`Starting ingestion: channelId=${rawChannelId}, maxResults=${maxResults}, jobType=${jobType}`);

    // Resolve handle to channel ID if needed (handles start with @)
    let resolvedChannelId = rawChannelId;
    if (rawChannelId.startsWith('@')) {
      console.log(`Resolving YouTube handle: ${rawChannelId}`);
      const handleResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forHandle=${rawChannelId.substring(1)}&key=${YOUTUBE_API_KEY}`
      );
      if (!handleResponse.ok) {
        throw new Error(`YouTube API error resolving handle: ${await handleResponse.text()}`);
      }
      const handleData = await handleResponse.json();
      if (!handleData.items || handleData.items.length === 0) {
        throw new Error(`No YouTube channel found for handle: ${rawChannelId}`);
      }
      resolvedChannelId = handleData.items[0].id;
      const channelName = handleData.items[0].snippet?.title || rawChannelId;
      console.log(`Resolved handle ${rawChannelId} to channel ID: ${resolvedChannelId}, name: ${channelName}`);

      // Auto-create creator if not exists
      const { data: existingCreator } = await supabase
        .from('creators')
        .select('id')
        .eq('channel_id', resolvedChannelId)
        .maybeSingle();

      if (!existingCreator) {
        const { error: createError } = await supabase
          .from('creators')
          .insert({ channel_id: resolvedChannelId, name: channelName });
        if (createError) {
          console.error('Error creating creator:', createError);
        } else {
          console.log(`Auto-created creator: ${channelName}`);
        }
      }
    }

    // Get creator
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('*')
      .eq('channel_id', resolvedChannelId)
      .single();

    if (creatorError || !creator) {
      throw new Error(`Creator not found for channel_id: ${resolvedChannelId}`);
    }

    // Fetch uploads playlist ID
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${resolvedChannelId}&key=${YOUTUBE_API_KEY}`
    );
    
    if (!channelResponse.ok) {
      throw new Error(`YouTube API error: ${await channelResponse.text()}`);
    }

    const channelData = await channelResponse.json();
    const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    
    if (!uploadsPlaylistId) {
      throw new Error('Could not find uploads playlist');
    }

    // Fetch videos from uploads playlist
    const pageTokenParam = pageToken ? `&pageToken=${pageToken}` : '';
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}${pageTokenParam}&key=${YOUTUBE_API_KEY}`
    );

    if (!videosResponse.ok) {
      throw new Error(`YouTube API error: ${await videosResponse.text()}`);
    }

    const videosData = await videosResponse.json();
    const videos = videosData.items || [];
    const nextPageToken = videosData.nextPageToken;

    console.log(`Found ${videos.length} videos, nextPageToken: ${nextPageToken || 'none'}`);

    // Create processing job
    const { data: job, error: jobError } = await supabase
      .from('processing_jobs')
      .insert({
        job_type: jobType,
        batch_size: videos.length,
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) throw jobError;

    let ingestedCount = 0;
    let queuedCount = 0;
    const errors: string[] = [];

    // Insert/update videos and queue for processing
    for (const video of videos) {
      const videoId = video.contentDetails.videoId;
      const snippet = video.snippet;

      try {
        // Check if video already exists
        const { data: existing } = await supabase
          .from('videos')
          .select('id, status')
          .eq('video_id', videoId)
          .maybeSingle();

        if (existing) {
          console.log(`Video ${videoId} already exists with status: ${existing.status}`);
          
          // Only requeue if status is 'error' or not processed
          if (existing.status === 'error' || existing.status === 'ingested') {
            await supabase
              .from('processing_queue')
              .insert({
                video_id: existing.id,
                job_id: job.id,
                status: 'queued'
              });
            queuedCount++;
          }
          continue;
        }

        // Insert new video
        const { data: newVideo, error: videoError } = await supabase
          .from('videos')
          .insert({
            video_id: videoId,
            creator_id: creator.id,
            title: snippet.title,
            description: snippet.description,
            thumbnail_url: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
            published_at: snippet.publishedAt,
            status: 'queued'
          })
          .select()
          .single();

        if (videoError) {
          console.error(`Error inserting video ${videoId}:`, videoError);
          errors.push(`${videoId}: ${videoError.message}`);
          continue;
        }

        // Queue for processing
        await supabase
          .from('processing_queue')
          .insert({
            video_id: newVideo.id,
            job_id: job.id,
            status: 'queued'
          });

        ingestedCount++;
        queuedCount++;
      } catch (err) {
        console.error(`Error processing video ${videoId}:`, err);
        errors.push(`${videoId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Update job status
    await supabase
      .from('processing_jobs')
      .update({
        status: errors.length === videos.length ? 'failed' : 'completed',
        completed_at: new Date().toISOString(),
        processed_count: ingestedCount,
        error_message: errors.length > 0 ? errors.join('; ') : null
      })
      .eq('id', job.id);

    console.log(`Ingestion complete: ${ingestedCount} new, ${queuedCount} queued`);

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        ingestedCount,
        queuedCount,
        nextPageToken,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Ingestion error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
