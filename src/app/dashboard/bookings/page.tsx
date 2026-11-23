import { redirect } from 'next/navigation';

export default async function BookingsRedirectPage() {
  redirect('/dashboard/requests');
}
