import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  className?: string;
}

/** Section title row used across every listing surface. */
export const SectionHeader = ({
  title,
  subtitle,
  icon,
  actionLabel,
  actionTo,
  onAction,
  className,
}: SectionHeaderProps) => {
  const action = actionLabel && (
    <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
      {actionLabel}
      <ArrowUpRight className="w-3.5 h-3.5" />
    </span>
  );

  return (
    <div className={cn('flex items-end justify-between gap-3 mb-3 sm:mb-4', className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && (
          <span className="shrink-0 w-9 h-9 rounded-xl bg-secondary text-primary grid place-items-center">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="font-display text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
            {title}
          </h2>
          {subtitle && <p className="text-xs sm:text-sm text-muted-foreground truncate">{subtitle}</p>}
        </div>
      </div>
      {actionLabel && (actionTo ? <Link to={actionTo}>{action}</Link> : <button onClick={onAction}>{action}</button>)}
    </div>
  );
};
