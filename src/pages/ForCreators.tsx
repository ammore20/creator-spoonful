import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  Sparkles,
  Users,
  TrendingUp,
  ChefHat,
  Youtube,
  Zap,
  Heart,
  MessageCircle,
  Crown,
  ArrowRight,
  CheckCircle2,
  Phone,
  Mail,
  Languages,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import logo from '@/assets/logo.png';

const CONTACT_PHONE = '9324405985';
const CONTACT_EMAIL = 'abhishekmore4133@gmail.com';

type Lang = 'en' | 'mr';

const T = {
  en: {
    viewPlatform: 'View Platform',
    badge: 'For YouTube Food Creators',
    h1a: 'Turn Your Videos Into',
    h1b: 'Beautiful Recipes',
    heroP: 'We use AI to automatically extract and showcase your recipes, driving traffic back to your YouTube channel while giving your fans an enhanced cooking experience.',
    getFeatured: 'Get Featured',
    seeExamples: 'See Examples',
    revenue: 'Creators earn a 50% revenue share when their audience buys their recipe book.',
    howTitle: 'How It Works',
    howSub: 'We make your content work harder for you, completely hands-free',
    features: [
      ['AI-Powered Recipe Extraction', 'Our AI automatically extracts detailed recipes from your YouTube videos - ingredients, steps, cooking times, and nutritional info.'],
      ['Reach More Viewers', 'Your recipes become searchable and discoverable. Users can find your content through our smart filtering and search.'],
      ['Drive YouTube Traffic', 'Every recipe links back to your original video. We help viewers discover your channel and subscribe.'],
      ['Build Your Community', 'Users can favorite your recipes, leave comments, and engage with your content in new ways.'],
    ],
    stepsTitle: 'Simple 3-Step Process',
    steps: [
      ['Share Your Channel', "Just send us your YouTube channel link - that's all we need to get started."],
      ['We Extract Recipes', "We read your video's spoken transcript and captions, turn only what you actually say into a recipe, and a person reviews it before it goes live."],
      ['Get Featured', 'Your recipes go live on our platform with full credit and links back to your channel.'],
    ],
    whyTitle: 'Why Creators Love Us',
    whyP: "We're built by creators, for creators. Our platform is designed to amplify your reach without adding to your workload.",
    benefits: [
      'Zero effort - we handle everything automatically',
      'Your branding stays front and center',
      'Direct links to your YouTube channel',
      'Free exposure to our growing user base',
      'Beautiful recipe presentation',
      'Mobile-friendly experience for your fans',
    ],
    creditTitle: 'Your recipes, your credit',
    creditP: 'Every recipe links back to your channel, and you approve what goes into your book.',
    contactTitle: 'Contact Us',
    contactSub: 'Call, WhatsApp or email us directly — we reply quickly.',
    call: 'Call',
    whatsapp: 'WhatsApp',
    email: 'Email',
    ctaTitle: 'Ready to Get Featured?',
    ctaP: "Join our growing community of food creators. It's completely free and takes less than a minute to get started.",
    contactUs: 'Contact Us',
    explore: 'Explore Platform',
    footer: 'Made with ❤️ for food creators.',
    home: 'Home', contact: 'Contact', privacy: 'Privacy', terms: 'Terms',
  },
  mr: {
    viewPlatform: 'प्लॅटफॉर्म पहा',
    badge: 'YouTube फूड क्रिएटर्ससाठी',
    h1a: 'तुमचे व्हिडिओ बनवा',
    h1b: 'सुंदर रेसिपी',
    heroP: 'आम्ही AI वापरून तुमच्या व्हिडिओमधून रेसिपी आपोआप तयार करतो आणि दाखवतो. यामुळे तुमच्या YouTube चॅनलवर प्रेक्षक वाढतात आणि तुमच्या चाहत्यांना स्वयंपाकाचा उत्तम अनुभव मिळतो.',
    getFeatured: 'सहभागी व्हा',
    seeExamples: 'उदाहरणे पहा',
    revenue: 'तुमच्या प्रेक्षकांनी तुमचे रेसिपी पुस्तक विकत घेतल्यावर क्रिएटर्सना ५०% कमाई मिळते.',
    howTitle: 'हे कसे काम करते',
    howSub: 'तुमच्या कोणत्याही मेहनतीशिवाय, तुमचा कंटेंट तुमच्यासाठी जास्त काम करतो',
    features: [
      ['AI द्वारे रेसिपी तयार', 'आमचे AI तुमच्या YouTube व्हिडिओमधून साहित्य, कृती, वेळ आणि पोषणमूल्यांसह संपूर्ण रेसिपी आपोआप तयार करते.'],
      ['जास्त प्रेक्षकांपर्यंत पोहोचा', 'तुमच्या रेसिपी शोधता येतात. लोक आमच्या स्मार्ट फिल्टर आणि सर्चद्वारे तुमचा कंटेंट शोधू शकतात.'],
      ['YouTube वर प्रेक्षक वाढवा', 'प्रत्येक रेसिपीसोबत तुमचा मूळ व्हिडिओ असतो. प्रेक्षक तुमचे चॅनल शोधतात आणि सबस्क्राइब करतात.'],
      ['तुमचा समुदाय वाढवा', 'लोक तुमच्या रेसिपी आवडत्या म्हणून ठेवू शकतात, कमेंट करू शकतात आणि नव्या पद्धतीने जोडले जातात.'],
    ],
    stepsTitle: 'फक्त ३ सोप्या पायऱ्या',
    steps: [
      ['तुमचे चॅनल शेअर करा', 'फक्त तुमच्या YouTube चॅनलची लिंक पाठवा - सुरुवातीसाठी एवढेच पुरेसे आहे.'],
      ['आम्ही रेसिपी तयार करतो', 'आम्ही तुमच्या व्हिडिओमधील बोललेले शब्द आणि कॅप्शन वाचतो, तुम्ही जे सांगता तेवढेच रेसिपीमध्ये घेतो, आणि प्रसिद्ध करण्यापूर्वी एक व्यक्ती ती तपासते.'],
      ['प्रसिद्ध व्हा', 'तुमच्या रेसिपी तुमच्या नावासह आणि चॅनलच्या लिंकसह आमच्या प्लॅटफॉर्मवर प्रसिद्ध होतात.'],
    ],
    whyTitle: 'क्रिएटर्सना आम्ही का आवडतो',
    whyP: 'आम्ही क्रिएटर्ससाठी बनवलेले आहोत. तुमचे काम न वाढवता तुमची पोहोच वाढवणे हाच आमचा उद्देश आहे.',
    benefits: [
      'कोणतीही मेहनत नाही - सर्व काही आम्ही करतो',
      'तुमचे नाव आणि ब्रँड सर्वात पुढे',
      'तुमच्या YouTube चॅनलच्या थेट लिंक',
      'आमच्या वाढत्या प्रेक्षकांमध्ये मोफत प्रसिद्धी',
      'रेसिपीची सुंदर मांडणी',
      'तुमच्या चाहत्यांसाठी मोबाईलवर सोपा अनुभव',
    ],
    creditTitle: 'तुमच्या रेसिपी, तुमचे श्रेय',
    creditP: 'प्रत्येक रेसिपी तुमच्या चॅनलशी जोडलेली असते, आणि तुमच्या पुस्तकात काय जाईल ते तुम्ही ठरवता.',
    contactTitle: 'आमच्याशी संपर्क साधा',
    contactSub: 'थेट फोन, WhatsApp किंवा ईमेल करा — आम्ही लवकर उत्तर देतो.',
    call: 'फोन करा',
    whatsapp: 'WhatsApp',
    email: 'ईमेल',
    ctaTitle: 'सहभागी व्हायला तयार आहात?',
    ctaP: 'फूड क्रिएटर्सच्या आमच्या वाढत्या समुदायात सामील व्हा. हे पूर्णपणे मोफत आहे आणि सुरुवात करायला एका मिनिटापेक्षा कमी वेळ लागतो.',
    contactUs: 'संपर्क करा',
    explore: 'प्लॅटफॉर्म पहा',
    footer: 'फूड क्रिएटर्ससाठी ❤️ ने बनवले.',
    home: 'होम', contact: 'संपर्क', privacy: 'गोपनीयता', terms: 'अटी',
  },
};

