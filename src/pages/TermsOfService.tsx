import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

export default function TermsOfService() {
  const [language, setLanguage] = useState<'en' | 'mr'>('en');

  return (
    <div className="min-h-screen flex flex-col bg-gradient-subtle">
      <SEO
        title="Terms of Service - RecipeMaker Legal"
        description="Read RecipeMaker's Terms of Service to understand the rules and regulations governing your use of our platform, including user accounts, content usage, and premium subscriptions."
        url="/terms"
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
          {language === 'en' ? 'Terms of Service' : 'सेवा अटी'}
        </h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-foreground">
          <p className="text-muted-foreground">
            {language === 'en' ? 'Last updated: ' : 'शेवटचे अपडेट: '}
            {new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'mr-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '1. Acceptance of Terms' : '१. अटींची स्वीकृती'}
            </h2>
            <p className="text-foreground/90 leading-relaxed">
              {language === 'en' 
                ? 'By accessing and using RecipeMaker ("the Service"), you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use the Service.'
                : 'RecipeMaker ("सेवा") वापरून आणि प्रवेश करून, तुम्ही या कराराच्या अटी आणि तरतुदींना बांधील असण्यास स्वीकारता आणि सहमत आहात. जर तुम्ही या अटींशी सहमत नसाल, तर कृपया सेवा वापरू नका.'}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '2. Use of Service' : '२. सेवेचा वापर'}
            </h2>
            <p className="text-foreground/90 leading-relaxed mb-3">
              {language === 'en' 
                ? 'RecipeMaker provides AI-transcribed recipes from YouTube food creators. You agree to:'
                : 'RecipeMaker YouTube फूड क्रिएटर्सकडून AI-प्रतिलेखित रेसिपी प्रदान करते. तुम्ही याला सहमत आहात:'}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li>{language === 'en' ? 'Use the Service only for lawful purposes' : 'केवळ कायदेशीर हेतूंसाठी सेवा वापरा'}</li>
              <li>{language === 'en' ? 'Not copy, reproduce, or distribute content without permission' : 'परवानगीशिवाय सामग्री कॉपी, पुनरुत्पादन किंवा वितरित करू नका'}</li>
              <li>{language === 'en' ? 'Not attempt to gain unauthorized access to any part of the Service' : 'सेवेच्या कोणत्याही भागासाठी अनधिकृत प्रवेश मिळविण्याचा प्रयत्न करू नका'}</li>
              <li>{language === 'en' ? 'Not use the Service to transmit harmful code or malware' : 'हानिकारक कोड किंवा मालवेअर प्रसारित करण्यासाठी सेवा वापरू नका'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '3. User Accounts' : '३. वापरकर्ता खाती'}
            </h2>
            <p className="text-foreground/90 leading-relaxed">
              {language === 'en' 
                ? 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.'
                : 'तुम्ही तुमच्या खात्याच्या क्रेडेन्शियल्सची गोपनीयता राखण्यासाठी आणि तुमच्या खात्याखाली होणाऱ्या सर्व क्रियाकलापांसाठी जबाबदार आहात. तुमच्या खात्याच्या कोणत्याही अनधिकृत वापराची तुम्ही आम्हाला त्वरित सूचना दिली पाहिजे.'}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '4. Premium Membership' : '४. प्रीमियम सदस्यत्व'}
            </h2>
            <p className="text-foreground/90 leading-relaxed mb-3">
              {language === 'en' 
                ? 'Premium subscriptions provide access to exclusive features including:'
                : 'प्रीमियम सदस्यत्व खालील विशेष वैशिष्ट्यांमध्ये प्रवेश प्रदान करते:'}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li>{language === 'en' ? 'Unlimited recipe saves' : 'अमर्यादित रेसिपी सेव्ह'}</li>
              <li>{language === 'en' ? 'AI-powered suggestions' : 'AI-आधारित सूचना'}</li>
              <li>{language === 'en' ? 'Ad-free experience' : 'जाहिरात-मुक्त अनुभव'}</li>
              <li>{language === 'en' ? 'Priority support' : 'प्राथमिक समर्थन'}</li>
            </ul>
            <p className="text-foreground/90 leading-relaxed mt-3">
              {language === 'en' 
                ? 'Payments are processed securely through Razorpay. Subscriptions automatically renew unless cancelled before the renewal date.'
                : 'पेमेंट Razorpay द्वारे सुरक्षितपणे प्रक्रिया केले जातात. नूतनीकरण तारखेपूर्वी रद्द केल्याशिवाय सदस्यत्व स्वयंचलितपणे नूतनीकरण होते.'}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '5. Intellectual Property' : '५. बौद्धिक संपत्ती'}
            </h2>
            <p className="text-foreground/90 leading-relaxed">
              {language === 'en' 
                ? 'All content, including recipes, text, graphics, logos, and software, is the property of RecipeMaker or its content suppliers. Original YouTube videos and content belong to their respective creators. You may not copy, modify, distribute, or create derivative works without permission.'
                : 'रेसिपी, मजकूर, ग्राफिक्स, लोगो आणि सॉफ्टवेअरसह सर्व सामग्री RecipeMaker किंवा त्याच्या सामग्री पुरवठादारांची मालमत्ता आहे. मूळ YouTube व्हिडिओ आणि सामग्री त्यांच्या संबंधित निर्मात्यांची आहे. तुम्ही परवानगीशिवाय कॉपी, सुधारणा, वितरण किंवा व्युत्पन्न कार्ये तयार करू शकत नाही.'}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '6. Limitation of Liability' : '६. दायित्वाची मर्यादा'}
            </h2>
            <p className="text-foreground/90 leading-relaxed">
              {language === 'en' 
                ? 'RecipeMaker is provided "as is" without warranties of any kind. We do not guarantee the accuracy, completeness, or reliability of recipes. Use recipes at your own risk. RecipeMaker shall not be liable for any damages arising from the use of the Service.'
                : 'RecipeMaker कोणत्याही प्रकारच्या हमीशिवाय "जसे आहे" प्रदान केले जाते. आम्ही रेसिपींची अचूकता, पूर्णता किंवा विश्वासार्हतेची हमी देत ​​नाही. तुमच्या स्वतःच्या जोखमीवर रेसिपी वापरा. सेवेच्या वापरामुळे उद्भवणाऱ्या कोणत्याही नुकसानासाठी RecipeMaker जबाबदार राहणार नाही.'}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '7. Changes to Terms' : '७. अटींमध्ये बदल'}
            </h2>
            <p className="text-foreground/90 leading-relaxed">
              {language === 'en' 
                ? 'We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Continued use of the Service constitutes acceptance of modified terms.'
                : 'आम्ही या अटी कधीही सुधारित करण्याचा अधिकार राखून ठेवतो. पोस्ट केल्यानंतर बदल त्वरित प्रभावी होतील. सेवेचा सतत वापर म्हणजे सुधारित अटींची स्वीकृती आहे.'}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '8. Contact Information' : '८. संपर्क माहिती'}
            </h2>
            <p className="text-foreground/90 leading-relaxed">
              {language === 'en' 
                ? 'For questions about these Terms of Service, please contact us through our Contact page or email us at support@recipemaker.com'
                : 'या सेवा अटींबद्दल प्रश्नांसाठी, कृपया आमच्या संपर्क पृष्ठाद्वारे आमच्याशी संपर्क साधा किंवा आम्हाला support@recipemaker.com वर ईमेल करा'}
            </p>
          </section>
        </div>
      </main>

      <Footer language={language} />
    </div>
  );
}