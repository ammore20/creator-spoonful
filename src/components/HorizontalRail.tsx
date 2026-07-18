import { useRef, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HorizontalRailProps {
  title: string;
  subtitle?: string;
  icon?: string;
  accent?: string; // tailwind gradient classes e.g. "from-primary/10 to-accent/10"
  action?: ReactNode;
  children: ReactNode;
}

export const HorizontalRail = ({ title, subtitle, icon, accent, action, children }: HorizontalRailProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.85;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <section
      className={`rounded-xl sm:rounded-2xl border border-border p-3 sm:p-5 bg-gradient-to-r ${accent ?? 'from-card to-card'}`}
    >
      <div className="flex items-end justify-between gap-2 mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {icon && <span className="text-2xl sm:text-3xl flex-shrink-0">{icon}</span>}
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold text-foreground truncate">{title}</h2>
            {subtitle && (
              <p className="text-[11px] sm:text-sm text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {action}
          <Button
            size="icon"
            variant="outline"
            className="hidden sm:inline-flex h-8 w-8 rounded-full"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="hidden sm:inline-flex h-8 w-8 rounded-full"
            onClick={() => scroll('right')}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-3 sm:-mx-5 px-3 sm:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </section>
  );
};
