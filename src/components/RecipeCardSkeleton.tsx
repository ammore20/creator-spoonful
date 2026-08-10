export const RecipeCardSkeleton = () => (
  <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-soft">
    <div className="aspect-[4/3] bg-muted animate-pulse" />
    <div className="p-3 space-y-2">
      <div className="h-3.5 w-4/5 rounded-full bg-muted animate-pulse" />
      <div className="h-3 w-2/5 rounded-full bg-muted animate-pulse" />
      <div className="flex gap-1.5 pt-1">
        <div className="h-5 w-14 rounded-full bg-muted animate-pulse" />
        <div className="h-5 w-10 rounded-full bg-muted animate-pulse" />
      </div>
    </div>
  </div>
);
