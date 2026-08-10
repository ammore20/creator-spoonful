import { cn } from '@/lib/utils';

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: React.ReactNode;
}

/** Pill filter/toggle used in filter bars, category rows and tag lists. */
export const Chip = ({ active, icon, className, children, ...props }: ChipProps) => (
  <button
    type="button"
    aria-pressed={active}
    className={cn(
      'inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium border transition-all duration-200',
      active
        ? 'bg-primary text-primary-foreground border-primary shadow-pill'
        : 'bg-card text-muted-foreground border-border/70 hover:border-primary/40 hover:text-foreground',
      className,
    )}
    {...props}
  >
    {icon}
    {children}
  </button>
);

/** Non-interactive tag. */
export const Tag = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground',
      className,
    )}
  >
    {children}
  </span>
);
