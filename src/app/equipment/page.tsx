import Link from 'next/link';
import { getEquipmentList, getDepartments } from '@/queries/equipment.queries';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';

export default async function EquipmentCataloguePage(props: {
  searchParams: Promise<{ q?: string; dept?: string; cat?: string }>;
}) {
  const searchParams = await props.searchParams;
  const departments = await getDepartments().catch(() => []);
  const equipment = await getEquipmentList({
    query: searchParams.q,
    departmentId: searchParams.dept,
    category: searchParams.cat,
  }).catch(() => []);


  return (
    <div className="space-y-8">
      <PageHeader
        badge="Catalogue"
        title="Campus Research Equipment"
        description="Discover and inspect available specialized scientific hardware across university faculties."
      />

      {/* Filter and Search Bar */}
      <div className="bg-[#0F0F10] border border-[#26262B] rounded-xl p-4 space-y-4">
        <form method="GET" className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            name="q"
            defaultValue={searchParams.q || ''}
            placeholder="Search instruments by name..."
            aria-label="Search instruments by name"
            className="flex-1 bg-[#050505] border border-[#26262B] rounded-lg px-4 py-2 text-sm text-[#F5F5F5] placeholder-[#71717A] focus:border-[#FFD60A] focus:outline-none"
          />
          <Button type="submit" variant="primary" size="md">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#26262B] text-xs">
          <span className="text-[#A1A1AA] font-semibold mr-1">Department:</span>
          <Link
            href="/equipment"
            className={`px-3 py-1 rounded-lg border transition-colors ${
              !searchParams.dept
                ? 'bg-[#FFD60A] text-[#0A0A0A] border-[#FFD60A] font-bold'
                : 'bg-[#17171A] text-[#A1A1AA] border-[#26262B] hover:text-[#F5F5F5]'
            }`}
          >
            All
          </Link>
          {departments.map((d) => (
            <Link
              key={d.id}
              href={`/equipment?dept=${d.id}${searchParams.q ? `&q=${searchParams.q}` : ''}`}
              className={`px-3 py-1 rounded-lg border transition-colors ${
                searchParams.dept === d.id
                  ? 'bg-[#FFD60A] text-[#0A0A0A] border-[#FFD60A] font-bold'
                  : 'bg-[#17171A] text-[#A1A1AA] border-[#26262B] hover:text-[#F5F5F5]'
              }`}
            >
              {d.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
        <span>Showing {equipment.length} instruments</span>
        <span>Campus standard operating timezone: Asia/Kolkata</span>
      </div>

      {/* Grid or Empty State */}
      {equipment.length === 0 ? (
        <EmptyState
          title="No instruments found"
          description="Try broadening your search query or removing department filters."
          actionHref="/equipment"
          actionLabel="Reset filters"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipment.map((item) => (
            <Card key={item.id} hoverLift className="flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] px-2 py-0.5 rounded bg-[#17171A] text-[#A1A1AA] font-mono border border-[#26262B]">
                    {item.category}
                  </span>
                  <Badge status={item.isOperational ? 'operational' : 'maintenance'} />
                </div>
                <h2 className="text-lg font-bold text-[#F5F5F5]">
                  <Link href={`/equipment/${item.id}`} className="hover:text-[#FFD60A] transition-colors">
                    {item.name}
                  </Link>
                </h2>
                <p className="text-xs text-[#A1A1AA] line-clamp-2 leading-relaxed">{item.description}</p>

                <div className="bg-[#17171A] p-3 rounded-lg border border-[#26262B] text-xs space-y-1.5 text-[#A1A1AA]">
                  <div className="flex justify-between">
                    <span className="text-[#71717A]">Hours:</span>
                    <span className="text-[#F5F5F5] font-mono">{item.labOpen} - {item.labClose} IST</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#71717A]">Max Slot:</span>
                    <span className="text-[#F5F5F5] font-mono">{item.maxBookingHours} hrs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#71717A]">Access:</span>
                    <span className={item.requiresTraining ? 'text-[#FBBF24] font-medium' : 'text-[#A1A1AA]'}>
                      {item.requiresTraining ? 'Training Required' : 'Open Access'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#26262B] flex gap-2">
                <Link href={`/equipment/${item.id}`} className="flex-1">
                  <Button variant="secondary" size="sm" className="w-full">
                    Inspect Specs
                  </Button>
                </Link>
                <Link href={`/dashboard/requests/new?equipment=${item.id}`} className="flex-1">
                  <Button variant="primary" size="sm" className="w-full">
                    Request Slot
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
