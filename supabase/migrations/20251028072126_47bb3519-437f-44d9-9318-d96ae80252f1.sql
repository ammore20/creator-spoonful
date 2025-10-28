-- Create creators table
CREATE TABLE IF NOT EXISTS public.creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create videos table
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT NOT NULL UNIQUE,
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  duration TEXT,
  status TEXT NOT NULL DEFAULT 'ingested' CHECK (status IN ('ingested', 'queued', 'processing', 'done', 'error')),
  raw_transcript TEXT,
  extracted_recipe_json JSONB,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  manual_reviewed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create processing_jobs table for batch tracking
CREATE TABLE IF NOT EXISTS public.processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL CHECK (job_type IN ('seed', 'backfill', 'new_videos', 'manual')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  batch_size INTEGER NOT NULL,
  processed_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create processing_queue table for tracking individual video processing
CREATE TABLE IF NOT EXISTS public.processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.processing_jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create cost_tracking table
CREATE TABLE IF NOT EXISTS public.cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('transcription', 'extraction', 'embedding')),
  estimated_cost DECIMAL(10, 4),
  actual_cost DECIMAL(10, 4),
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables (public access for read, admin for write)
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can read, no one can write (handled by edge functions)
CREATE POLICY "Public read access for creators"
  ON public.creators FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public read access for videos"
  ON public.videos FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public read access for processing_jobs"
  ON public.processing_jobs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public read access for processing_queue"
  ON public.processing_queue FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public read access for cost_tracking"
  ON public.cost_tracking FOR SELECT
  TO anon, authenticated
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_creators_updated_at
  BEFORE UPDATE ON public.creators
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_processing_queue_updated_at
  BEFORE UPDATE ON public.processing_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert Sarita's Kitchen as default creator
INSERT INTO public.creators (name, channel_id)
VALUES ('Sarita''s Kitchen', 'UCxxxxxxxxxxxxxx')
ON CONFLICT (channel_id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_videos_status ON public.videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_creator_id ON public.videos(creator_id);
CREATE INDEX IF NOT EXISTS idx_processing_queue_status ON public.processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON public.processing_jobs(status);