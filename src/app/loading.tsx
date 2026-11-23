import { EquipmentCardSkeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-8 animate-fade-up">
      <div className="space-y-2">
        <div className="h-8 w-64 bg-[#17171A] rounded-lg animate-skeleton" />
        <div className="h-4 w-96 bg-[#17171A] rounded-lg animate-skeleton" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <EquipmentCardSkeleton />
        <EquipmentCardSkeleton />
        <EquipmentCardSkeleton />
      </div>
    </div>
  );
}
