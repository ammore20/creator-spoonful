import { useNavigate } from 'react-router-dom';
import { Crown, Lock, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';

interface PremiumGateProps {
  children: React.ReactNode;
}

export const PremiumGate = ({ children }: PremiumGateProps) => {
  const { user, isLoading, isPremium } = usePremiumStatus();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <LogIn className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to access Creator Spoonful recipes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => navigate('/auth')} className="w-full" size="lg">
              <LogIn className="w-5 h-5 mr-2" />
              Sign In
            </Button>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <button 
                onClick={() => navigate('/auth')} 
                className="text-primary hover:underline"
              >
                Sign up now
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-2 border-primary/20">
          <CardHeader>
            <div className="mx-auto w-20 h-20 bg-gradient-hero rounded-full flex items-center justify-center mb-4">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl">Premium Access Required</CardTitle>
            <CardDescription className="text-base mt-2">
              Creator Spoonful is exclusively available for premium members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3 text-left">
              {[
                'Access 1000+ authentic recipes',
                'Smart cooking timers & tools',
                'AI-powered recipe suggestions',
                'Save unlimited favorites',
                'Offline access via app',
                'Ad-free experience',
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Crown className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 space-y-3">
              <Button 
                onClick={() => navigate('/premium')} 
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90" 
                size="lg"
              >
                <Crown className="w-5 h-5 mr-2" />
                Upgrade to Premium
              </Button>
              <p className="text-sm text-muted-foreground">
                Plans starting at just ₹99/month
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
