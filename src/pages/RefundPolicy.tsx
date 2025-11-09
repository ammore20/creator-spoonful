import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

export default function RefundPolicy() {
  const [language, setLanguage] = useState<'en' | 'mr'>('en');

  return (
    <div className="min-h-screen flex flex-col bg-gradient-subtle">
      <SEO
        title="Refund & Cancellation Policy - RecipeMaker Premium"
        description="Understand RecipeMaker's refund and cancellation policy for premium subscriptions. Learn about eligibility, refund process, timelines, and how to cancel your subscription."
        url="/refund"
      />
      <Navbar onSearch={() => {}} language={language} onLanguageToggle={() => setLanguage(language === 'en' ? 'mr' : 'en')} />
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 w-4 h-4" />
            {language === 'en' ? 'Back to Home' : 'होमकडे परत'}
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-6 text-foreground">
          {language === 'en' ? 'Refund & Cancellation Policy' : 'परतावा आणि रद्द करण्याचे धोरण'}
        </h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-foreground">
          <p className="text-muted-foreground">
            {language === 'en' ? 'Last updated: ' : 'शेवटचे अपडेट: '}
            {new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'mr-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '1. Refund Eligibility' : '१. परतावा पात्रता'}
            </h2>
            <p className="text-foreground/90 leading-relaxed mb-3">
              {language === 'en' 
                ? 'We offer refunds under the following conditions:'
                : 'आम्ही खालील परिस्थितीत परतावा देतो:'}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li>
                <strong>{language === 'en' ? 'Technical Issues: ' : 'तांत्रिक समस्या: '}</strong>
                {language === 'en' 
                  ? 'If you experience persistent technical problems preventing access to premium features within 7 days of purchase'
                  : 'जर तुम्हाला खरेदीच्या 7 दिवसांच्या आत प्रीमियम वैशिष्ट्यांमध्ये प्रवेश रोखणाऱ्या सतत तांत्रिक समस्या येत असतील'}
              </li>
              <li>
                <strong>{language === 'en' ? 'Duplicate Charges: ' : 'डुप्लिकेट शुल्क: '}</strong>
                {language === 'en' 
                  ? 'If you were charged multiple times for the same subscription'
                  : 'जर तुम्हाला समान सदस्यत्वासाठी एकापेक्षा जास्त वेळा शुल्क आकारले गेले असेल'}
              </li>
              <li>
                <strong>{language === 'en' ? 'Unauthorized Charges: ' : 'अनधिकृत शुल्क: '}</strong>
                {language === 'en' 
                  ? 'If a charge was made without your authorization'
                  : 'जर तुमच्या अधिकृततेशिवाय शुल्क लावले गेले असेल'}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '2. Non-Refundable Situations' : '२. परतावा न मिळणाऱ्या परिस्थिती'}
            </h2>
            <p className="text-foreground/90 leading-relaxed mb-3">
              {language === 'en' 
                ? 'Refunds will NOT be provided in the following cases:'
                : 'खालील प्रकरणांमध्ये परतावा दिला जाणार नाही:'}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li>{language === 'en' ? 'Change of mind after successful purchase' : 'यशस्वी खरेदीनंतर विचार बदलणे'}</li>
              <li>{language === 'en' ? 'After 7 days from the date of purchase' : 'खरेदीच्या तारखेपासून 7 दिवसांनंतर'}</li>
              <li>{language === 'en' ? 'If you violated our Terms of Service' : 'जर तुम्ही आमच्या सेवा अटींचे उल्लंघन केले असेल'}</li>
              <li>{language === 'en' ? 'For lifetime subscriptions after 14 days' : 'आजीवन सदस्यत्वासाठी 14 दिवसांनंतर'}</li>
              <li>{language === 'en' ? 'If significant features have been used or accessed' : 'जर महत्त्वपूर्ण वैशिष्ट्ये वापरली किंवा प्रवेश केला असेल'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '3. Subscription Cancellation' : '३. सदस्यत्व रद्द करणे'}
            </h2>
            <p className="text-foreground/90 leading-relaxed">
              {language === 'en' 
                ? 'You can cancel your subscription at any time from your account settings. Upon cancellation:'
                : 'तुम्ही तुमच्या खात्याच्या सेटिंग्जमधून कधीही तुमचे सदस्यत्व रद्द करू शकता. रद्द केल्यावर:'}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90 mt-3">
              <li>{language === 'en' ? 'You retain access until the end of your current billing period' : 'तुम्ही तुमच्या वर्तमान बिलिंग कालावधीच्या शेवटपर्यंत प्रवेश ठेवता'}</li>
              <li>{language === 'en' ? 'No refund will be provided for the remaining period' : 'उर्वरित कालावधीसाठी कोणताही परतावा दिला जाणार नाही'}</li>
              <li>{language === 'en' ? 'Auto-renewal will be disabled' : 'स्वयं-नूतनीकरण अक्षम केले जाईल'}</li>
              <li>{language === 'en' ? 'Your saved recipes and data will be retained for 90 days' : 'तुमच्या जतन केलेल्या रेसिपी आणि डेटा 90 दिवसांसाठी ठेवल्या जातील'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '4. How to Request a Refund' : '४. परतावा मागणी कशी करावी'}
            </h2>
            <p className="text-foreground/90 leading-relaxed mb-3">
              {language === 'en' 
                ? 'To request a refund, please follow these steps:'
                : 'परतावा मागण्यासाठी, कृपया या पायऱ्या फॉलो करा:'}
            </p>
            <ol className="list-decimal pl-6 space-y-2 text-foreground/90">
              <li>{language === 'en' ? 'Email us at support@recipemaker.com' : 'आम्हाला support@recipemaker.com वर ईमेल करा'}</li>
              <li>{language === 'en' ? 'Include your account email and transaction ID' : 'तुमचा खाते ईमेल आणि ट्रान्झॅक्शन ID समाविष्ट करा'}</li>
              <li>{language === 'en' ? 'Provide a detailed reason for the refund request' : 'परतावा विनंतीसाठी तपशीलवार कारण प्रदान करा'}</li>
              <li>{language === 'en' ? 'Attach relevant screenshots or documentation if applicable' : 'लागू असल्यास संबंधित स्क्रीनशॉट किंवा दस्तऐवज जोडा'}</li>
            </ol>
            <p className="text-foreground/90 leading-relaxed mt-3">
              {language === 'en' 
                ? 'We will review your request within 5-7 business days and respond via email.'
                : 'आम्ही 5-7 व्यावसायिक दिवसांच्या आत तुमच्या विनंतीचे पुनरावलोकन करू आणि ईमेलद्वारे प्रतिसाद देऊ.'}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '5. Refund Processing Time' : '५. परतावा प्रक्रिया वेळ'}
            </h2>
            <p className="text-foreground/90 leading-relaxed">
              {language === 'en' 
                ? 'If your refund is approved:'
                : 'जर तुमचा परतावा मंजूर झाला असेल:'}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90 mt-3">
              <li>{language === 'en' ? 'The refund will be processed through Razorpay' : 'परतावा Razorpay द्वारे प्रक्रिया केला जाईल'}</li>
              <li>{language === 'en' ? 'Refunds typically appear in your account within 5-10 business days' : 'परतावा सामान्यत: 5-10 व्यावसायिक दिवसांच्या आत तुमच्या खात्यात दिसतो'}</li>
              <li>{language === 'en' ? 'The exact time depends on your payment method and bank' : 'अचूक वेळ तुमच्या पेमेंट पद्धतीवर आणि बँकेवर अवलंबून असतो'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '6. Partial Refunds' : '६. आंशिक परतावा'}
            </h2>
            <p className="text-foreground/90 leading-relaxed">
              {language === 'en' 
                ? 'In certain situations, we may offer partial refunds on a case-by-case basis. This is at our sole discretion and typically applies when:'
                : 'काही परिस्थितीत, आम्ही प्रकरणानुसार आंशिक परतावा देऊ शकतो. हे आमच्या एकट्या विवेकबुद्धीनुसार आहे आणि सामान्यत: जेव्हा लागू होते:'}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90 mt-3">
              <li>{language === 'en' ? 'Service disruptions affected your experience significantly' : 'सेवा व्यत्यय तुमच्या अनुभवावर लक्षणीय परिणाम झाला'}</li>
              <li>{language === 'en' ? 'Features promised were not fully delivered' : 'वचन दिलेली वैशिष्ट्ये पूर्णपणे वितरित केली गेली नाहीत'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '7. Contact Information' : '७. संपर्क माहिती'}
            </h2>
            <p className="text-foreground/90 leading-relaxed">
              {language === 'en' 
                ? 'For refund and cancellation queries, please contact us at:'
                : 'परतावा आणि रद्द करण्याच्या चौकशीसाठी, कृपया आमच्याशी संपर्क साधा:'}
            </p>
            <p className="text-foreground/90 leading-relaxed mt-2">
              Email: support@recipemaker.com<br />
              {language === 'en' ? 'Response time: 24-48 hours' : 'प्रतिसाद वेळ: 24-48 तास'}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '8. Policy Changes' : '८. धोरण बदल'}
            </h2>
            <p className="text-foreground/90 leading-relaxed">
              {language === 'en' 
                ? 'We reserve the right to modify this Refund Policy at any time. Changes will be posted on this page with an updated revision date. Your continued use of the Service after changes constitutes acceptance of the modified policy.'
                : 'आम्ही हे परतावा धोरण कधीही सुधारित करण्याचा अधिकार राखून ठेवतो. बदल या पृष्ठावर अद्यतनित पुनरावृत्ती तारखेसह पोस्ट केले जातील. बदलांनंतर सेवेचा तुमचा सतत वापर म्हणजे सुधारित धोरणाची स्वीकृती आहे.'}
            </p>
          </section>
        </div>
      </main>

      <Footer language={language} />
    </div>
  );
}