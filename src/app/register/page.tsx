import Link from 'next/link';
import { getDepartments } from '@/queries/equipment.queries';
import { RegisterForm } from '@/components/register-form';
import { Card } from '@/components/ui/card';

export default async function RegisterPage() {
  const departments = await getDepartments().catch(() => []);

  return (
    <div className="max-w-md mx-auto space-y-6 pt-6">
      <div className="text-center space-y-1.5">
        <h1 className="text-2xl font-black text-[#F5F5F5] tracking-tight">Create Student Account</h1>
        <p className="text-[#A1A1AA] text-xs">
          Join your department to request access to specialized campus equipment.
        </p>
      </div>

      <Card>
        <RegisterForm departments={departments} />
      </Card>

      <p className="text-center text-xs text-[#A1A1AA]">
        Already registered?{' '}
        <Link href="/login" className="text-[#FFD60A] hover:underline font-semibold">
          Sign in here
        </Link>
      </p>
    </div>
  );
}
