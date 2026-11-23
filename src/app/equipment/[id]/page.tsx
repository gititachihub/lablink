import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEquipmentById, getEquipmentBusyRanges } from '@/queries/equipment.queries';

export default async function EquipmentDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const equipment = await getEquipmentById(params.id);

  if (!equipment) {
    notFound();
  }

  // Fetch busy slots for the next 7 days
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 86400000);
  const busyRanges = await getEquipmentBusyRanges(
    equipment.id,
    now.toISOString(),
    nextWeek.toISOString()
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/" className="hover:text-yellow-400">Catalogue</Link>
        <span>/</span>
        <span className="text-zinc-300 font-medium">{equipment.name}</span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium">
                {equipment.category}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                equipment.isOperational ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}>
                {equipment.isOperational ? 'Operational' : 'Under Maintenance'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{equipment.name}</h1>
          </div>

          <Link
            href={`/dashboard/bookings?equipmentId=${equipment.id}`}
            className="w-full sm:w-auto px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-lg text-sm transition-colors text-center shadow-sm"
          >
            Submit Booking Request
          </Link>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Overview</h2>
          <p className="text-zinc-300 text-sm leading-relaxed">{equipment.description}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
            <span className="text-xs text-zinc-500 block">Daily Hours</span>
            <span className="text-sm font-mono text-zinc-200 font-semibold">{equipment.labOpen} - {equipment.labClose} IST</span>
          </div>
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
            <span className="text-xs text-zinc-500 block">Max Slot Duration</span>
            <span className="text-sm font-mono text-zinc-200 font-semibold">{equipment.maxBookingHours} Hours</span>
          </div>
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
            <span className="text-xs text-zinc-500 block">Access Prerequisite</span>
            <span className={`text-sm font-semibold ${equipment.requiresTraining ? 'text-amber-400' : 'text-zinc-300'}`}>
              {equipment.requiresTraining ? 'Training Certification' : 'Open Access'}
            </span>
          </div>
        </div>

        {equipment.specifications && Object.keys(equipment.specifications).length > 0 && (
          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Technical Specifications</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {Object.entries(equipment.specifications).map(([key, val]) => (
                <div key={key} className="flex justify-between p-2.5 rounded bg-zinc-950/60 border border-zinc-800/80">
                  <span className="text-zinc-400 capitalize">{key}:</span>
                  <span className="text-zinc-200 font-mono font-medium">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3 pt-4 border-t border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Anonymized Schedule Availability (Next 7 Days)</h2>
          {busyRanges.length === 0 ? (
            <p className="text-xs text-emerald-400 bg-emerald-950/20 p-3 rounded-lg border border-emerald-900/40">
              ✓ All standard hours are currently open this week.
            </p>
          ) : (
            <ul className="space-y-1.5 text-xs font-mono text-zinc-400">
              {busyRanges.map((range, idx) => (
                <li key={idx} className="bg-zinc-950 p-2.5 rounded border border-zinc-800 flex justify-between">
                  <span className="text-rose-400">Reserved Slot</span>
                  <span>{range}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
