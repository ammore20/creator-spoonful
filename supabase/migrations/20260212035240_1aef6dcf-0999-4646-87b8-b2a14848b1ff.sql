
-- Table to track referrals: which creator referred which user
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id),
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one referral per user
ALTER TABLE public.referrals ADD CONSTRAINT unique_referral_per_user UNIQUE (user_id);

-- Table to track creator earnings from referred subscriptions
CREATE TABLE public.creator_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id),
  referral_id UUID NOT NULL REFERENCES public.referrals(id),
  subscription_amount INTEGER NOT NULL,
  creator_share INTEGER NOT NULL, -- 50% of subscription amount
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_earnings ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can view all referrals and earnings
CREATE POLICY "Admins can view referrals" ON public.referrals
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view creator_earnings" ON public.creator_earnings
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Add slug column to creators for URL-friendly landing pages
ALTER TABLE public.creators ADD COLUMN slug TEXT UNIQUE;

-- Create index on slug for fast lookups
CREATE INDEX idx_creators_slug ON public.creators(slug);
