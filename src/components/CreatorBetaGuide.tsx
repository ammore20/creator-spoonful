import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowDown, ArrowRight, X, BookOpen, ListChecks, CheckSquare } from 'lucide-react';

type Lang = 'en' | 'mr';

/** Floating step guide shown only to Creator Beta users. */
export function CreatorBetaGuide({ language }: { language: Lang }) {
  const { pathname } = useLocation();
  const [hidden, setHidden] = useState(() => sessionStorage.getItem('cb-guide-hidden') === '1');
  if (hidden) return null;
  const en = language === 'en';

  const parts = pathname.split('/').filter(Boolean);
  let step = 1;
  if (parts[0] === 'book' && parts.length === 2) step = 2;
  else if (parts[0] === 'book' && parts.length >= 3) step = 3;
  else if (parts[0] === 'recipe') step = 3;

  const content = {
    1: {
      icon: BookOpen,
      title: en ? 'Step 1: Open a book' : 'पायरी १: पुस्तक उघडा',
      text: en ? 'Tap a book to see what your audience gets.' : 'तुमच्या प्रेक्षकांना काय मिळते ते पाहण्यासाठी पुस्तकावर टॅप करा.',
    },
    2: {
      icon: ListChecks,
      title: en ? 'Step 2: Browse recipes' : 'पायरी २: रेसिपी पहा',
      text: en ? 'Scroll the list below and tap any recipe to open it.' : 'खालची यादी पहा आणि कोणतीही रेसिपी उघडण्यासाठी टॅप करा.',
    },
    3: {
      icon: CheckSquare,
      title: en ? 'Step 3: Tick ingredients & steps' : 'पायरी ३: साहित्य व कृती टिक करा',
      text: en
        ? 'Tap the box next to each ingredient and each step — it gets crossed off. Tap again to uncheck.'
        : 'प्रत्येक साहित्य आणि कृतीच्या बॉक्सवर टॅप करा — ते खोडले जाईल. पुन्हा टॅप केल्यास परत येईल.',
    },
  }[step]!;
  const Icon = content.icon;

  const close = () => {
    sessionStorage.setItem('cb-guide-hidden', '1');
    setHidden(true);
  };

  return (
    <div className="fixed inset-x-3 bottom-20 lg:bottom-6 lg:left-auto lg:right-6 lg:w-80 z-50 rounded-2xl border border-primary/40 bg-card shadow-lg p-3.5 animate-in fade-in slide-in-from-bottom-2">
      <button onClick={close} aria-label="Close guide" className="absolute right-2 top-2 p-1 text-muted-foreground">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-5">
        <span className="w-9 h-9 shrink-0 rounded-full bg-primary/10 text-primary grid place-items-center">
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.14em] text-primary">CREATOR BETA · {step}/3</p>
          <p className="font-display font-bold text-sm">{content.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{content.text}</p>
          {step === 1 && (
            <Link to="/library" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
              {en ? 'See books' : 'पुस्तके पहा'} <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
            </Link>
          )}
        </div>
      </div>
      {step !== 1 && (
        <ArrowDown className="w-6 h-6 text-primary mx-auto mt-1 animate-bounce" />
      )}
    </div>
  );
}
