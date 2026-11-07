import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import faral from '@/assets/diwali-faral.jpg';

export function DiwaliBanner({ language }: { language: 'en' | 'mr' }) {
  return (
    <Link to="/recipes#diwali-recipes" className="diwali-banner relative flex min-h-28 items-center justify-center overflow-hidden px-4 py-5 text-center sm:min-h-32">
      <img src={faral} alt="" width={1536} height={512} className="absolute inset-0 h-full w-full object-cover" />
      <div className="diwali-banner-copy relative max-w-sm px-3">
        <p className="text-xs font-medium">{language === 'mr' ? 'दिवाळीच्या हार्दिक शुभेच्छा' : 'Happy Diwali'}</p>
        <p className="mt-1 font-display text-xl font-bold sm:text-2xl">{language === 'mr' ? 'घरच्या घरी दिवाळीचा फराळ' : 'Diwali faral favourites'}</p>
        <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold">{language === 'mr' ? 'दिवाळी रेसिपी पहा' : 'Explore Diwali recipes'} <ArrowRight className="h-3.5 w-3.5" /></span>
      </div>
    </Link>
  );
}