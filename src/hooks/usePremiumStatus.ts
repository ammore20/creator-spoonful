import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface PremiumStatus {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isPremium: boolean;
  isAdmin: boolean;
  subscriptionDetails: any | null;
}

export const usePremiumStatus = (): PremiumStatus => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer Supabase calls with setTimeout
          setTimeout(() => {
            checkPremiumAndAdmin(session.user.id);
          }, 0);
        } else {
          setIsPremium(false);
          setIsAdmin(false);
          setSubscriptionDetails(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkPremiumAndAdmin(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkPremiumAndAdmin = async (userId: string) => {
    try {
      // Check admin role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      setIsAdmin(!!roleData);

      // Admins automatically have premium access
      if (roleData) {
        setIsPremium(true);
        setSubscriptionDetails({ type: 'admin' });
        setIsLoading(false);
        return;
      }

      // Check premium subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subData) {
        const now = new Date();
        const isValid = !subData.expires_at || new Date(subData.expires_at) > now;
        setIsPremium(isValid);
        setSubscriptionDetails(isValid ? subData : null);
      } else {
        setIsPremium(false);
        setSubscriptionDetails(null);
      }
    } catch (error) {
      console.error('Error checking premium status:', error);
      setIsPremium(false);
      setSubscriptionDetails(null);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    session,
    isLoading,
    isPremium,
    isAdmin,
    subscriptionDetails,
  };
};
