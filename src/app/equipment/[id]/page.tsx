import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEquipmentById, getEquipmentBusyRanges } from '@/queries/equipment.queries';
import { getCurrentProfile } from '@/queries/profile.queries';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';

export default async function EquipmentDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const equipment = await getEquipmentById(params.id).catch(() => null);

  if (!equipment) {
    notFound();
  }

  const profile = await getCurrentProfile().catch(() => null);

  // Fetch 7-day busy schedule
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 86400000);
  const busyRanges = await getEquipmentBusyRanges(
    equipment.id,
    now.toISOString(),
    nextWeek.toISOString()
  ).catch(() => []);

  const bookingHref = profile
    ? `/dashboard/requests/new?equipment=${equipment.id}`
    : `/login?redirect=/dashboard/requests/new?equipment=${equipment.id}`;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#A1A1AA]">
        <Link href="/" className="hover:text-[#FFD60A]">Home</Link>
        <span>/</span>
        <Link href="/equipment" className="hover:text-[#FFD60A]">Equipment</Link>
        <span>/</span>
        <span className="text-[#F5F5F5] font-semibold">{equipment.name}</span>
      </nav>

      {/* Main Details Card */}
      <Card className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-[#26262B]">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#17171A] text-[#A1A1AA] border border-[#26262B] font-mono">
                {equipment.category}
              </span>
              <Badge status={equipment.isOperational ? 'operational' : 'maintenance'} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F5F5F5]">{equipment.name}</h1>
          </div>

          <Link href={bookingHref} className="w-full sm:w-auto">
            <Button variant="primary" size="md" className="w-full">
              Request this equipment →
            </Button>
          </Link>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Overview</h2>
          <p className="text-sm text-[#F5F5F5] leading-relaxed">{equipment.description}</p>
        </div>

        {/* Quick parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#26262B]">
          <div className="bg-[#17171A] p-4 rounded-xl border border-[#26262B]">
            <span className="text-xs text-[#A1A1AA] block">Campus Operating Hours</span>
            <span className="text-sm font-mono text-[#F5F5F5] font-bold">{equipment.labOpen} - {equipment.labClose} IST</span>
          </div>
          <div className="bg-[#17171A] p-4 rounded-xl border border-[#26262B]">
            <span className="text-xs text-[#A1A1AA] block">Max Slot Duration</span>
            <span className="text-sm font-mono text-[#F5F5F5] font-bold">{equipment.maxBookingHours} Hours</span>
          </div>
          <div className="bg-[#17171A] p-4 rounded-xl border border-[#26262B]">
            <span className="text-xs text-[#A1A1AA] block">Access Requirement</span>
            <span className={`text-sm font-bold ${equipment.requiresTraining ? 'text-[#FBBF24]' : 'text-[#4ADE80]'}`}>
              {equipment.requiresTraining ? 'Training Required' : 'Open Access'}
            </span>
          </div>
        </div>

        {/* Technical Specifications Table */}
        {equipment.specifications && Object.keys(equipment.specifications).length > 0 && (
          <div className="space-y-3 pt-4 border-t border-[#26262B]">
            <h2 className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Technical Specifications</h2>
            <Table caption="Instrument Technical Specifications" headers={['Parameter', 'Value']}>
              {Object.entries(equipment.specifications).map(([key, val]) => (
                <tr key={key} className="hover:bg-[#17171A]/50">
                  <td className="px-4 py-2.5 font-medium text-[#A1A1AA] capitalize">{key}</td>
                  <td className="px-4 py-2.5 font-mono text-[#F5F5F5]">{String(val)}</td>
                </tr>
              ))}
            </Table>
          </div>
        )}

        {/* 7-Day Availability Timeline (Not colour-only: visual bars + explicit text list) */}
        <div className="space-y-4 pt-4 border-t border-[#26262B]">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
              7-Day Availability Schedule (Asia/Kolkata)
            </h2>
            <span className="text-[11px] text-[#A1A1AA]">Exclusion-safe bookings only</span>
          </div>

          {busyRanges.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#0E2916]/30 border border-[#4ADE80]/30 text-xs text-[#4ADE80] flex items-center gap-2">
              <span aria-hidden="true">✓</span>
              <span>All scheduled daily operational hours are currently free over the next 7 days.</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <span className="text-xs text-[#A1A1AA] block">Confirmed Reserved Intervals (Explicit Text List):</span>
                <ul className="space-y-1.5 text-xs font-mono">
                  {busyRanges.map((range, idx) => (
                    <li key={idx} className="bg-[#17171A] p-2.5 rounded-lg border border-[#26262B] flex justify-between items-center">
                      <span className="text-[#F87171] font-bold flex items-center gap-1.5">
                        <span aria-hidden="true">■</span> Busy Slot #{idx + 1}
                      </span>
                      <span className="text-[#F5F5F5]">{range}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
