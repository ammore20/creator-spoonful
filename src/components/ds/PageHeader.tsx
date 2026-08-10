import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}

/** Consistent page title block for every route. */
export const PageHeader = ({ title, description, eyebrow, actions, className }: PageHeaderProps) => (
  <div className={cn('flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8', className)}>
    <div className="min-w-0">
      {eyebrow && (
        <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-2">
          {eyebrow}
        </span>
      )}
      <h1 className="font-display text-2xl sm:text-3xl md:text-[2rem] font-bold text-foreground leading-tight">
        {title}
      </h1>
      {description && (
        <p className="mt-1.5 text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">{description}</p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);
