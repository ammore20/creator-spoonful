import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

export default function PrivacyPolicy() {
  const [language, setLanguage] = useState<'en' | 'mr'>('en');

  return (
    <div className="min-h-screen flex flex-col bg-gradient-subtle">
      <Navbar onSearch={() => {}} language={language} onLanguageToggle={() => setLanguage(language === 'en' ? 'mr' : 'en')} />
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 w-4 h-4" />
            {language === 'en' ? 'Back to Home' : 'होमकडे परत'}
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-6 text-foreground">
          {language === 'en' ? 'Privacy Policy' : 'गोपनीयता धोरण'}
        </h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-foreground">
          <p className="text-muted-foreground">
            {language === 'en' ? 'Last updated: ' : 'शेवटचे अपडेट: '}
            {new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'mr-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '1. Information We Collect' : '१. आम्ही गोळा करतो ती माहिती'}
            </h2>
            <p className="text-foreground/90 leading-relaxed mb-3">
              {language === 'en' 
                ? 'We collect the following types of information:'
                : 'आम्ही खालील प्रकारची माहिती गोळा करतो:'}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li>
                <strong>{language === 'en' ? 'Account Information: ' : 'खाते माहिती: '}</strong>
                {language === 'en' 
                  ? 'Email address and password when you create an account'
                  : 'तुम्ही खाते तयार करता तेव्हा ईमेल पत्ता आणि पासवर्ड'}
              </li>
              <li>
                <strong>{language === 'en' ? 'Payment Information: ' : 'पेमेंट माहिती: '}</strong>
                {language === 'en' 
                  ? 'Payment details processed securely through Razorpay (we do not store card details)'
                  : 'Razorpay द्वारे सुरक्षितपणे प्रक्रिया केलेली पेमेंट तपशील (आम्ही कार्ड तपशील संग्रहित करत नाही)'}
              </li>
              <li>
                <strong>{language === 'en' ? 'Usage Data: ' : 'वापर डेटा: '}</strong>
                {language === 'en' 
                  ? 'Recipes viewed, searches performed, and interactions with the Service'
                  : 'पाहिलेल्या रेसिपी, केलेले शोध आणि सेवेसोबतचा संवाद'}
              </li>
              <li>
                <strong>{language === 'en' ? 'Device Information: ' : 'डिव्हाइस माहिती: '}</strong>
                {language === 'en' 
                  ? 'Browser type, IP address, and device identifiers'
                  : 'ब्राउझर प्रकार, IP पत्ता आणि डिव्हाइस ओळखकर्ते'}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '2. How We Use Your Information' : '२. आम्ही तुमची माहिती कशी वापरतो'}
            </h2>
            <p className="text-foreground/90 leading-relaxed mb-3">
              {language === 'en' 
                ? 'We use collected information to:'
                : 'आम्ही गोळा केलेली माहिती यासाठी वापरतो:'}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li>{language === 'en' ? 'Provide and maintain the Service' : 'सेवा प्रदान करणे आणि राखणे'}</li>
              <li>{language === 'en' ? 'Process payments and manage subscriptions' : 'पेमेंट प्रक्रिया आणि सदस्यत्व व्यवस्थापन'}</li>
              <li>{language === 'en' ? 'Send important updates and notifications' : 'महत्त्वाचे अद्यतने आणि सूचना पाठवणे'}</li>
              <li>{language === 'en' ? 'Improve and personalize user experience' : 'वापरकर्ता अनुभव सुधारणे आणि वैयक्तिकृत करणे'}</li>
              <li>{language === 'en' ? 'Detect and prevent fraud or abuse' : 'फसवणूक किंवा गैरवापर शोधणे आणि प्रतिबंध करणे'}</li>
              <li>{language === 'en' ? 'Comply with legal obligations' : 'कायदेशीर दायित्वांचे पालन करणे'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '3. Information Sharing' : '३. माहिती सामायिकरण'}
            </h2>
            <p className="text-foreground/90 leading-relaxed mb-3">
              {language === 'en' 
                ? 'We do not sell your personal information. We may share information with:'
                : 'आम्ही तुमची वैयक्तिक माहिती विकत नाही. आम्ही यांच्याशी माहिती सामायिक करू शकतो:'}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li>
                <strong>{language === 'en' ? 'Service Providers: ' : 'सेवा प्रदाते: '}</strong>
                {language === 'en' 
                  ? 'Razorpay for payment processing, cloud hosting providers'
                  : 'Razorpay पेमेंट प्रक्रियेसाठी, क्लाउड होस्टिंग प्रदाते'}
              </li>
              <li>
                <strong>{language === 'en' ? 'Legal Requirements: ' : 'कायदेशीर आवश्यकता: '}</strong>
                {language === 'en' 
                  ? 'When required by law or to protect rights and safety'
                  : 'कायद्यानुसार आवश्यक असताना किंवा हक्क आणि सुरक्षा संरक्षित करण्यासाठी'}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '4. Data Security' : '४. डेटा सुरक्षा'}
            </h2>
            <p className="text-foreground/90 leading-relaxed">
              {language === 'en' 
                ? 'We implement industry-standard security measures including encryption, secure authentication, and regular security audits. However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.'
                : 'आम्ही एन्क्रिप्शन, सुरक्षित प्रमाणीकरण आणि नियमित सुरक्षा ऑडिट समाविष्ट असलेल्या उद्योग-मानक सुरक्षा उपाय लागू करतो. तथापि, इंटरनेटवरील प्रसारणाची कोणतीही पद्धत 100% सुरक्षित नाही. आम्ही परिपूर्ण सुरक्षेची हमी देऊ शकत नाही.'}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '5. Cookies and Tracking' : '५. कुकीज आणि ट्रॅकिंग'}
            </h2>
            <p className="text-foreground/90 leading-relaxed">
              {language === 'en' 
                ? 'We use cookies and similar technologies to maintain your session, remember preferences, and analyze Service usage. You can control cookies through your browser settings, but this may affect functionality.'
                : 'आम्ही तुमचे सत्र राखण्यासाठी, प्राधान्ये लक्षात ठेवण्यासाठी आणि सेवा वापराचे विश्लेषण करण्यासाठी कुकीज आणि समान तंत्रज्ञान वापरतो. तुम्ही तुमच्या ब्राउझर सेटिंग्जद्वारे कुकीज नियंत्रित करू शकता, परंतु यामुळे कार्यक्षमता प्रभावित होऊ शकते.'}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '6. Your Rights' : '६. तुमचे हक्क'}
            </h2>
            <p className="text-foreground/90 leading-relaxed mb-3">
              {language === 'en' ? 'You have the right to:' : 'तुम्हाला याचा अधिकार आहे:'}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li>{language === 'en' ? 'Access and update your personal information' : 'तुमची वैयक्तिक माहिती प्रवेश आणि अद्यतनित करा'}</li>
              <li>{language === 'en' ? 'Request deletion of your account and data' : 'तुमचे खाते आणि डेटा हटवण्याची विनंती करा'}</li>
              <li>{language === 'en' ? 'Opt-out of marketing communications' : 'मार्केटिंग संप्रेषण ऑप्ट-आउट करा'}</li>
              <li>{language === 'en' ? 'Object to data processing in certain circumstances' : 'विशिष्ट परिस्थितीत डेटा प्रक्रियेवर आक्षेप घ्या'}</li>
            </ul>
            <p className="text-foreground/90 leading-relaxed mt-3">
              {language === 'en' 
                ? 'To exercise these rights, contact us at support@recipemaker.com'
                : 'हे अधिकार वापरण्यासाठी, आमच्याशी support@recipemaker.com वर संपर्क साधा'}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '7. Children\'s Privacy' : '७. मुलांची गोपनीयता'}
            </h2>
            <p className="text-foreground/90 leading-relaxed">
              {language === 'en' 
                ? 'RecipeMaker is not intended for children under 13 years of age. We do not knowingly collect personal information from children. If you believe we have inadvertently collected such information, please contact us immediately.'
                : 'RecipeMaker 13 वर्षांपेक्षा कमी वयाच्या मुलांसाठी नाही. आम्ही जाणूनबुजून मुलांकडून वैयक्तिक माहिती गोळा करत नाही. जर तुम्हाला विश्वास असेल की आम्ही अनवधानाने अशी माहिती गोळा केली आहे, तर कृपया आमच्याशी त्वरित संपर्क साधा.'}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '8. Changes to Privacy Policy' : '८. गोपनीयता धोरणातील बदल'}
            </h2>
            <p className="text-foreground/90 leading-relaxed">
              {language === 'en' 
                ? 'We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through the Service. Your continued use after changes constitutes acceptance.'
                : 'आम्ही वेळोवेळी हे गोपनीयता धोरण अद्यतनित करू शकतो. आम्ही तुम्हाला ईमेल किंवा सेवेद्वारे महत्त्वपूर्ण बदलांची सूचना देऊ. बदलांनंतर तुमचा सतत वापर स्वीकृतीचा भाग आहे.'}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              {language === 'en' ? '9. Contact Us' : '९. आमच्याशी संपर्क साधा'}
            </h2>
            <p className="text-foreground/90 leading-relaxed">
              {language === 'en' 
                ? 'For privacy-related questions or concerns, please contact us at:'
                : 'गोपनीयता-संबंधित प्रश्न किंवा चिंतेसाठी, कृपया आमच्याशी संपर्क साधा:'}
            </p>
            <p className="text-foreground/90 leading-relaxed mt-2">
              Email: support@recipemaker.com<br />
              {language === 'en' ? 'Or visit our Contact page' : 'किंवा आमचे संपर्क पृष्ठ भेट द्या'}
            </p>
          </section>
        </div>
      </main>

      <Footer language={language} />
    </div>
  );
}