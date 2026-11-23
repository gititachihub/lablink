import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`bg-[#17171A] border border-[#26262B] rounded-lg animate-skeleton ${className}`}
    />
  );
}

export function EquipmentCardSkeleton() {
  return (
    <div className="bg-[#0F0F10] border border-[#26262B] rounded-xl p-5 space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2 pt-2 border-t border-[#26262B]">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="h-9 w-full" />
    </div>
  );
}
