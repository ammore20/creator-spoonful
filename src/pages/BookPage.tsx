import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { SEO } from '@/components/SEO';
import { Panel } from '@/components/ds/Panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Infinity as InfinityIcon, WifiOff, Languages, Lock, ShieldCheck, ChevronRight, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { BookResponse, fetchBook, rupees, visitorId } from '@/lib/books';
import { BookCover } from './Home';

/** Old creator addresses that now point to a renamed book. */
const SLUG_ALIASES: Record<string, string> = {
  'saritas-kitchen-2': 'saritas-kitchen',
  sk: 'saritas-kitchen',
};

export default function BookPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const target = SLUG_ALIASES[slug];
  if (target) return <Navigate to={`/c/${target}`} replace />;
  return <BookPageInner slug={slug} />;
}

function BookPageInner({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<'en' | 'mr'>('en');
  const [data, setData] = useState<BookResponse | null>(null);
  const [buying, setBuying] = useState(false);
  const [intentSent, setIntentSent] = useState(false);
  const en = language === 'en';
  const [params] = useSearchParams();
  const payment = params.get('payment');

  useEffect(() => {
    if (payment !== 'pending' && payment !== 'success') return;
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      fetchBook(slug).then((d) => { setData(d); if (d.owned || n >= 7) clearInterval(t); }).catch(() => {});
    }, 3000);
    return () => clearInterval(t);
  }, [payment, slug]);

  useEffect(() => {
    localStorage.setItem('ref_creator_slug', slug);
    fetchBook(slug).then(setData).catch(() => setData({ found: false }));
    (supabase as any).rpc('log_book_visit', { _slug: slug, _visitor: visitorId() }).then(() => {});
  }, [slug]);

  if (!data) {
    return (
      <AppShell language={language} onLanguageToggle={() => setLanguage(en ? 'mr' : 'en')}>
        <div className="max-w-xl mx-auto space-y-4"><Skeleton className="aspect-[3/4] w-48 mx-auto rounded-2xl" /><Skeleton className="h-8" /><Skeleton className="h-24" /></div>
      </AppShell>
    );
  }

  if (!data.found || !data.book) {
    return (
      <AppShell language={language} onLanguageToggle={() => setLanguage(en ? 'mr' : 'en')}>
        <SEO title="Book not available | RecipeMaker" description="This book is not available." url={`/c/${slug}`} noindex />
        <div className="max-w-md mx-auto text-center py-16 space-y-3">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground" />
          <h1 className="font-display text-2xl font-bold">{en ? 'This book is not available yet' : 'हे पुस्तक अजून उपलब्ध नाही'}</h1>
          <Link to="/"><Button variant="outline">{en ? 'See all books' : 'सर्व पुस्तके'}</Button></Link>
        </div>
      </AppShell>
    );
  }

  const { book, recipes = [], owned, signed_in } = data;
  const samples = recipes.filter((r) => r.is_free_sample).slice(0, 3);
  const lockedCount = Math.max(recipes.length - samples.length, 0);
  const title = `${book.creator_name}'s ${recipes.length} recipes`;

  const buy = async () => {
    if (!signed_in) {
      sessionStorage.setItem('auth_return_to', `/c/${slug}`);
      navigate('/auth');
      return;
    }
    setBuying(true);
    try {
      const { data: order } = await supabase.functions.invoke('payu-create-order', { body: { slug, origin: window.location.origin } });
      if (order?.action && order?.fields) {
        const form = document.createElement('form');
        form.method = 'POST'; form.action = order.action;
        Object.entries(order.fields as Record<string, string>).forEach(([k, v]) => {
          const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = v; form.appendChild(i);
        });
        document.body.appendChild(form); form.submit();
        return;
      }
      if (!order?.fallback) { setBuying(false); toast.error(en ? 'Could not start payment. Please try again.' : 'पेमेंट सुरू झाले नाही.'); return; }
    } catch {
      setBuying(false); toast.error(en ? 'Could not start payment. Please try again.' : 'पेमेंट सुरू झाले नाही.'); return;
    }
    // Fallback: manual PayU payment link. Open the tab synchronously so pop-up blockers allow it, then point it at the payment link.
    const tab = window.open('', '_blank');
    setBuying(true);
    const { data: res, error } = await (supabase as any).rpc('create_purchase_intent', { _book_id: book.id });
    setBuying(false);
    if (error || !res?.ok) {
      tab?.close();
      const reason = res?.reason;
      if (reason === 'already_owned') { toast.success(en ? 'You already own this book' : 'हे पुस्तक तुमचे आहे'); fetchBook(slug).then(setData); return; }
      toast.error(reason === 'no_payment_link'
        ? (en ? 'Payment is not open for this book yet.' : 'या पुस्तकासाठी पेमेंट अजून सुरू नाही.')
        : (en ? 'Could not start payment. Please try again.' : 'पेमेंट सुरू झाले नाही.'));
      return;
    }
    if (tab) tab.location.href = res.payment_link_url;
    else window.location.href = res.payment_link_url;
    setIntentSent(true);
  };

  const benefits: { icon: any; en: string; mr: string; soon?: boolean }[] = [
    { icon: InfinityIcon, en: 'Lifetime access', mr: 'आजीवन प्रवेश' },
    { icon: WifiOff, en: 'Install it after buying to use offline', mr: 'खरेदीनंतर ऑफलाइन वापरा' },
    { icon: Languages, en: 'English and Marathi', mr: 'इंग्रजी आणि मराठी' },
  ];

  return (
    <AppShell language={language} onLanguageToggle={() => setLanguage(en ? 'mr' : 'en')}>
      <SEO title={`${title} | RecipeMaker`} description="Every recipe from the channel, written out with exact quantities. English and Marathi." url={`/c/${slug}`} />
      <div className="max-w-xl mx-auto pb-10">
        <div className="w-44 sm:w-52 mx-auto aspect-[3/4] rounded-2xl overflow-hidden shadow-card">
          <BookCover src={book.cover_url} title={book.title_en} />
        </div>
        <h1 className="mt-5 text-center font-display text-2xl sm:text-3xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-center text-muted-foreground">
          Every recipe from the channel, written out with exact quantities. English and Marathi.
        </p>

        <Panel className="mt-6 space-y-3">
          {payment && (
            <p className="rounded-xl bg-primary/10 text-foreground text-sm p-3 text-center">
              {owned ? 'Payment confirmed, your book is unlocked.'
                : payment === 'failed' ? 'Payment failed, you were not charged.'
                : 'Payment is being confirmed…'}
            </p>
          )}
          {owned ? (
            <Link to={`/book/${slug}`} className="block"><Button size="lg" className="w-full h-12">{en ? 'Open your book' : 'तुमचे पुस्तक उघडा'}</Button></Link>
          ) : (
            <>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-lg line-through text-muted-foreground">{rupees(book.list_price_paise)}</span>
                <span className="text-3xl font-bold text-foreground">{rupees(book.price_paise)}</span>
                <span className="text-sm text-muted-foreground">{en ? 'one-time' : 'एकदाच'}</span>
              </div>
              <Button size="lg" className="w-full h-12" onClick={buy} disabled={buying}>
                {signed_in ? (en ? 'Buy' : 'खरेदी करा') : (en ? 'Sign in to buy' : 'खरेदीसाठी साइन इन')}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5" /> Secure payment with PayU
              </p>
              {intentSent && (
                <p className="rounded-xl bg-primary/10 text-foreground text-sm p-3 text-center">
                  After we confirm your payment, your book unlocks on your account.
                </p>
              )}
            </>
          )}
        </Panel>

        <div className="mt-5 space-y-2">
          {benefits.map((b) => (
            <div key={b.en} className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3">
              <b.icon className="w-5 h-5 text-primary shrink-0" />
              <span className="text-sm text-foreground flex-1">{en ? b.en : b.mr}</span>
              {b.soon && <span className="text-[11px] font-medium rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">{en ? 'Coming soon' : 'लवकरच'}</span>}
            </div>
          ))}
        </div>

        <h2 className="mt-8 mb-3 font-display text-lg font-bold">{en ? 'Free samples' : 'मोफत नमुने'}</h2>
        <div className="space-y-2">
          {samples.map((r) => (
            <Link key={r.video_id} to={`/book/${slug}/${r.video_id}`} className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-2 hover:border-primary/40 transition-colors">
              {r.thumbnail_url && <img src={r.thumbnail_url} alt="" loading="lazy" className="w-16 h-12 rounded-lg object-cover" />}
              <span className="flex-1 text-sm font-medium line-clamp-2">{(en ? r.preview.title : r.preview.title_mr || r.preview.title) || ''}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          ))}
          {lockedCount > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              <Lock className="w-4 h-4" /> {lockedCount} {en ? 'more recipes after purchase' : 'आणखी रेसिपी खरेदीनंतर'}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
