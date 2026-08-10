import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Shared empty / no-results state. */
export const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => (
  <div
    className={cn(
      'rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center flex flex-col items-center',
      className,
    )}
  >
    <span className="w-14 h-14 rounded-2xl bg-secondary text-primary grid place-items-center mb-4">{icon}</span>
    <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
    {description && <p className="mt-1.5 text-sm text-muted-foreground max-w-sm">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);
