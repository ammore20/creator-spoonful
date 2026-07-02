import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Warn thresholds (INR-equivalent — cost_tracking stores estimated_cost in USD).
const WARN_DAILY_USD = 5;
const CRIT_DAILY_USD = 15;

type Row = {
  operation_type: string;
  estimated_cost: number | null;
  tokens_used: number | null;
  created_at: string;
  video_id: string | null;
};

export const AICostDashboard = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [failed, setFailed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [{ data }, { count }] = await Promise.all([
        supabase
          .from('cost_tracking')
          .select('operation_type, estimated_cost, tokens_used, created_at, video_id')
          .gte('created_at', since)
          .order('estimated_cost', { ascending: false }),
        supabase
          .from('videos')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'error')
          .gte('created_at', since),
      ]);
      setRows((data as Row[]) || []);
      setFailed(count || 0);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return null;

  const requests = rows.length;
  const totalTokens = rows.reduce((s, r) => s + (r.tokens_used || 0), 0);
  const totalCost = rows.reduce((s, r) => s + (Number(r.estimated_cost) || 0), 0);
  const topOps = Object.entries(
    rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.operation_type] = (acc[r.operation_type] || 0) + (Number(r.estimated_cost) || 0);
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const level =
    totalCost >= CRIT_DAILY_USD ? 'critical' : totalCost >= WARN_DAILY_USD ? 'warn' : 'ok';

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>AI Cost — last 24h</CardTitle>
        <Badge variant={level === 'ok' ? 'secondary' : level === 'warn' ? 'default' : 'destructive'}>
          {level === 'ok' ? 'Within budget' : level === 'warn' ? 'Warning' : 'Over budget'}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Stat label="Requests" value={requests.toString()} />
          <Stat label="Tokens" value={totalTokens.toLocaleString()} />
          <Stat label="Est. cost" value={`$${totalCost.toFixed(3)}`} />
          <Stat label="Failed videos" value={failed.toString()} />
          <Stat label="Warn / Crit" value={`$${WARN_DAILY_USD} / $${CRIT_DAILY_USD}`} />
        </div>
        <div>
          <div className="text-sm font-medium mb-2">Most expensive operations</div>
          <div className="space-y-1 text-sm">
            {topOps.length === 0 && <div className="text-muted-foreground">No activity.</div>}
            {topOps.map(([op, cost]) => (
              <div key={op} className="flex justify-between border-b py-1">
                <span className="capitalize">{op}</span>
                <span className="font-mono">${cost.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded border p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-xl font-bold">{value}</div>
  </div>
);
