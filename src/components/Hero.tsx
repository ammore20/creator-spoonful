import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface HeroProps {
  language: 'en' | 'mr';
}

const greetings = {
  en: ['Good morning', 'Good afternoon', 'Good evening'],
  mr: ['सुप्रभात', 'नमस्कार', 'शुभ संध्याकाळ'],
};

export const Hero = ({ language }: HeroProps) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? greetings[language][0] : hour < 17 ? greetings[language][1] : greetings[language][2];
  const firstName = user?.email?.split('@')[0]?.split('.')[0] ?? (language === 'en' ? 'friend' : 'मित्रा');

  return (
    <section className="relative overflow-hidden">
      {/* Soft cream backdrop with warm blush */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary via-background to-secondary/60" />
      <div className="absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -bottom-32 -left-16 w-[24rem] h-[24rem] rounded-full bg-accent/15 blur-3xl" />

      <div className="relative container mx-auto px-4 sm:px-6 pt-8 pb-10 sm:pt-14 sm:pb-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-3 py-1.5 border border-border shadow-soft mb-5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">
              {language === 'en' ? 'Handpicked recipes, updated daily' : 'दररोज नवीन निवडक रेसिपी'}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-[1.05] mb-3">
            {greeting}, <span className="text-primary">{firstName}</span>.
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-6">
            {language === 'en'
              ? 'What are we cooking today? Browse warm, easy recipes from creators you love.'
              : 'आज काय बनवायचं? तुमच्या आवडत्या क्रिएटर्सच्या सोप्या रेसिपी पहा.'}
          </p>

          {/* Search anchor */}
          <Link
            to="#recipes-section"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('recipes-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="group inline-flex items-center gap-3 w-full max-w-xl bg-card rounded-2xl border border-border shadow-card hover:shadow-warm transition-shadow px-4 py-3.5"
          >
            <Search className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-muted-foreground text-sm sm:text-base flex-1 text-left">
              {language === 'en' ? 'Search "paneer", "10 min snack", "sweet"…' : 'शोधा "पनीर", "१० मिनिटांचा स्नॅक"…'}
            </span>
            <span className="hidden sm:inline text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-md">↵</span>
          </Link>
        </div>
      </div>
    </section>
  );
};
