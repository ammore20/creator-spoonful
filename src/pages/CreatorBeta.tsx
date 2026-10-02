import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChefHat, Sparkles, Infinity as InfinityIcon, Users, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SEO } from '@/components/SEO';
import logo from '@/assets/logo.png';

const BENEFITS = [
  { icon: InfinityIcon, text: 'Unlimited recipe access' },
  { icon: Sparkles, text: 'English and Marathi recipes' },
  { icon: Users, text: 'Timers and serving adjuster' },
  { icon: ChefHat, text: 'Full platform access' },
];

export default function CreatorBeta() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';
  const { toast } = useToast();

  const enter = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('creator-beta-enter', { body: { token } });
      if (data?.error === 'expired' || data?.error === 'invalid_token') {
        toast({ variant: 'destructive', description: data.error === 'expired' ? 'This Creator Beta link has ended.' : 'This Creator Beta link is not valid.' });
        setLoading(false);
        return;
      }
      if (error || !data?.access_token) throw error ?? new Error('no session');

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) throw sessionError;

      navigate('/', { replace: true });
    } catch {
      toast({
        variant: 'destructive',
        description: 'Could not open Creator Beta right now. Please try again.',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <SEO
        noindex
        title="RecipeMaker Creator Beta — Full Access for Food Creators"
        description="Invited creators get the full RecipeMaker experience: unlimited recipes, AI features and creator tools. No sign-up needed."
      />
      <div className="w-full max-w-lg">
        <div className="rounded-3xl border border-border/70 bg-card shadow-card p-7 sm:p-10">
          <div className="flex items-center gap-2.5 mb-8">
            <span className="w-10 h-10 rounded-xl bg-primary/10 grid place-items-center">
              <img src={logo} alt="" className="w-5 h-5" />
            </span>
            <span className="font-display text-lg font-bold text-foreground">
              Recipe<span className="text-primary">Maker</span>
            </span>
            <span className="ml-auto rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-[0.14em] px-2.5 py-1">
              CREATOR BETA
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground leading-tight">
            Welcome to RecipeMaker Creator Beta
          </h1>
          <p className="mt-3 text-muted-foreground">
            You're invited to explore the full RecipeMaker experience.
          </p>

          <ul className="mt-7 space-y-3">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-secondary/70 grid place-items-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </span>
                <span className="text-sm text-foreground font-medium">{text}</span>
                <Check className="w-4 h-4 text-primary ml-auto" />
              </li>
            ))}
          </ul>

          <Button size="lg" className="w-full mt-8 gap-2 h-12" onClick={enter} disabled={loading}>
            {loading ? 'Opening…' : 'Enter RecipeMaker'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </Button>

          <p className="mt-4 text-xs text-muted-foreground text-center">
            No sign-up, no payment. This link gives you full creator access.
          </p>
        </div>
      </div>
    </div>
  );
}
