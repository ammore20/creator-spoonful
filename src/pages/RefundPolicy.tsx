import { Link } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

export default function RefundPolicy() {
  const [language, setLanguage] = useState<'en' | 'mr'>('en');
  const en = language === 'en';

  const sections = en
    ? [
        ['7-day refund', 'If you are not happy with a recipe book or membership, ask for a refund within 7 days of payment. You get the full amount back. No questions asked.'],
        ['How to ask', 'Email us from the account you bought with, or use the Contact page. Tell us which book or plan and your PayU payment reference if you have it.'],
        ['What happens next', 'We refund to the same payment method through PayU or Razorpay. Banks usually take 5 to 7 working days to show it. Access to the refunded book or plan stops when the refund is made.'],
        ['After 7 days', 'Payments older than 7 days are not refundable, except for duplicate charges or if you were charged and never got access. Those we always fix.'],
        ['Memberships', 'A membership does not renew on its own. It simply ends on its expiry date.'],
      ]
    : [
        ['७ दिवसांचा परतावा', 'पुस्तक किंवा सदस्यत्व आवडले नाही तर पेमेंटनंतर ७ दिवसांच्या आत परतावा मागा. पूर्ण रक्कम परत मिळेल.'],
        ['कसे मागावे', 'ज्या खात्याने खरेदी केली त्या ईमेलवरून आम्हाला लिहा किंवा संपर्क पान वापरा.'],
        ['पुढे काय', 'त्याच पेमेंट पद्धतीत परतावा दिला जातो. बँकेला साधारण ५ ते ७ कामकाजाचे दिवस लागतात. परताव्यानंतर त्या पुस्तकाचा प्रवेश बंद होतो.'],
        ['७ दिवसांनंतर', '७ दिवसांपेक्षा जुन्या पेमेंटचा परतावा मिळत नाही, दुहेरी शुल्क किंवा प्रवेश न मिळाल्यास सोडून.'],
        ['सदस्यत्व', 'सदस्यत्व आपोआप नूतनीकरण होत नाही; ते मुदत संपल्यावर संपते.'],
      ];

  return (
    <AppShell contained={false} language={language} onLanguageToggle={() => setLanguage(en ? 'mr' : 'en')}>
      <SEO title="Refund Policy - RecipeMaker" description="Plain 7-day refund policy for RecipeMaker recipe books and memberships." url="/refund" />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <Link to="/"><Button variant="ghost" className="mb-6"><ArrowLeft className="mr-2 w-4 h-4" />{en ? 'Back to Home' : 'होमकडे परत'}</Button></Link>
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-foreground">{en ? 'Refund Policy' : 'परतावा धोरण'}</h1>
        <div className="space-y-6 text-foreground">
          {sections.map(([h, p]) => (
            <section key={h}>
              <h2 className="text-xl font-bold mb-2">{h}</h2>
              <p className="text-foreground/90 leading-relaxed">{p}</p>
            </section>
          ))}
          <p className="text-sm text-muted-foreground">
            {en ? 'Questions? ' : 'प्रश्न? '}<Link to="/contact" className="text-primary underline">{en ? 'Contact us' : 'संपर्क करा'}</Link>
          </p>
        </div>
      </main>
    </AppShell>
  );
}
