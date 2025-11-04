import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Navbar } from '@/components/Navbar';
import { RefreshCw, Play, Loader2 } from 'lucide-react';
import type { User, Session } from '@supabase/supabase-js';

const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [pageToken, setPageToken] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          navigate('/auth');
        } else {
          setTimeout(() => {
            checkAdminRole(session.user.id);
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate('/auth');
      } else {
        checkAdminRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

      if (error || !data) {
        toast({
          title: 'Access Denied',
          description: 'You do not have admin privileges',
          variant: 'destructive'
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      setLoading(false);
      loadStats();
      loadQueue();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to verify admin access',
        variant: 'destructive'
      });
      navigate('/');
    }
  };

  const loadStats = async () => {
    const { data: videos } = await supabase
      .from('videos')
      .select('status')
      .order('created_at', { ascending: false });

    const statusCounts = videos?.reduce((acc: any, v: any) => {
      acc[v.status] = (acc[v.status] || 0) + 1;
      return acc;
    }, {}) || {};

    setStats({ statusCounts, totalVideos: videos?.length || 0 });
  };

  const loadQueue = async () => {
    const { data } = await supabase
      .from('processing_queue')
      .select(`
        id,
        status,
        attempts,
        last_error,
        created_at,
        videos (
          video_id,
          title,
          status
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    setQueueItems(data || []);
  };

  const runBackfill = async (batchSize: number) => {
    if (!session) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-operations', {
        body: {
          operation: 'backfill',
          batchSize,
          pageToken
        }
      });

      if (error) throw error;
      
      if (data.success) {
        // Update pageToken for next fetch
        if (data.nextPageToken) {
          setPageToken(data.nextPageToken);
        }
        
        toast({
          title: 'Backfill Started',
          description: `Ingested ${data.ingestedCount} new, queued ${data.queuedCount} videos`
        });
        loadStats();
        loadQueue();
      } else {
        throw new Error(data.error || 'Backfill failed');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to run backfill',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const processBatch = async (batchSize: number = 5) => {
    if (!session) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-operations', {
        body: {
          operation: 'process_batch',
          batchSize
        }
      });

      if (error) throw error;
      
      if (data.success) {
        toast({
          title: 'Batch Processing Complete',
          description: `Processed ${data.processed} videos`
        });
        loadStats();
        loadQueue();
      } else {
        throw new Error(data.error || 'Processing failed');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process batch',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const reprocessVideo = async (videoId: string) => {
    if (!session) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('admin-operations', {
        body: {
          operation: 'reprocess',
          videoId
        }
      });

      if (error) throw error;
      
      if (data.success) {
        toast({
          title: 'Video Requeued',
          description: 'Video has been queued for reprocessing'
        });
        loadQueue();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reprocess video',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar onSearch={() => {}} language="en" onLanguageToggle={() => {}} />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Admin Panel</h1>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Videos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalVideos}</div>
              </CardContent>
            </Card>
            {Object.entries(stats.statusCounts).map(([status, count]) => (
              <Card key={status}>
                <CardHeader>
                  <CardTitle className="text-sm capitalize">{status}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{count as number}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Processing Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pageToken && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-2">Pagination Active</div>
                <div className="flex gap-2 items-center">
                  <code className="text-xs bg-background px-2 py-1 rounded flex-1 truncate">
                    Token: {pageToken.substring(0, 20)}...
                  </code>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => setPageToken(null)}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            )}
            <div className="flex gap-4 flex-wrap">
              <Button 
                onClick={() => runBackfill(20)}
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <RefreshCw className="mr-2 w-4 h-4" />}
                {pageToken ? 'Fetch Next 20' : 'Seed (20 videos)'}
              </Button>
              <Button 
                onClick={() => runBackfill(10)}
                disabled={loading}
                variant="outline"
              >
                {pageToken ? 'Fetch Next 10' : 'Backfill (10 videos)'}
              </Button>
            </div>
            <Button 
              onClick={() => processBatch(5)}
              disabled={loading}
              variant="secondary"
            >
              {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Play className="mr-2 w-4 h-4" />}
              Process Next 5
            </Button>
          </CardContent>
        </Card>

        {/* Queue */}
        <Card>
          <CardHeader>
            <CardTitle>Processing Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {queueItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{(item.videos as any)?.title}</div>
                    <div className="text-sm text-muted-foreground">
                      Video ID: {(item.videos as any)?.video_id}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={item.status === 'completed' ? 'default' : item.status === 'failed' ? 'destructive' : 'secondary'}>
                        {item.status}
                      </Badge>
                      <Badge variant="outline">Attempts: {item.attempts}</Badge>
                    </div>
                    {item.last_error && (
                      <div className="text-sm text-destructive mt-2">{item.last_error}</div>
                    )}
                  </div>
                  {item.status === 'failed' && (
                    <Button 
                      size="sm" 
                      onClick={() => reprocessVideo((item.videos as any)?.video_id)}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;