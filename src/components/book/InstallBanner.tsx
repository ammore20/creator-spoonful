import { useEffect, useState } from 'react';
import { Download, Check, Share, PlusSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  canPromptInstall, isIOS, isStandalone, onInstallAvailabilityChange, promptInstall,
} from '@/lib/installPrompt';

interface Props {
  installed: boolean;
  count: number;
  busy: null | 'installing' | 'restoring' | 'updating';
  online: boolean;
  onInstall: () => Promise<{ ok: boolean; reason?: string }>;
  en: boolean;
}

const REASONS: Record<string, string> = {
  rate_limited: 'Too many downloads in the last hour. Please try again later.',
  not_owned: 'Offline copies are for people who bought this book.',
  network: 'No connection. Connect to the internet to install.',
};

export const InstallBanner = ({ installed, count, busy, online, onInstall, en }: Props) => {
  const [canPrompt, setCanPrompt] = useState(canPromptInstall());
  const [standalone] = useState(isStandalone());
  const [showHomeStep, setShowHomeStep] = useState(false);
  useEffect(() => onInstallAvailabilityChange(() => setCanPrompt(canPromptInstall())), []);

  const install = async () => {
    const r = await onInstall();
    if (!r.ok) { toast.error(REASONS[r.reason ?? ''] ?? 'Could not save the book. Please try again.'); return; }
    toast.success(en ? 'Book saved on this phone' : 'पुस्तक फोनवर सेव्ह झाले');
    if (!standalone) setShowHomeStep(true);
  };

  if (busy === 'restoring') {
    return <div className="rounded-xl bg-primary/10 p-3 text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{en ? 'Restoring your book' : 'तुमचे पुस्तक परत आणत आहे'}</div>;
  }

  if (!installed) {
    return (
      <div className="rounded-xl bg-primary/10 p-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{en ? 'Install this book to cook offline' : 'ऑफलाइन स्वयंपाकासाठी हे पुस्तक इन्स्टॉल करा'}</p>
        <Button size="sm" onClick={install} disabled={!!busy || !online}>
          {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
          {en ? 'Install' : 'इन्स्टॉल'}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/70 bg-card p-3 space-y-2">
      <p className="text-sm flex items-center gap-2"><Check className="w-4 h-4 text-primary" />
        {en ? `Installed. ${count} recipes saved offline` : `इन्स्टॉल झाले. ${count} रेसिपी ऑफलाइन सेव्ह`}
      </p>
      {!standalone && (showHomeStep || canPrompt) && (
        canPrompt ? (
          <Button size="sm" variant="outline" onClick={() => promptInstall()}>
            <PlusSquare className="w-4 h-4 mr-1" />{en ? 'Add to home screen' : 'होम स्क्रीनवर जोडा'}
          </Button>
        ) : isIOS() ? (
          <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1">
            {en ? 'To open it like an app: tap' : 'अ‍ॅपसारखे उघडण्यासाठी:'} <Share className="w-3.5 h-3.5" /> <b>Share</b>, {en ? 'then' : 'मग'} <b>Add to Home Screen</b>.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {en ? 'To open it like an app, use your browser menu and choose "Add to Home screen" or "Install app".' : 'ब्राउझर मेनूमधून "Add to Home screen" निवडा.'}
          </p>
        )
      )}
      <p className="text-[11px] text-muted-foreground">
        {en
          ? 'The saved copy stays on this phone. If the purchase is refunded, it is removed the next time the phone is online.'
          : 'सेव्ह केलेली प्रत या फोनवर राहते. परतावा झाल्यास फोन ऑनलाइन आल्यावर ती काढली जाते.'}
      </p>
    </div>
  );
};
