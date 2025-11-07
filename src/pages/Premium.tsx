import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Check, ArrowLeft, Sparkles, Clock, Heart, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function Premium() {
  const [language, setLanguage] = useState<'en' | 'mr'>('en');

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'mr' : 'en');
  };

  const features = [
    {
      icon: Heart,
      title: language === 'en' ? 'Save Unlimited Recipes' : 'असीम रेसिपी सेव्ह करा',
      description: language === 'en' ? 'Never lose your favorite recipes again' : 'तुमच्या आवडत्या रेसिपी कधीच गमवू नका'
    },
    {
      icon: Sparkles,
      title: language === 'en' ? 'AI-Powered Suggestions' : 'AI-आधारित सूचना',
      description: language === 'en' ? 'Get personalized recipe recommendations' : 'वैयक्तिक रेसिपी शिफारशी मिळवा'
    },
    {
      icon: Clock,
      title: language === 'en' ? 'Smart Cooking Tools' : 'स्मार्ट कुकिंग टूल्स',
      description: language === 'en' ? 'Timers, serving adjusters & more' : 'टाइमर, सर्व्हिंग अॅडजस्टर आणि बरेच काही'
    },
    {
      icon: MessageSquare,
      title: language === 'en' ? 'Comment & Share' : 'कमेंट आणि शेअर',
      description: language === 'en' ? 'Engage with the community' : 'समुदायाशी संलग्न व्हा'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-subtle">
      <Navbar onSearch={() => {}} language={language} onLanguageToggle={toggleLanguage} />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {language === 'en' ? 'Back to Recipes' : 'रेसिपीकडे परत'}
        </Link>

        <div className="max-w-4xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-orange-600/10 px-4 py-2 rounded-full mb-6">
            <Crown className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-medium text-foreground">
              {language === 'en' ? 'Premium Membership' : 'प्रीमियम सदस्यत्व'}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
            {language === 'en' ? 'Unlock Premium Features' : 'प्रीमियम वैशिष्ट्ये अनलॉक करा'}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {language === 'en' 
              ? 'Access 1000+ premium recipes, smart tools, and AI-powered suggestions to enhance your cooking experience.'
              : '1000+ प्रीमियम रेसिपी, स्मार्ट टूल्स आणि AI-आधारित सूचना मिळवून तुमचा कुकिंग अनुभव वाढवा.'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="bg-card/50 backdrop-blur-sm border-border hover:shadow-warm transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-hero flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="max-w-md mx-auto bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-2 border-primary/20 shadow-warm">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">
              {language === 'en' ? 'Premium Plan' : 'प्रीमियम योजना'}
            </CardTitle>
            <div className="text-4xl font-bold my-4 text-foreground">
              ₹499
              <span className="text-lg font-normal text-muted-foreground">
                {language === 'en' ? '/year' : '/वर्ष'}
              </span>
            </div>
            <CardDescription>
              {language === 'en' ? 'One-time payment, lifetime access' : 'एकवेळची पेमेंट, आजीवन प्रवेश'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {[
                language === 'en' ? 'Unlimited recipe saves' : 'असीम रेसिपी सेव्ह',
                language === 'en' ? 'AI recipe suggestions' : 'AI रेसिपी सूचना',
                language === 'en' ? 'Smart cooking timers' : 'स्मार्ट कुकिंग टाइमर',
                language === 'en' ? 'Print & copy recipes' : 'रेसिपी प्रिंट आणि कॉपी',
                language === 'en' ? 'Comment & rate recipes' : 'कमेंट आणि रेट रेसिपी',
                language === 'en' ? 'Ad-free experience' : 'जाहिरात-मुक्त अनुभव',
                language === 'en' ? 'Priority support' : 'प्राथमिकता समर्थन'
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>
            <Button
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 shadow-warm h-12 text-lg mt-6"
            >
              <Crown className="mr-2 w-5 h-5" />
              {language === 'en' ? 'Upgrade Now' : 'आता अपग्रेड करा'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              {language === 'en' 
                ? 'Secure payment powered by Stripe'
                : 'Stripe द्वारे सुरक्षित पेमेंट'}
            </p>
          </CardContent>
        </Card>
      </main>

      <Footer language={language} />
    </div>
  );
}