import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

type Draft = {
  video_id: string;
  title: string;
  confidence: number | null;
  transcript_source: string | null;
  raw_transcript: string | null;
  extracted_recipe_json: any;
};

export const ReviewQueue = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Draft[]>([]);
  const [editing, setEditing] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await (supabase as any)
      .from('videos')
      .select('video_id, title, confidence, transcript_source, raw_transcript, extracted_recipe_json')
      .eq('status', 'done')
      .eq('review_status', 'draft')
      .order('updated_at', { ascending: false })
      .limit(20);
    setItems(((data as Draft[]) || []).filter((d) => !d.extracted_recipe_json?.no_recipe));
  };
  useEffect(() => { load(); }, []);

  const op = async (body: Record<string, unknown>, msg: string) => {
    const { data, error } = await supabase.functions.invoke('admin-operations', { body });
    if (error || !data?.success) {
      toast({ variant: 'destructive', description: 'Action failed' });
      return false;
    }
    toast({ description: msg });
    return true;
  };

  const save = async (d: Draft) => {
    try {
      const recipe = JSON.parse(editing[d.video_id]);
      if (await op({ operation: 'update_recipe', videoId: d.video_id, recipe }, 'Saved')) {
        setEditing((e) => { const n = { ...e }; delete n[d.video_id]; return n; });
        load();
      }
    } catch {
      toast({ variant: 'destructive', description: 'Recipe is not valid JSON' });
    }
  };

  const decide = async (d: Draft, decision: 'approve' | 'reject') => {
    if (await op({ operation: 'review', videoId: d.video_id, decision }, decision === 'approve' ? 'Approved' : 'Rejected')) load();
  };

  return (
    <Card className="mb-8">
      <CardHeader><CardTitle>Review queue ({items.length})</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No drafts waiting.</p>}
        {items.map((d) => {
          const isEditing = d.video_id in editing;
          return (
            <div key={d.video_id} className="border rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{d.title}</span>
                <Badge variant="outline">Confidence {d.confidence != null ? Math.round(d.confidence * 100) + '%' : 'n/a'}</Badge>
                <Badge variant="secondary">{d.transcript_source ?? 'unknown source'}</Badge>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="text-xs bg-muted rounded p-3 max-h-72 overflow-auto whitespace-pre-wrap">
                  {(d.raw_transcript ?? '').slice(0, 3000)}
                </div>
                {isEditing ? (
                  <Textarea
                    className="text-xs font-mono min-h-72"
                    value={editing[d.video_id]}
                    onChange={(e) => setEditing((x) => ({ ...x, [d.video_id]: e.target.value }))}
                  />
                ) : (
                  <div className="text-xs bg-muted rounded p-3 max-h-72 overflow-auto">
                    <div className="font-semibold mb-1">Ingredients</div>
                    <ul className="list-disc pl-4 mb-2">{(d.extracted_recipe_json?.ingredients ?? []).map((i: string, k: number) => <li key={k}>{i}</li>)}</ul>
                    <div className="font-semibold mb-1">Steps</div>
                    <ol className="list-decimal pl-4">{(d.extracted_recipe_json?.steps ?? []).map((i: string, k: number) => <li key={k}>{i}</li>)}</ol>
                    {d.extracted_recipe_json?.missing_info?.length > 0 && (
                      <div className="mt-2 text-muted-foreground">Missing: {d.extracted_recipe_json.missing_info.join(', ')}</div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => decide(d, 'approve')}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => decide(d, 'reject')}>Reject</Button>
                {isEditing ? (
                  <Button size="sm" variant="secondary" onClick={() => save(d)}>Save edit</Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => setEditing((x) => ({ ...x, [d.video_id]: JSON.stringify(d.extracted_recipe_json, null, 2) }))}>Edit</Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
