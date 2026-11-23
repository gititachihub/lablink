import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/queries/profile.queries';
import { getEquipmentList } from '@/queries/equipment.queries';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { BookingRequestForm } from '@/components/booking-request-form';

export default async function NewRequestPage(props: {
  searchParams: Promise<{ equipment?: string }>;
}) {
  const profile = await getCurrentProfile().catch(() => null);
  if (!profile) {
    redirect('/login');
  }

  const searchParams = await props.searchParams;
  const equipmentList = await getEquipmentList().catch(() => []);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <PageHeader
        badge="Campus Time: Asia/Kolkata"
        title="Submit Booking Request"
        description="Specify your target slot and experiment deadline. Max 3 active pending requests per student."
      />

      <Card>
        <BookingRequestForm
          equipmentList={equipmentList}
          preselectedEquipmentId={searchParams.equipment}
        />
      </Card>
    </div>
  );
}
