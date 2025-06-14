import { Skeleton } from "@/components/ui/skeleton";

export function ProductDetailSkeleton() {
  return (
    <div className="container mx-auto py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Product Image Skeleton */}
        <div className="relative aspect-square bg-gray-100 overflow-hidden">
          <Skeleton className="w-full h-full" />
        </div>
        
        {/* Product Details Skeleton */}
        <div className="space-y-6">
          <Skeleton className="h-10 w-3/4" />
          
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-6 w-20" />
          </div>
          
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          
          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center gap-4 mb-6">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 flex-1" />
            </div>
            
            <div className="mb-6">
              <Skeleton className="h-10 w-full" />
            </div>
            
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs Skeleton */}
      <div className="mt-16">
        <div className="border-b w-full">
          <div className="flex gap-4 mb-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
        <div className="py-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
      
      {/* Related Products Skeleton */}
      <div className="mt-24">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}