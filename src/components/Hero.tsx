import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChefHat, LogIn } from 'lucide-react';
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
    <div className="relative overflow-hidden bg-gradient-hero-animated animate-gradient grain">
      <div className="absolute inset-0 bg-black/30" />
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20 transition-transform duration-[20s] hover:scale-110"
        style={{ 
          backgroundImage: `url(${heroImage})`,
          filter: 'blur(2px)'
        }}
      />
      
      {/* Animated blob background */}
      <div className="absolute top-20 -right-20 w-96 h-96 bg-accent/20 blob blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-primary/20 blob blur-3xl" style={{ animationDelay: '-4s' }} />
      
      <div className="relative container mx-auto px-4 py-16 sm:py-24 md:py-36">
        <div className="max-w-4xl mx-auto text-center text-white">
          {!user && (
            <div className="mb-4 sm:mb-6 opacity-0 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="inline-flex items-center gap-2 sm:gap-3 glass-dark px-4 sm:px-6 py-2 sm:py-3 rounded-full shadow-warm magnetic cursor-pointer" onClick={() => navigate('/auth')}>
                <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs sm:text-sm font-semibold">
                  {language === 'en' ? 'Sign in to save your favorite recipes' : 'तुमच्या आवडत्या रेसिपी सेव्ह करण्यासाठी साइन इन करा'}
                </span>
              </div>
            </div>
          )}
          
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold mb-6 sm:mb-8 leading-tight opacity-0 animate-fade-in-up px-2" style={{ animationDelay: '0.3s' }}>
            <span className="inline-block">{language === 'en' ? 'Discover Recipes from' : 'तुमच्या आवडत्या'}</span>
            <br />
            <span className="inline-block gradient-text bg-gradient-to-r from-white via-accent to-white bg-clip-text">{language === 'en' ? 'Your Favorite Creators' : 'क्रिएटर्सच्या रेसिपी शोधा'}</span>
          </h1>

          {/* Rotating Tagline */}
          <div className="h-10 sm:h-12 mb-8 sm:mb-10 flex items-center justify-center px-4">
            <p 
              className={`text-lg sm:text-xl md:text-2xl font-medium text-accent transition-all duration-500 ease-out ${
                isAnimating ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'
              }`}
            >
              {taglines[language][currentTagline]}
            </p>
          </div>
          
          <div className="flex justify-center mb-12 opacity-0 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <Button 
              size="lg" 
              className="glass bg-white/90 text-primary hover:bg-white shadow-warm text-base sm:text-lg px-8 sm:px-10 py-5 sm:py-6 elastic btn-press font-semibold transition-all duration-300 hover:shadow-lg group"
              onClick={() => {
                const recipesSection = document.getElementById('recipes-section');
                if (recipesSection) {
                  recipesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
            >
              <ChefHat className="mr-2 w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
              {language === 'en' ? 'Discover Recipes' : 'रेसिपी एक्सप्लोर करा'}
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-10 text-sm md:text-base">
            <div className="flex items-center gap-2 glass-dark px-4 py-2 rounded-full opacity-0 animate-slide-in-left magnetic" style={{ animationDelay: '0.6s' }}>
              <div className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse" />
              <span className="font-medium">{language === 'en' ? '100+ Recipes' : '१००+ रेसिपी'}</span>
            </div>
            <div className="flex items-center gap-2 glass-dark px-4 py-2 rounded-full opacity-0 animate-slide-in-right magnetic" style={{ animationDelay: '0.7s' }}>
              <div className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse" />
              <span className="font-medium">{language === 'en' ? 'Smart Filters' : 'स्मार्ट फिल्टर्स'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};