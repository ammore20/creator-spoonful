import { Link } from 'react-router-dom';
import { Crown, Lock, LogIn, Sparkles, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ds/Panel';

export type AccessState = 'granted' | 'login_required' | 'free_available' | 'locked' | 'not_found';

interface Props {
  state: Exclude<AccessState, 'granted' | 'not_found'>;
  language: 'en' | 'mr';
  title: string;
  thumbnailUrl?: string;
  creator?: string;
  cookTime?: string;
  servings?: number;
  unlocking?: boolean;
  onUnlock: () => void;
}

export const RecipeAccessGate = ({
  state,
  language,
  title,
  thumbnailUrl,
  creator,
  cookTime,
  servings,
  unlocking,
  onUnlock,
}: Props) => {
  const en = language === 'en';

  return (
    <div className="px-3 sm:px-6 py-6 max-w-3xl mx-auto space-y-5">
      <Panel className="overflow-hidden p-0">
        <div className="relative aspect-[16/9] bg-muted">
          {thumbnailUrl && (
            <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover blur-[2px] scale-105" />
          )}
          <div className="absolute inset-0 bg-foreground/45 grid place-items-center">
            <span className="w-14 h-14 rounded-full bg-background/90 grid place-items-center">
              <Lock className="w-6 h-6 text-primary" />
            </span>
          </div>
        </div>
        <div className="p-5 sm:p-6 space-y-2">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">{title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {creator && <span>{en ? 'by' : 'द्वारा'} {creator}</span>}
            {cookTime && <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{cookTime}</span>}
            {servings ? <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" />{servings}</span> : null}
          </div>
        </div>
      </Panel>

      {state === 'login_required' && (
        <Panel className="text-center space-y-4 p-6">
          <span className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 grid place-items-center">
            <LogIn className="w-5 h-5 text-primary" />
          </span>
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold">{en ? 'Sign in to cook this' : 'हे बनवण्यासाठी साइन इन करा'}</h2>
            <p className="text-sm text-muted-foreground">
              {en
                ? 'Create a free account and get 1 free recipe every single day.'
                : 'मोफत खाते तयार करा आणि दररोज १ रेसिपी मोफत मिळवा.'}
            </p>
          </div>
          <Link to="/auth" className="block">
            <Button className="w-full" size="lg">{en ? 'Sign in / Sign up' : 'साइन इन / साइन अप'}</Button>
          </Link>
        </Panel>
      )}

      {state === 'free_available' && (
        <Panel className="space-y-4 p-6">
          <span className="w-12 h-12 rounded-2xl bg-primary/10 grid place-items-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </span>
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold">
              {en ? 'Use your free recipe of the day here?' : 'आजची मोफत रेसिपी येथे वापरायची?'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {en
                ? 'You get 1 free recipe every day. Unlock this one and it stays open for the rest of today. Tomorrow you get another.'
                : 'तुम्हाला दररोज १ रेसिपी मोफत मिळते. ही अनलॉक करा — आज पूर्ण दिवस खुली राहील. उद्या पुन्हा नवीन मिळेल.'}
            </p>
          </div>
          <Button className="w-full" size="lg" onClick={onUnlock} disabled={unlocking}>
            <Sparkles className="w-4 h-4 mr-2" />
            {unlocking
              ? (en ? 'Unlocking…' : 'अनलॉक करत आहे…')
              : (en ? 'Unlock this recipe free' : 'ही रेसिपी मोफत अनलॉक करा')}
          </Button>
          <Link to="/premium" className="block">
            <Button variant="soft" className="w-full">
              <Crown className="w-4 h-4 mr-2" />
              {en ? 'Or unlock everything with Premium' : 'किंवा प्रीमियमसह सर्व अनलॉक करा'}
            </Button>
          </Link>
        </Panel>
      )}

      {state === 'locked' && (
        <Panel className="space-y-4 p-6">
          <span className="w-12 h-12 rounded-2xl bg-primary/10 grid place-items-center">
            <Crown className="w-5 h-5 text-primary" />
          </span>
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold">
              {en ? "Today's free recipe is already used" : 'आजची मोफत रेसिपी वापरली गेली आहे'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {en
                ? 'Go Premium for unlimited recipes, or come back tomorrow for your next free one.'
                : 'अमर्यादित रेसिपींसाठी प्रीमियम घ्या, किंवा उद्या पुन्हा नवीन मोफत रेसिपी मिळवा.'}
            </p>
          </div>
          <ul className="space-y-2 text-sm">
            {(en
              ? ['Every recipe, unlimited', 'Marathi translations', 'Timers, scaling & favorites']
              : ['सर्व रेसिपी, अमर्यादित', 'मराठी भाषांतर', 'टायमर, प्रमाण व आवडते', 'जाहिरातमुक्त']
            ).map((f) => (
              <li key={f} className="flex items-center gap-2 text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-primary/10 grid place-items-center shrink-0">
                  <Crown className="w-3 h-3 text-primary" />
                </span>
                {f}
              </li>
            ))}
          </ul>
          <Link to="/premium" className="block">
            <Button className="w-full" size="lg">
              <Crown className="w-4 h-4 mr-2" />
              {en ? 'Upgrade to Premium — from ₹49/mo' : 'प्रीमियम घ्या — ₹४९/महिना पासून'}
            </Button>
          </Link>
        </Panel>
      )}
    </div>
  );
};
