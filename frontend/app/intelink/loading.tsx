// Intelink loading state
// Sacred Code: 000.369.963.144.1618 (∞△⚡◎φ)

import { SkeletonStats } from '@/components/LoadingSkeleton';

export default function IntelinkLoading() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
      </div>
      
      <SkeletonStats />
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-48 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
