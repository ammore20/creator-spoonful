import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Compass,
  BookOpen,
  Library,
  Heart,
  Crown,
  Sparkles,
  Mail,
  LogOut,
  Search,
  Languages,
  Menu,
  X,
  ChefHat,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCreatorBeta } from '@/hooks/useCreatorBeta';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';

type Lang = 'en' | 'mr';

interface NavItem {
  to: string;
  icon: React.ElementType;
  en: string;
  mr: string;
  authOnly?: boolean;
}

const MAIN_NAV: NavItem[] = [
  { to: '/', icon: BookOpen, en: 'Books', mr: 'पुस्तके' },
  { to: '/library', icon: Library, en: 'My books', mr: 'माझी पुस्तके', authOnly: true },
  { to: '/recipes', icon: Compass, en: 'Recipes', mr: 'रेसिपी' },
  { to: '/favorites', icon: Heart, en: 'Favorites', mr: 'आवडते', authOnly: true },
  { to: '/premium', icon: Crown, en: 'Premium', mr: 'प्रीमियम' },
];

const SECONDARY_NAV: NavItem[] = [
  { to: '/for-creators', icon: Sparkles, en: 'For Creators', mr: 'क्रिएटर्ससाठी' },
  { to: '/contact', icon: Mail, en: 'Contact', mr: 'संपर्क' },
];

interface AppShellProps {
  language: Lang;
  onLanguageToggle: () => void;
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
  children: React.ReactNode;
  /** Renders the wide content container. Set false for edge-to-edge pages. */
  contained?: boolean;
}

const NavLink = ({ item, language, onNavigate }: { item: NavItem; language: Lang; onNavigate?: () => void }) => {
  const { pathname } = useLocation();
  const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
      )}
    >
      <Icon className={cn('w-4 h-4', active && 'text-primary')} />
      {language === 'en' ? item.en : item.mr}
    </Link>
  );
};

export const AppShell = ({
  language,
  onLanguageToggle,
  onSearch,
  searchPlaceholder,
  children,
  contained = true,
}: AppShellProps) => {
  const user = useCurrentUser();
  const isCreatorBeta = useCreatorBeta();
  const [query, setQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const nav = MAIN_NAV.filter((i) => !i.authOnly || user);
  const placeholder = searchPlaceholder ?? (language === 'en' ? 'Search recipes, creators…' : 'रेसिपी, क्रिएटर शोधा…');

  const signOut = async () => {
    await supabase.auth.signOut();
    toast({ description: language === 'en' ? 'Signed out' : 'साइन आउट झाले' });
    navigate('/');
  };

  const brand = (
    <Link to="/" className="flex items-center gap-2.5" onClick={() => setDrawerOpen(false)}>
      <span className="w-9 h-9 rounded-xl bg-primary/10 grid place-items-center">
        <img src={logo} alt="" className="w-5 h-5" />
      </span>
      <span className="font-display text-lg font-bold text-foreground leading-none">
        Recipe<span className="text-primary">Maker</span>
      </span>
    </Link>
  );

  const sidebarBody = (onNavigate?: () => void) => (
    <>
      <div className="px-2">
        <Link to="/recipes" onClick={onNavigate}>
          <Button className="w-full justify-start gap-2 h-11" size="lg">
            <ChefHat className="w-4 h-4" />
            {language === 'en' ? 'Explore recipes' : 'रेसिपी पहा'}
          </Button>
        </Link>
      </div>

      <nav className="mt-6 px-2 space-y-1">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          {language === 'en' ? 'Main menu' : 'मुख्य मेनू'}
        </p>
        {nav.map((item) => (
          <NavLink key={item.to} item={item} language={language} onNavigate={onNavigate} />
        ))}
      </nav>

      <nav className="mt-6 px-2 space-y-1">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          {language === 'en' ? 'More' : 'अधिक'}
        </p>
        {SECONDARY_NAV.map((item) => (
          <NavLink key={item.to} item={item} language={language} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="mt-auto px-2 pt-6">
        <div className="rounded-2xl border border-border/70 bg-secondary/60 p-3">
          {user ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold shrink-0">
                  {user.email?.[0]?.toUpperCase() ?? 'U'}
                </span>
                <span className="text-xs text-muted-foreground truncate">{user.email}</span>
              </div>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={signOut}>
                <LogOut className="w-4 h-4" />
                {language === 'en' ? 'Log out' : 'लॉग आउट'}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {language === 'en' ? 'Save recipes and unlock premium.' : 'रेसिपी सेव्ह करा, प्रीमियम अनलॉक करा.'}
              </p>
              <Link to="/auth" onClick={onNavigate} className="block">
                <Button variant="outline" size="sm" className="w-full">
                  {language === 'en' ? 'Sign in' : 'साइन इन'}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[248px] flex-col border-r border-border/70 bg-card/70 backdrop-blur py-5">
        <div className="px-5 pb-5">{brand}</div>
        {sidebarBody()}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside className="relative flex w-[268px] flex-col bg-card py-5 animate-slide-in-left shadow-card">
            <div className="flex items-center justify-between px-5 pb-5">
              {brand}
              <button onClick={() => setDrawerOpen(false)} aria-label="Close menu">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            {sidebarBody(() => setDrawerOpen(false))}
          </aside>
        </div>
      )}

      <div className="lg:pl-[248px]">
        {/* Top bar */}
        <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 h-16">
            <button
              className="lg:hidden w-9 h-9 rounded-xl border border-border/70 grid place-items-center text-muted-foreground"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="lg:hidden">{brand}</div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSearch?.(query);
              }}
              className={cn('relative flex-1 max-w-xl', !onSearch && 'hidden sm:block')}
            >
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  onSearch?.(e.target.value);
                }}
                onFocus={() => {
                  if (!onSearch && pathname !== '/recipes') navigate('/recipes');
                }}
                placeholder={placeholder}
                className="w-full h-10 rounded-xl border border-border/70 bg-card pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all"
              />
            </form>

            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              {isCreatorBeta && (
                <span className="rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-[0.14em] px-2.5 py-1">
                  CREATOR BETA
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={onLanguageToggle} className="gap-1.5 px-2.5">
                <Languages className="w-4 h-4" />
                <span className="hidden sm:inline">{language === 'en' ? 'मराठी' : 'English'}</span>
              </Button>
              {user ? (
                <Link to="/favorites" aria-label="Favorites">
                  <span className="w-9 h-9 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold">
                    {user.email?.[0]?.toUpperCase() ?? 'U'}
                  </span>
                </Link>
              ) : (
                <Link to="/auth">
                  <Button size="sm">{language === 'en' ? 'Sign in' : 'साइन इन'}</Button>
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className={cn('pb-24 lg:pb-12', contained && 'px-3 sm:px-6 py-5 sm:py-7 max-w-[1400px] mx-auto')}>
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/70 bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4">
          {[...MAIN_NAV, SECONDARY_NAV[0]].slice(0, 4).map((item) => {
            const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className="w-5 h-5" />
                {language === 'en' ? item.en : item.mr}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
