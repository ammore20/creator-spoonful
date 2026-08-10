import { Link } from 'react-router-dom';
import logo from '@/assets/logo.png';

interface FooterProps {
  language: 'en' | 'mr';
}

export const Footer = ({ language }: FooterProps) => {
  const linkCls = 'text-muted-foreground hover:text-primary transition-colors';

  return (
    <footer className="rounded-2xl border border-border/70 bg-card p-6 sm:p-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
        <div className="col-span-2">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-9 h-9 rounded-xl bg-primary/10 grid place-items-center">
              <img src={logo} alt="" className="w-5 h-5" />
            </span>
            <span className="font-display text-lg font-bold text-foreground">
              Recipe<span className="text-primary">Maker</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
            {language === 'en'
              ? 'Authentic recipes from your favourite creators — filter by taste, mood, cuisine and cooking time.'
              : 'तुमच्या आवडत्या क्रिएटर्सच्या अस्सल रेसिपी — चव, मूड, पाककृती आणि वेळेनुसार फिल्टर करा.'}
          </p>
        </div>

        <div>
          <h3 className="font-display text-sm font-bold text-foreground mb-3">
            {language === 'en' ? 'Product' : 'उत्पादन'}
          </h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className={linkCls}>{language === 'en' ? 'Discover' : 'शोधा'}</Link></li>
            <li><Link to="/premium" className={linkCls}>{language === 'en' ? 'Premium' : 'प्रीमियम'}</Link></li>
            <li><Link to="/for-creators" className={linkCls}>{language === 'en' ? 'For creators' : 'क्रिएटर्ससाठी'}</Link></li>
            <li><Link to="/contact" className={linkCls}>{language === 'en' ? 'Contact' : 'संपर्क'}</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-display text-sm font-bold text-foreground mb-3">
            {language === 'en' ? 'Legal' : 'कायदेशीर'}
          </h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/privacy" className={linkCls}>{language === 'en' ? 'Privacy policy' : 'गोपनीयता धोरण'}</Link></li>
            <li><Link to="/terms" className={linkCls}>{language === 'en' ? 'Terms of service' : 'सेवा अटी'}</Link></li>
            <li><Link to="/refund" className={linkCls}>{language === 'en' ? 'Refund policy' : 'परतावा धोरण'}</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/70 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} RecipeMaker. {language === 'en' ? 'All rights reserved.' : 'सर्व हक्क राखीव.'}
        </p>
        <p className="text-xs text-muted-foreground">
          {language === 'en' ? 'Powered by' : 'द्वारा संचालित'}{' '}
          <a href="https://nimbusware.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary">
            Nimbus Ware
          </a>
        </p>
      </div>
    </footer>
  );
};
