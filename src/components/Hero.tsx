import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChefHat, Sparkles, LogIn, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import heroImage from '@/assets/hero-food.jpg';

interface HeroProps {
  language: 'en' | 'mr';
}

const taglines = {
  en: [
    "Craving something spicy?",
    "Need a 10-min snack?",
    "Try Sarita's trending dishes!",
    "Looking for comfort food?",
    "Perfect recipe for any mood!"
  ],
  mr: [
    "तिखट काहीतरी हवं आहे?",
    "१० मिनिटांचा स्नॅक हवा?",
    "सरिताच्या ट्रेंडिंग डिशेस!",
    "कम्फर्ट फूड शोधत आहात?",
    "प्रत्येक मूडसाठी परफेक्ट रेसिपी!"
  ]
};

export const Hero = ({ language }: HeroProps) => {
  const [currentTagline, setCurrentTagline] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [hasPremium, setHasPremium] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkPremiumStatus(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkPremiumStatus(session.user.id);
      } else {
        setHasPremium(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkPremiumStatus = async (userId: string) => {
    const { data } = await supabase
      .from('subscriptions')
      .select('status, expires_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (data) {
      const isExpired = new Date(data.expires_at) < new Date();
      setHasPremium(!isExpired);
    } else {
      setHasPremium(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentTagline((prev) => (prev + 1) % taglines[language].length);
        setIsAnimating(false);
      }, 500);
    }, 4000);

    return () => clearInterval(interval);
  }, [language]);

  return (
    <div className="relative overflow-hidden bg-gradient-hero-animated animate-gradient">
      <div className="absolute inset-0 bg-black/30" />
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-15"
        style={{ 
          backgroundImage: `url(${heroImage})`,
          filter: 'blur(3px)'
        }}
      />
      
      <div className="relative container mx-auto px-4 py-24 md:py-36">
        <div className="max-w-4xl mx-auto text-center text-white">
          {!user && (
            <div className="mb-6 animate-fade-in">
              <div className="inline-flex items-center gap-3 bg-accent/90 backdrop-blur-sm px-6 py-3 rounded-full border border-white/30 shadow-warm hover:scale-105 transition-transform cursor-pointer" onClick={() => navigate('/auth')}>
                <LogIn className="w-5 h-5" />
                <span className="text-sm font-semibold">
                  {language === 'en' ? 'Sign in to save your favorite recipes' : 'तुमच्या आवडत्या रेसिपी सेव्ह करण्यासाठी साइन इन करा'}
                </span>
              </div>
            </div>
          )}
          
          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight animate-fade-in">
            {language === 'en' 
              ? 'Discover Recipes from Your Favorite Creators'
              : 'तुमच्या आवडत्या क्रिएटर्सच्या रेसिपी शोधा'}
          </h1>

          {/* Rotating Tagline */}
          <div className="h-12 mb-10 flex items-center justify-center">
            <p 
              className={`text-xl md:text-2xl font-medium text-accent transition-all duration-500 ${
                isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0 animate-text-slide-up'
              }`}
            >
              {taglines[language][currentTagline]}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90 shadow-warm text-lg px-10 py-6 ripple font-semibold"
              onClick={() => {
                const recipesSection = document.getElementById('recipes-section');
                if (recipesSection) {
                  recipesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
            >
              <ChefHat className="mr-2 w-6 h-6" />
              {language === 'en' ? 'Discover Recipes' : 'रेसिपी एक्सप्लोर करा'}
            </Button>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-accent to-primary text-white hover:opacity-90 text-lg px-10 py-6 shadow-warm ripple font-semibold border-0"
              onClick={() => navigate(hasPremium ? '/install' : '/premium')}
            >
              <Smartphone className="mr-2 w-6 h-6" />
              {language === 'en' ? 'Download App' : 'अॅप डाउनलोड करा'}
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-sm md:text-base">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
              <div className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse" />
              <span className="font-medium">{language === 'en' ? '100+ Recipes' : '१००+ रेसिपी'}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
              <div className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse" />
              <span className="font-medium">{language === 'en' ? 'Smart Filters' : 'स्मार्ट फिल्टर्स'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};