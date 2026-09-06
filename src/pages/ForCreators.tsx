import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Play, 
  Sparkles, 
  Users, 
  TrendingUp, 
  Clock, 
  ChefHat,
  Youtube,
  Zap,
  Heart,
  MessageCircle,
  Crown,
  ArrowRight,
  CheckCircle2,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import logo from '@/assets/logo.png';

const ForCreators = () => {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Recipe Extraction",
      description: "Our AI automatically extracts detailed recipes from your YouTube videos - ingredients, steps, cooking times, and nutritional info.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Users,
      title: "Reach More Viewers",
      description: "Your recipes become searchable and discoverable. Users can find your content through our smart filtering and search.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: TrendingUp,
      title: "Drive YouTube Traffic",
      description: "Every recipe links back to your original video. We help viewers discover your channel and subscribe.",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Heart,
      title: "Build Your Community",
      description: "Users can favorite your recipes, leave comments, and engage with your content in new ways.",
      color: "from-red-500 to-orange-500"
    }
  ];

  const benefits = [
    "Zero effort - we handle everything automatically",
    "Your branding stays front and center",
    "Direct links to your YouTube channel",
    "Free exposure to our growing user base",
    "Beautiful recipe presentation",
    "Mobile-friendly experience for your fans"
  ];

  const stats = [
    { value: "10K+", label: "Monthly Visitors" },
    { value: "500+", label: "Recipes Available" },
    { value: "50+", label: "Featured Creators" },
    { value: "4.9★", label: "User Rating" }
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-hero rounded-xl flex items-center justify-center shadow-warm transition-transform group-hover:scale-110">
              <img src={logo} alt="RecipeMaker" className="w-7 h-7" />
            </div>
            <span className="text-xl font-bold gradient-text">RecipeMaker</span>
          </Link>
          <Link to="/">
            <Button variant="outline" className="btn-press">
              View Platform
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="blob w-[600px] h-[600px] bg-primary/20 -top-40 -right-40" />
          <div className="blob w-[400px] h-[400px] bg-secondary/20 bottom-0 -left-20" style={{ animationDelay: '-5s' }} />
        </div>
        
        <div className="container mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
            <Youtube className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium">For YouTube Food Creators</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in-up">
            Turn Your Videos Into
            <span className="block gradient-text mt-2">Beautiful Recipes</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            We use AI to automatically extract and showcase your recipes, driving traffic back to your YouTube channel while giving your fans an enhanced cooking experience.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <Link to="/contact">
              <Button size="lg" className="elastic bg-gradient-hero text-white shadow-warm text-lg px-8">
                <Zap className="mr-2 w-5 h-5" />
                Get Featured
              </Button>
            </Link>
            <Link to="/">
              <Button size="lg" variant="outline" className="btn-press text-lg px-8">
                <Play className="mr-2 w-5 h-5" />
                See Examples
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div 
                key={index}
                className="text-center p-6 rounded-2xl bg-background/50 backdrop-blur-sm border border-border/50 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-3xl md:text-4xl font-bold gradient-text mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              We make your content work harder for you, completely hands-free
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className={`group cursor-pointer transition-all duration-500 overflow-hidden border-2 ${
                  activeFeature === index ? 'border-primary shadow-lg scale-[1.02]' : 'border-transparent hover:border-primary/50'
                }`}
                onMouseEnter={() => setActiveFeature(index)}
              >
                <CardContent className="p-8">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:rotate-6`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple 3-Step Process</h2>
          </div>
          
          <div className="space-y-8">
            {[
              { step: 1, title: "Share Your Channel", desc: "Just send us your YouTube channel link - that's all we need to get started." },
              { step: 2, title: "We Extract Recipes", desc: "Our AI watches your videos and extracts detailed recipes with ingredients, steps, and timing." },
              { step: 3, title: "Get Featured", desc: "Your recipes go live on our platform with full credit and links back to your channel." }
            ].map((item, index) => (
              <div 
                key={index}
                className="flex gap-6 items-start animate-fade-in-up"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center shrink-0 shadow-warm">
                  <span className="text-xl font-bold text-white">{item.step}</span>
                </div>
                <div className="flex-1 pb-8 border-b border-border/50 last:border-0">
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
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
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Why Creators Love Us</h2>
              <p className="text-muted-foreground mb-8">
                We're built by creators, for creators. Our platform is designed to amplify your reach without adding to your workload.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
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
                  <div className="flex justify-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <blockquote className="text-lg mb-4 italic">
                    "RecipeMaker has helped me reach thousands of new viewers. My subscribers love having easy access to my recipes!"
                  </blockquote>
                  <p className="font-medium">— Featured Creator</p>
                </CardContent>
              </Card>
            </div>
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
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Featured?</h2>
                <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                  Join our growing community of food creators. It's completely free and takes less than a minute to get started.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/contact">
                    <Button size="lg" className="elastic bg-gradient-hero text-white shadow-warm text-lg px-8">
                      <MessageCircle className="mr-2 w-5 h-5" />
                      Contact Us
                    </Button>
                  </Link>
                  <Link to="/">
                    <Button size="lg" variant="outline" className="btn-press text-lg px-8">
                      Explore Platform
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
          <p>© {new Date().getFullYear()} RecipeMaker. Made with ❤️ for food creators.</p>
          <div className="flex justify-center gap-6 mt-4">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ForCreators;
