import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, MessageSquare, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Contact() {
  const [language, setLanguage] = useState<'en' | 'mr'>('en');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: language === 'en' ? 'Error' : 'त्रुटी',
        description: language === 'en' 
          ? 'Please fill in all required fields' 
          : 'कृपया सर्व आवश्यक फील्ड भरा',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    // Simulate form submission (replace with actual API call in production)
    setTimeout(() => {
      toast({
        title: language === 'en' ? 'Message Sent!' : 'संदेश पाठवला!',
        description: language === 'en' 
          ? 'We\'ll get back to you within 24-48 hours' 
          : 'आम्ही 24-48 तासांच्या आत तुमच्याशी संपर्क साधू'
      });
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
      setIsSubmitting(false);
    }, 1000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-subtle">
      <SEO
        title="Contact Us - RecipeMaker Support"
        description="Get in touch with RecipeMaker team. Have questions, feedback, or need support? Contact us for help with recipes, subscriptions, or technical issues. We're here to help!"
        url="/contact"
      />
      <Navbar onSearch={() => {}} language={language} onLanguageToggle={() => setLanguage(language === 'en' ? 'mr' : 'en')} />
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 w-4 h-4" />
            {language === 'en' ? 'Back to Home' : 'होमकडे परत'}
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 text-foreground">
            {language === 'en' ? 'Contact Us' : 'आमच्याशी संपर्क साधा'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {language === 'en' 
              ? 'Have questions or feedback? We\'d love to hear from you!' 
              : 'प्रश्न किंवा अभिप्राय आहे? आम्हाला तुमच्याकडून ऐकायला आवडेल!'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                {language === 'en' ? 'Send us a message' : 'आम्हाला संदेश पाठवा'}
              </CardTitle>
              <CardDescription>
                {language === 'en' 
                  ? 'Fill out the form below and we\'ll respond as soon as possible' 
                  : 'खाली फॉर्म भरा आणि आम्ही लवकरात लवकर प्रतिसाद देऊ'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    {language === 'en' ? 'Name' : 'नाव'} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={language === 'en' ? 'Your name' : 'तुमचे नाव'}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    {language === 'en' ? 'Email' : 'ईमेल'} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={language === 'en' ? 'your@email.com' : 'तुमचा@ईमेल.com'}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">
                    {language === 'en' ? 'Subject' : 'विषय'}
                  </Label>
                  <Input
                    id="subject"
                    name="subject"
                    type="text"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder={language === 'en' ? 'What is this regarding?' : 'हे कशाबद्दल आहे?'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">
                    {language === 'en' ? 'Message' : 'संदेश'} <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder={language === 'en' ? 'Tell us more...' : 'आम्हाला अधिक सांगा...'}
                    rows={5}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-hero hover:opacity-90"
                  disabled={isSubmitting}
                >
                  <Send className="mr-2 w-4 h-4" />
                  {isSubmitting 
                    ? (language === 'en' ? 'Sending...' : 'पाठवत आहे...') 
                    : (language === 'en' ? 'Send Message' : 'संदेश पाठवा')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  {language === 'en' ? 'Email Us' : 'आम्हाला ईमेल करा'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {language === 'en' ? 'General Inquiries' : 'सामान्य चौकशी'}
                  </p>
                  <a href="mailto:support@recipemaker.com" className="text-primary hover:underline">
                    support@recipemaker.com
                  </a>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {language === 'en' ? 'Response Time' : 'प्रतिसाद वेळ'}
                  </p>
                  <p className="text-foreground">
                    {language === 'en' ? '24-48 hours' : '24-48 तास'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-primary/20 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">
                  {language === 'en' ? 'Frequently Asked Questions' : 'वारंवार विचारले जाणारे प्रश्न'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-foreground mb-1">
                    {language === 'en' ? 'How do I upgrade to Premium?' : 'मी प्रीमियममध्ये कसे अपग्रेड करू?'}
                  </p>
                  <p className="text-muted-foreground">
                    {language === 'en' 
                      ? 'Click the "Upgrade to Premium" button in the navbar and choose your plan.' 
                      : 'नेव्हबारमध्ये "प्रीमियममध्ये अपग्रेड करा" बटण क्लिक करा आणि तुमची योजना निवडा.'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">
                    {language === 'en' ? 'Can I cancel my subscription?' : 'मी माझे सदस्यत्व रद्द करू शकतो का?'}
                  </p>
                  <p className="text-muted-foreground">
                    {language === 'en' 
                      ? 'Yes, you can cancel anytime from your account settings.' 
                      : 'होय, तुम्ही तुमच्या खात्याच्या सेटिंग्जमधून कधीही रद्द करू शकता.'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">
                    {language === 'en' ? 'How do I report an issue?' : 'मी समस्येची तक्रार कशी करू?'}
                  </p>
                  <p className="text-muted-foreground">
                    {language === 'en' 
                      ? 'Use the contact form above or email us directly with details about the issue.' 
                      : 'वरील संपर्क फॉर्म वापरा किंवा समस्येबद्दल तपशीलांसह आम्हाला थेट ईमेल करा.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer language={language} />
    </div>
  );
}