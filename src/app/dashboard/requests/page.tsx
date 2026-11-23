import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentProfile } from '@/queries/profile.queries';
import { getMyBookingRequests } from '@/queries/booking.queries';
import { PageHeader } from '@/components/ui/page-header';
import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { CancelBookingButton } from '@/components/cancel-booking-button';

export default async function StudentRequestsPage() {
  const profile = await getCurrentProfile().catch(() => null);
  if (!profile) {
    redirect('/login');
  }

  const myRequests = await getMyBookingRequests().catch(() => []);

  return (
    <div className="space-y-8">
      <PageHeader
        badge="History & Status"
        title="My Booking Requests"
        description="Track all submitted laboratory slots, faculty decisions, and alternative recommendations."
        action={
          <Link href="/dashboard/requests/new">
            <Button variant="primary" size="md">
              + New Request
            </Button>
          </Link>
        }
      />

      {myRequests.length === 0 ? (
        <EmptyState
          title="No booking requests yet"
          description="Browse campus equipment catalogue to submit your first research slot request."
          actionHref="/equipment"
          actionLabel="Browse instruments"
        />
      ) : (
        <Table
          caption="Student laboratory booking requests history"
          headers={['Instrument', 'Project Title', 'Campus Time (IST)', 'Deadline', 'Status', 'Action']}
        >
          {myRequests.map((req) => (
            <tr key={req.id} className="hover:bg-[#17171A]/40 transition-colors">
              <td className="px-4 py-3 font-semibold text-[#F5F5F5]">
                {req.equipment?.name || 'Instrument'}
              </td>
              <td className="px-4 py-3 text-[#A1A1AA] max-w-xs truncate">
                {req.project_title}
              </td>
              <td className="px-4 py-3 font-mono text-[11px] text-[#A1A1AA]">
                {req.time_range}
              </td>
              <td className="px-4 py-3 font-mono text-[11px] text-[#A1A1AA]">
                {new Date(req.deadline).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <Badge status={req.status as 'pending' | 'approved' | 'rejected' | 'cancelled'} />
              </td>
              <td className="px-4 py-3">
                {req.status === 'pending' && <CancelBookingButton requestId={req.id} />}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
