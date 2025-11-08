import { Link } from 'react-router-dom';
import logo from '@/assets/logo.png';

interface FooterProps {
  language: 'en' | 'mr';
}

export const Footer = ({ language }: FooterProps) => {
  return (
    <footer className="bg-gradient-card border-t border-border mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-hero rounded-xl flex items-center justify-center shadow-warm">
                <img src={logo} alt="RecipeMaker" className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">RecipeMaker</h2>
                <p className="text-sm text-muted-foreground">
                  {language === 'en' ? 'AI Recipes by Your Favorite Creators' : 'तुमच्या आवडत्या क्रिएटर्सच्या AI रेसिपी'}
                </p>
              </div>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {language === 'en' 
                ? 'Discover amazing recipes transcribed by AI from your favorite YouTube creators. Filter by taste, mood, cuisine, and more!'
                : 'तुमच्या आवडत्या YouTube क्रिएटर्सकडून AI द्वारे प्रतिलेखित अद्भुत रेसिपी शोधा. चव, मूड, पाककृती आणि अधिक फिल्टर करा!'}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-foreground mb-4">
              {language === 'en' ? 'Quick Links' : 'द्रुत लिंक्स'}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                  {language === 'en' ? 'Home' : 'होम'}
                </Link>
              </li>
              <li>
                <Link to="/premium" className="text-muted-foreground hover:text-primary transition-colors">
                  {language === 'en' ? 'Premium Plans' : 'प्रीमियम योजना'}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                  {language === 'en' ? 'Contact Us' : 'आमच्याशी संपर्क साधा'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-bold text-foreground mb-4">
              {language === 'en' ? 'Legal' : 'कायदेशीर'}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                  {language === 'en' ? 'Privacy Policy' : 'गोपनीयता धोरण'}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                  {language === 'en' ? 'Terms of Service' : 'सेवा अटी'}
                </Link>
              </li>
              <li>
                <Link to="/refund" className="text-muted-foreground hover:text-primary transition-colors">
                  {language === 'en' ? 'Refund Policy' : 'परतावा धोरण'}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground text-center md:text-left">
            © 2024 RecipeMaker. {language === 'en' ? 'All rights reserved.' : 'सर्व हक्क राखीव.'}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{language === 'en' ? 'Powered by' : 'द्वारा संचालित'}</span>
            <a 
              href="https://nimbusware.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Nimbus Ware
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};