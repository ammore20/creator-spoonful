import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Navbar } from '@/components/Navbar';
import { RefreshCw, Play, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const Admin = () => {
  const [email, setEmail] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const { toast } = useToast();

  const checkAuth = async () => {
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
    if (email === adminEmail) {
      setIsAuthorized(true);
      loadStats();
      loadQueue();
    } else {
      toast({
        title: 'Unauthorized',
        description: 'Invalid admin email',
        variant: 'destructive'
      });
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
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-operations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          operation: 'backfill',
          email,
          channelId: 'UCxxxxxxxxxxxxxx', // Replace with actual channel ID
          batchSize
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Backfill Started',
          description: `Queued ${data.queuedCount} videos for processing`
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
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-operations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          operation: 'process_batch',
          email,
          batchSize
        })
      });

      const data = await response.json();
      
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
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-operations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          operation: 'reprocess',
          email,
          videoId
        })
      });

      const data = await response.json();
      
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

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                type="email"
                placeholder="Admin Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button onClick={checkAuth} className="w-full">
                Access Admin Panel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
            <div className="flex gap-4">
              <Button 
                onClick={() => runBackfill(20)}
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <RefreshCw className="mr-2 w-4 h-4" />}
                Seed (20 videos)
              </Button>
              <Button 
                onClick={() => runBackfill(10)}
                disabled={loading}
                variant="outline"
              >
                Backfill (10 videos)
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