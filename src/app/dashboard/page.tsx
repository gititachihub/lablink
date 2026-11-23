import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/queries/profile.queries';
import { getMyBookingRequests, getMyBookings } from '@/queries/booking.queries';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default async function DashboardOverviewPage() {
  const profile = await getCurrentProfile().catch(() => null);
  if (!profile) {
    redirect('/login');
  }

  const requests = await getMyBookingRequests().catch(() => []);
  const bookings = await getMyBookings().catch(() => []);

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  // Next upcoming booking
  const nextBooking = bookings.length > 0 ? bookings[0] : null;

  return (
    <div className="space-y-8">
      <PageHeader
        badge={`Role: ${profile.role.toUpperCase()}`}
        title={`Welcome, ${profile.fullName}`}
        description="Monitor your laboratory instrument requests, active slots, and department allocations."
        action={
          <Link href="/equipment">
            <Button variant="primary" size="md">
              Book New Instrument →
            </Button>
          </Link>
        }
      />

      {/* Summary Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="space-y-1">
          <span className="text-xs uppercase tracking-wider text-[#A1A1AA] font-semibold">Active Pending</span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black font-mono text-[#FBBF24]">{pendingCount}</span>
            <span className="text-xs text-[#A1A1AA]">/ 3 max cap</span>
          </div>
        </Card>

        <Card className="space-y-1">
          <span className="text-xs uppercase tracking-wider text-[#A1A1AA] font-semibold">Confirmed Bookings</span>
          <span className="text-3xl font-black font-mono text-[#4ADE80] block">{approvedCount}</span>
        </Card>

        <Card className="space-y-1">
          <span className="text-xs uppercase tracking-wider text-[#A1A1AA] font-semibold">Rejected / Infeasible</span>
          <span className="text-3xl font-black font-mono text-[#F87171] block">{rejectedCount}</span>
        </Card>
      </div>

      {/* Next Upcoming Booking */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#26262B] pb-3">
          <h2 className="text-base font-bold text-[#F5F5F5]">Next Confirmed Slot</h2>
          <Link href="/dashboard/requests" className="text-xs font-semibold text-[#FFD60A] hover:underline">
            View all requests →
          </Link>
        </div>

        {nextBooking ? (
          <div className="p-4 rounded-xl bg-[#17171A] border border-[#26262B] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <span className="font-bold text-[#F5F5F5] text-base block">{nextBooking.equipment?.name}</span>
              <span className="text-xs font-mono text-[#FFD60A]">Time Range: {nextBooking.time_range}</span>
            </div>
            <Badge status="approved" label="Confirmed" />
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-[#A1A1AA]">
            You have no confirmed bookings scheduled at this time.
          </div>
        )}
      </Card>
    </div>
  );
}
