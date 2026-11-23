import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/queries/profile.queries';
import { getEquipmentList } from '@/queries/equipment.queries';
import { getMyBookingRequests } from '@/queries/booking.queries';
import { BookingRequestForm } from '@/components/booking-request-form';
import { CancelBookingButton } from '@/components/cancel-booking-button';

export default async function StudentBookingsPage(props: {
  searchParams: Promise<{ equipmentId?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login');
  }

  const searchParams = await props.searchParams;
  const equipmentList = await getEquipmentList();
  const myRequests = await getMyBookingRequests();

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Student Lab Portal</h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Welcome back, <span className="text-yellow-400 font-semibold">{profile.fullName}</span>. Track your active slots and request new equipment access.
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
          <span className="text-zinc-500">Active Requests: </span>
          <span className="text-yellow-400 font-mono font-bold">
            {myRequests.filter((r) => r.status === 'pending').length} / 3 cap
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Request Form */}
        <section aria-label="Submit Booking Request" className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="border-b border-zinc-800 pb-3">
            <h2 className="text-base font-bold text-white">Book Instrument Slot</h2>
            <p className="text-zinc-400 text-xs">Times stored in UTC; specify in your campus hours.</p>
          </div>
          <BookingRequestForm
            equipmentList={equipmentList}
            preselectedEquipmentId={searchParams.equipmentId}
          />
        </section>

        {/* Right: Existing Requests */}
        <section aria-label="My Requests" className="lg:col-span-7 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">My Booking History ({myRequests.length})</h2>
            <span className="text-xs text-zinc-500">Live DB updates</span>
          </div>

          {myRequests.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/40 rounded-xl border border-zinc-800 text-zinc-400 text-sm">
              You have not submitted any booking requests yet.
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{req.equipment?.name || 'Equipment'}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        req.status === 'approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                        req.status === 'pending' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        req.status === 'rejected' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                        'bg-zinc-800 text-zinc-400'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <p className="text-zinc-300 font-medium">{req.project_title}</p>
                    <p className="text-zinc-500 font-mono text-[11px]">Slot: {req.time_range}</p>
                    {req.review_note && (
                      <p className="text-yellow-400/90 text-[11px] pt-1">
                        Note: {req.review_note}
                      </p>
                    )}
                  </div>

                  {req.status === 'pending' && (
                    <CancelBookingButton requestId={req.id} />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
