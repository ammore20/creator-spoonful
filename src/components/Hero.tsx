import { Button } from '@/components/ui/button';
import { ChefHat, Sparkles } from 'lucide-react';
import heroImage from '@/assets/hero-food.jpg';

interface HeroProps {
  language: 'en' | 'mr';
}

export const Hero = ({ language }: HeroProps) => {
  return (
    <div className="relative overflow-hidden bg-gradient-hero">
      <div className="absolute inset-0 bg-black/40" />
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      <div className="relative container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center text-white">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-white/20">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">
              {language === 'en' ? 'AI-Powered Recipe Platform' : 'AI-चालित रेसिपी प्लॅटफॉर्म'}
            </span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            {language === 'en' 
              ? 'Discover Recipes from Your Favorite Creators'
              : 'तुमच्या आवडत्या क्रिएटर्सच्या रेसिपी शोधा'}
          </h1>
          
          <p className="text-lg md:text-xl mb-8 text-white/90 leading-relaxed">
            {language === 'en'
              ? 'AI-transcribed recipes from YouTube food creators. Filter by taste, mood, cuisine, and more. Start cooking with ease!'
              : 'YouTube फूड क्रिएटर्सच्या AI-प्रतिलेखित रेसिपी. चव, मूड, पाककृती आणि अधिक फिल्टर करा. सहजपणे स्वयंपाक सुरू करा!'}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-warm text-lg px-8">
              <ChefHat className="mr-2 w-5 h-5" />
              {language === 'en' ? 'Explore Recipes' : 'रेसिपी एक्सप्लोर करा'}
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white hover:text-primary text-lg px-8"
            >
              {language === 'en' ? 'Subscribe for ₹99/mo' : '₹99/महिना सदस्यता घ्या'}
            </Button>
          </div>
          
          <div className="mt-12 flex items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-accent rounded-full" />
              <span>{language === 'en' ? '100+ Recipes' : '१००+ रेसिपी'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-accent rounded-full" />
              <span>{language === 'en' ? 'AI Transcribed' : 'AI प्रतिलेखित'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-accent rounded-full" />
              <span>{language === 'en' ? 'Smart Filters' : 'स्मार्ट फिल्टर्स'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