const featureMeta = [
  { icon: Sparkles, color: 'from-purple-500 to-pink-500' },
  { icon: Users, color: 'from-blue-500 to-cyan-500' },
  { icon: TrendingUp, color: 'from-green-500 to-emerald-500' },
  { icon: Heart, color: 'from-red-500 to-orange-500' },
];

const ForCreators = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const [lang, setLang] = useState<Lang>(() =>
    (typeof window !== 'undefined' && localStorage.getItem('forCreatorsLang') === 'mr') ? 'mr' : 'en'
  );
  const t = T[lang];
  const toggleLang = () => {
    const next: Lang = lang === 'en' ? 'mr' : 'en';
    setLang(next);
    localStorage.setItem('forCreatorsLang', next);
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-hero rounded-xl flex items-center justify-center shadow-warm transition-transform group-hover:scale-110">
              <img src={logo} alt="RecipeMaker" className="w-7 h-7" />
            </div>
            <span className="text-xl font-bold gradient-text hidden sm:inline">RecipeMaker</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleLang} className="btn-press" aria-label="Change language">
              <Languages className="mr-1 w-4 h-4" />
              {lang === 'en' ? 'मराठी' : 'English'}
            </Button>
            <Link to="/">
              <Button variant="outline" size="sm" className="btn-press">
                {t.viewPlatform}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="blob w-[600px] h-[600px] bg-primary/20 -top-40 -right-40" />
          <div className="blob w-[400px] h-[400px] bg-secondary/20 bottom-0 -left-20" style={{ animationDelay: '-5s' }} />
        </div>

        <div className="container mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
            <Youtube className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium">{t.badge}</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in-up">
            {t.h1a}
            <span className="block gradient-text mt-2">{t.h1b}</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            {t.heroP}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <a href="#contact">
              <Button size="lg" className="elastic bg-gradient-hero text-white shadow-warm text-lg px-8">
                <Zap className="mr-2 w-5 h-5" />
                {t.getFeatured}
              </Button>
            </a>
            <Link to="/">
              <Button size="lg" variant="outline" className="btn-press text-lg px-8">
                <Play className="mr-2 w-5 h-5" />
                {t.seeExamples}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Revenue share */}
      <section className="py-10 px-4 bg-muted/30">
        <div className="container mx-auto text-center">
          <p className="text-lg md:text-xl font-medium text-foreground">{t.revenue}</p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">{t.howTitle}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{t.howSub}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {t.features.map(([title, description], index) => {
              const Icon = featureMeta[index].icon;
              return (
                <Card
                  key={index}
                  className={`group cursor-pointer transition-all duration-500 overflow-hidden border-2 ${
                    activeFeature === index ? 'border-primary shadow-lg scale-[1.02]' : 'border-transparent hover:border-primary/50'
                  }`}
                  onMouseEnter={() => setActiveFeature(index)}
                >
                  <CardContent className="p-8">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${featureMeta[index].color} flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:rotate-6`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">{t.stepsTitle}</h2>
          </div>

          <div className="space-y-8">
            {t.steps.map(([title, desc], index) => (
              <div key={index} className="flex gap-6 items-start animate-fade-in-up" style={{ animationDelay: `${index * 0.15}s` }}>
                <div className="w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center shrink-0 shadow-warm">
                  <span className="text-xl font-bold text-white">{index + 1}</span>
                </div>
                <div className="flex-1 pb-8 border-b border-border/50 last:border-0">
                  <h3 className="text-xl font-bold mb-2">{title}</h3>
                  <p className="text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">{t.whyTitle}</h2>
              <p className="text-muted-foreground mb-8">{t.whyP}</p>
              <div className="space-y-4">
                {t.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-hero opacity-20 blur-3xl rounded-full" />
              <Card className="relative overflow-hidden border-2 border-primary/20">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-hero mx-auto mb-6 flex items-center justify-center">
                    <ChefHat className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-lg mb-2 font-medium">{t.creditTitle}</p>
                  <p className="text-muted-foreground">{t.creditP}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 bg-muted/30 scroll-mt-24">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">{t.contactTitle}</h2>
          <p className="text-muted-foreground mb-8">{t.contactSub}</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <a href={`tel:+91${CONTACT_PHONE}`}>
              <Card className="h-full border-2 border-primary/20 hover:border-primary transition-colors">
                <CardContent className="p-6 flex flex-col items-center gap-2">
                  <Phone className="w-7 h-7 text-primary" />
                  <span className="font-semibold">{t.call}</span>
                  <span className="text-sm text-muted-foreground">+91 {CONTACT_PHONE}</span>
                </CardContent>
              </Card>
            </a>
            <a href={`https://wa.me/91${CONTACT_PHONE}`} target="_blank" rel="noopener noreferrer">
              <Card className="h-full border-2 border-primary/20 hover:border-primary transition-colors">
                <CardContent className="p-6 flex flex-col items-center gap-2">
                  <MessageCircle className="w-7 h-7 text-primary" />
                  <span className="font-semibold">{t.whatsapp}</span>
                  <span className="text-sm text-muted-foreground">+91 {CONTACT_PHONE}</span>
                </CardContent>
              </Card>
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`}>
              <Card className="h-full border-2 border-primary/20 hover:border-primary transition-colors">
                <CardContent className="p-6 flex flex-col items-center gap-2">
                  <Mail className="w-7 h-7 text-primary" />
                  <span className="font-semibold">{t.email}</span>
                  <span className="text-sm text-muted-foreground break-all">{CONTACT_EMAIL}</span>
                </CardContent>
              </Card>
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-hero opacity-10 blur-3xl rounded-full" />
            <Card className="relative border-2 border-primary/20 overflow-hidden">
              <CardContent className="p-12">
                <Crown className="w-16 h-16 mx-auto mb-6 text-primary animate-float" />
                <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.ctaTitle}</h2>
                <p className="text-muted-foreground mb-8 max-w-lg mx-auto">{t.ctaP}</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a href="#contact">
                    <Button size="lg" className="elastic bg-gradient-hero text-white shadow-warm text-lg px-8">
                      <MessageCircle className="mr-2 w-5 h-5" />
                      {t.contactUs}
                    </Button>
                  </a>
                  <Link to="/">
                    <Button size="lg" variant="outline" className="btn-press text-lg px-8">
                      {t.explore}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} RecipeMaker. {t.footer}</p>
          <div className="flex justify-center gap-6 mt-4">
            <Link to="/" className="hover:text-foreground transition-colors">{t.home}</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">{t.contact}</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">{t.privacy}</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">{t.terms}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ForCreators;
