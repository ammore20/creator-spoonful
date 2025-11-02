import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck } from 'lucide-react';
import type { User, Session } from '@supabase/supabase-js';

const SetupAdmin = () => {
  const [isSettingUpAdmin, setIsSettingUpAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        toast({
          title: 'Not authenticated',
          description: 'Please sign in first',
          variant: 'destructive'
        });
        navigate('/auth');
      }
    });
  }, [navigate, toast]);

  const handleSetupAdmin = async () => {
    setIsSettingUpAdmin(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: 'Error',
          description: 'Please sign in first',
          variant: 'destructive'
        });
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase.functions.invoke('setup-admin', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: data.message
      });
      
      // Redirect to admin page after successful setup
      setTimeout(() => {
        navigate("/admin");
      }, 1500);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to setup admin access',
        variant: 'destructive'
      });
    } finally {
      setIsSettingUpAdmin(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Admin Access Setup</CardTitle>
          <CardDescription>
            Grant yourself admin privileges to access the admin panel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground text-center p-4 bg-muted rounded-lg">
            <p className="font-medium mb-2">Signed in as:</p>
            <p className="text-foreground">{user.email}</p>
          </div>
          
          <Button 
            onClick={handleSetupAdmin} 
            disabled={isSettingUpAdmin}
            className="w-full"
          >
            {isSettingUpAdmin ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up admin access...
              </>
            ) : (
              'Setup Admin Access'
            )}
          </Button>
          
          <div className="text-xs text-muted-foreground text-center">
            Only authorized administrators should use this page
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupAdmin;
