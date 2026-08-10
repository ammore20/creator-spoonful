import { cn } from '@/lib/utils';

/**
 * Panel — the base surface of the design system.
 * A soft white card with hairline border and low-contrast shadow.
 */
export const Panel = ({
  className,
  children,
  as: As = 'div',
  padded = true,
  hover = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  as?: React.ElementType;
  padded?: boolean;
  hover?: boolean;
}) => (
  <As
    className={cn(
      'rounded-2xl border border-border/70 bg-card shadow-soft',
      padded && 'p-4 sm:p-5',
      hover && 'transition-all duration-300 hover:shadow-card hover:border-border',
      className,
    )}
    {...props}
  >
    {children}
  </As>
);
