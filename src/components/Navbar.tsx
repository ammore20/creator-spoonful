import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Menu, X, LogOut, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/logo.png';
import type { User } from '@supabase/supabase-js';

interface NavbarProps {
  onSearch: (query: string) => void;
  language: 'en' | 'mr';
  onLanguageToggle: () => void;
}

export const Navbar = ({ onSearch, language, onLanguageToggle }: NavbarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'Signed out',
      description: 'You have been signed out successfully'
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <nav className="sticky top-0 z-50 bg-card/80 border-b border-border backdrop-blur-xl shadow-sm transition-all duration-300">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-hero rounded-xl flex items-center justify-center shadow-warm">
              <img src={logo} alt="RecipeMaker" className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">RecipeMaker</h1>
              <p className="text-xs text-muted-foreground">
                {language === 'en' ? 'AI Recipes by Your Favorite Creators' : 'तुमच्या आवडत्या क्रिएटर्सच्या AI रेसिपी'}
              </p>
            </div>
          </div>

          {/* Desktop Search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder={language === 'en' ? 'Search recipes...' : 'रेसिपी शोधा...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>
          </form>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLanguageToggle}
              className="text-muted-foreground hover:text-foreground"
            >
              {language === 'en' ? 'मराठी' : 'English'}
            </Button>
            <Link to="/premium">
              <Button
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 shadow-warm"
              >
                <Crown className="w-4 h-4 mr-2" />
                {language === 'en' ? 'Upgrade to Premium' : 'प्रीमियम मिळवा'}
              </Button>
            </Link>
            {user ? (
              <>
                <span className="text-sm text-muted-foreground">{user.email}</span>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {language === 'en' ? 'Sign Out' : 'साइन आउट'}
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button variant="outline" size="sm">
                  {language === 'en' ? 'Sign In' : 'साइन इन'}
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>

        {/* Mobile Search */}
        <form onSubmit={handleSearch} className="md:hidden mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              type="text"
              placeholder={language === 'en' ? 'Search recipes...' : 'रेसिपी शोधा...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
        </form>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 flex flex-col gap-2 pb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLanguageToggle}
              className="justify-start"
            >
              {language === 'en' ? 'मराठी' : 'English'}
            </Button>
            <Link to="/premium" className="w-full">
              <Button
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 shadow-warm w-full"
              >
                <Crown className="w-4 h-4 mr-2" />
                {language === 'en' ? 'Upgrade to Premium' : 'प्रीमियम मिळवा'}
              </Button>
            </Link>
            {user ? (
              <>
                <div className="text-sm text-muted-foreground px-3 py-2">{user.email}</div>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {language === 'en' ? 'Sign Out' : 'साइन आउट'}
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button variant="outline" size="sm" className="w-full">
                  {language === 'en' ? 'Sign In' : 'साइन इन'}
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
