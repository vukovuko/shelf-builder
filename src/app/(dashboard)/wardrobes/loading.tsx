import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function WardrobesLoading() {
  return (
    <div className="container max-w-7xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Moji Ormani</h1>
          <p className="text-muted-foreground mt-1">
            Upravljajte sačuvanim dizajnima ormana
          </p>
        </div>
        <Button disabled>
          <Plus className="h-4 w-4 mr-2" />
          Novi Orman
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="overflow-hidden gap-0 py-0">
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="px-3 py-2">
              <Skeleton className="h-5 w-3/4 mb-1.5" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
