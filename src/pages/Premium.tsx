import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Crown, Check, ArrowLeft, Sparkles, Clock, Heart, MessageSquare, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@supabase/supabase-js';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Premium() {
  const [language, setLanguage] = useState<'en' | 'mr'>('en');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          checkAdminRole(session.user.id);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

      setIsAdmin(!!data);
    } catch (error) {
      setIsAdmin(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'mr' : 'en');
  };

  const handlePayment = async (amount: number, planName: string) => {
    if (!user) {
      toast({
        title: language === 'en' ? 'Authentication Required' : 'प्रमाणीकरण आवश्यक',
        description: language === 'en' ? 'Please sign in to upgrade to premium' : 'प्रीमियममध्ये अपग्रेड करण्यासाठी कृपया साइन इन करा',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Create Razorpay order
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'razorpay-checkout',
        {
          body: { action: 'create-order', amount },
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      if (orderError) throw orderError;

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'RecipeMaker',
        description: 'Premium Membership',
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            // Verify payment
            const { error: verifyError } = await supabase.functions.invoke(
              'razorpay-checkout',
              {
                body: {
                  action: 'verify-payment',
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  amount: amount, // Pass amount for expiry calculation
                },
                headers: {
                  Authorization: `Bearer ${session?.access_token}`,
                },
              }
            );

            if (verifyError) throw verifyError;

            toast({
              title: language === 'en' ? 'Payment Successful!' : 'पेमेंट यशस्वी!',
              description: language === 'en' 
                ? 'Welcome to Premium! Enjoy all the exclusive features.' 
                : 'प्रीमियममध्ये आपले स्वागत आहे! सर्व खास वैशिष्ट्यांचा आनंद घ्या.',
            });

            navigate('/');
          } catch (err: any) {
            console.error('Payment verification error:', err);
            toast({
              title: language === 'en' ? 'Payment Verification Failed' : 'पेमेंट सत्यापन अयशस्वी',
              description: err.message,
              variant: 'destructive',
            });
          }
        },
        prefill: {
          email: user.email,
        },
        theme: {
          color: '#f59e0b',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

      razorpay.on('payment.failed', function (response: any) {
        toast({
          title: language === 'en' ? 'Payment Failed' : 'पेमेंट अयशस्वी',
          description: response.error.description,
          variant: 'destructive',
        });
      });

    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: language === 'en' ? 'Error' : 'त्रुटी',
        description: error.message || (language === 'en' ? 'Failed to initiate payment' : 'पेमेंट सुरू करण्यात अयशस्वी'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const pricingPlans = [
    {
      name: language === 'en' ? 'Monthly Plan' : 'मासिक योजना',
      price: 99,
      period: language === 'en' ? '/month' : '/महिना',
      description: language === 'en' ? 'Billed monthly' : 'मासिक बिल',
      amount: 9900, // Amount in paise
    },
    {
      name: language === 'en' ? 'Yearly Plan' : 'वार्षिक योजना',
      price: 499,
      period: language === 'en' ? '/year' : '/वर्ष',
      description: language === 'en' ? 'Save 58% with annual billing' : 'वार्षिक बिलिंगसह 58% वाचवा',
      amount: 49900, // Amount in paise
      popular: true,
    },
    {
      name: language === 'en' ? 'Lifetime Access' : 'आजीवन प्रवेश',
      price: 999,
      period: language === 'en' ? 'one-time' : 'एकवेळ',
      description: language === 'en' ? 'Pay once, own forever' : 'एकदा पैसे द्या, कायमचे मिळवा',
      amount: 99900, // Amount in paise
    },
  ];

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
      <SEO
        title="Premium Membership - Unlock Exclusive Marathi Recipes"
        description="Subscribe to RecipeMaker Premium and get access to 1000+ exclusive Marathi recipes, save unlimited favorites, download recipes, AI-powered suggestions, and personalized meal planning. Plans starting at ₹99/month."
        url="/premium"
      />
      <Navbar onSearch={() => {}} language={language} onLanguageToggle={toggleLanguage} />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {language === 'en' ? 'Back to Recipes' : 'रेसिपीकडे परत'}
          </Link>
          {isAdmin && (
            <Button onClick={() => navigate('/admin')} variant="outline">
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              {language === 'en' ? 'Switch to Admin' : 'अॅडमिनकडे जा'}
            </Button>
          )}
        </div>

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

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <Card 
              key={index} 
              className={`bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-2 shadow-warm relative ${
                plan.popular ? 'border-primary shadow-xl scale-105' : 'border-primary/20'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  {language === 'en' ? 'Most Popular' : 'सर्वाधिक लोकप्रिय'}
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">
                  {plan.name}
                </CardTitle>
                <div className="text-4xl font-bold my-4 text-foreground">
                  ₹{plan.price}
                  <span className="text-lg font-normal text-muted-foreground block mt-1">
                    {plan.period}
                  </span>
                </div>
                <CardDescription className="min-h-[40px]">
                  {plan.description}
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
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => handlePayment(plan.amount, plan.name)}
                  disabled={loading}
                  className={`w-full text-white hover:opacity-90 shadow-warm h-12 text-lg mt-6 ${
                    plan.popular 
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600' 
                      : 'bg-gradient-to-r from-amber-400 to-orange-500'
                  }`}
                >
                  <Crown className="mr-2 w-5 h-5" />
                  {loading 
                    ? (language === 'en' ? 'Processing...' : 'प्रक्रिया करत आहे...') 
                    : (language === 'en' ? 'Upgrade Now' : 'आता अपग्रेड करा')
                  }
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  {language === 'en' 
                    ? 'Secure payment powered by Razorpay'
                    : 'Razorpay द्वारे सुरक्षित पेमेंट'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <Footer language={language} />
    </div>
  );
}