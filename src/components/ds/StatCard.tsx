import { Panel } from './Panel';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  hint?: string;
  tone?: 'primary' | 'accent' | 'neutral';
  className?: string;
}

const tones = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent/15 text-accent-foreground',
  neutral: 'bg-secondary text-muted-foreground',
};

/** Compact metric tile (reference dashboard stat row). */
export const StatCard = ({ icon, value, label, hint, tone = 'primary', className }: StatCardProps) => (
  <Panel hover className={cn('flex flex-col gap-3', className)}>
    <span className={cn('w-9 h-9 rounded-xl grid place-items-center', tones[tone])}>{icon}</span>
    <div>
      <p className="font-display text-xl sm:text-2xl font-bold text-foreground leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
    {hint && (
      <span className="inline-flex w-fit items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
        {hint}
      </span>
    )}
  </Panel>
);
