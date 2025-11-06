-- Fix PUBLIC_DATA_EXPOSURE: Restrict internal processing tables to admin-only access
-- Drop public read policies that expose operational data
DROP POLICY IF EXISTS "Public read access for processing_jobs" ON processing_jobs;
DROP POLICY IF EXISTS "Public read access for processing_queue" ON processing_queue;
DROP POLICY IF EXISTS "Public read access for cost_tracking" ON cost_tracking;

-- Create admin-only policies for processing_jobs
CREATE POLICY "Admins can view processing_jobs" 
ON processing_jobs 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Create admin-only policies for processing_queue
CREATE POLICY "Admins can view processing_queue" 
ON processing_queue 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Create admin-only policies for cost_tracking
CREATE POLICY "Admins can view cost_tracking" 
ON cost_tracking 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));