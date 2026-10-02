import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type Estimate = { videos: number; approxMinutes: number; aiUsd: number; supadataMinutesIfNoCaptions: number };

export const CreatorProcessing = ({
  creators,
  selectedCreatorId,
  onSelect,
  onQueued,
}: {
  creators: { id: string; name: string }[];
  selectedCreatorId: string;
  onSelect: (id: string) => void;
  onQueued: () => void;
}) => {
  const { toast } = useToast();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [busy, setBusy] = useState(false);

  const call = async (operation: 'estimate_reprocess_creator' | 'reprocess_creator') => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-operations', {
        body: { operation, creatorId: selectedCreatorId },
      });
      if (error || !data?.success) throw error ?? new Error(data?.error);
      if (operation === 'estimate_reprocess_creator') setEstimate(data.estimate);
      else {
        toast({ title: 'Queued', description: `${data.queued} videos queued. They will reappear after review.` });
        setEstimate(null);
        onQueued();
      }
    } catch (e) {
      toast({ variant: 'destructive', description: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 p-3 bg-muted rounded-lg">
      <div className="text-sm font-medium">Creator</div>
      <Select value={selectedCreatorId} onValueChange={(v) => { onSelect(v); setEstimate(null); }}>
        <SelectTrigger className="max-w-md bg-background"><SelectValue placeholder="Select a creator" /></SelectTrigger>
        <SelectContent>
          {creators.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
      {selectedCreatorId && (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => call('estimate_reprocess_creator')}>
            {busy && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}Estimate reprocess cost
          </Button>
          {estimate && (
            <>
              <span className="text-sm text-muted-foreground">
                {estimate.videos} videos, about {estimate.approxMinutes} min. AI about ${estimate.aiUsd}. Up to {estimate.supadataMinutesIfNoCaptions} transcript minutes if videos lack captions.
              </span>
              <Button size="sm" variant="destructive" disabled={busy} onClick={() => call('reprocess_creator')}>
                Confirm reprocess
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
