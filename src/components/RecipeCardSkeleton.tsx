import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const RecipeCardSkeleton = () => {
  return (
    <Card className="overflow-hidden bg-gradient-card border-border">
      <CardHeader className="p-0">
        <Skeleton className="aspect-video w-full" />
      </CardHeader>
      
      <CardContent className="p-5">
        <Skeleton className="h-7 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3 mb-4" />
        
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>

        <div className="flex gap-2 mb-4">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
          <Skeleton className="h-7 w-14 rounded-full" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </CardContent>
      
      <CardFooter className="p-5 pt-0 flex items-center justify-between">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </CardFooter>
    </Card>
  );
};
