import { Crown, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PremiumPopupProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'mr';
}

export const PremiumPopup = ({ isOpen, onClose, language }: PremiumPopupProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-2 border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="w-6 h-6 text-amber-500" />
            {language === 'en' ? 'Unlock Premium Features' : 'प्रीमियम वैशिष्ट्ये अनलॉक करा'}
          </DialogTitle>
          <DialogDescription className="text-base">
            {language === 'en'
              ? 'Access 1000+ premium recipes, smart tools & AI suggestions.'
              : '1000+ प्रीमियम रेसिपी, स्मार्ट टूल्स आणि AI सूचना मिळवा.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
              <p className="text-sm text-foreground">
                {language === 'en' ? 'Save unlimited recipes' : 'असीम रेसिपी सेव्ह करा'}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
              <p className="text-sm text-foreground">
                {language === 'en' ? 'AI-powered recipe suggestions' : 'AI-आधारित रेसिपी सूचना'}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
              <p className="text-sm text-foreground">
                {language === 'en' ? 'Smart cooking tools & timers' : 'स्मार्ट कुकिंग टूल्स आणि टाइमर'}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
              <p className="text-sm text-foreground">
                {language === 'en' ? 'Comment and share your versions' : 'कमेंट करा आणि तुमच्या आवृत्त्या शेअर करा'}
              </p>
            </div>
          </div>
          <div className="pt-4">
            <Link to="/premium" className="w-full block">
              <Button
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 shadow-warm h-12 text-lg"
              >
                <Crown className="mr-2 w-5 h-5" />
                {language === 'en' ? 'Upgrade for ₹499' : '₹499 ला अपग्रेड करा'}
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
