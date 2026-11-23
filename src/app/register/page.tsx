import Link from 'next/link';
import { getDepartments } from '@/queries/equipment.queries';
import { RegisterForm } from '@/components/register-form';

export default async function RegisterPage() {
  const departments = await getDepartments();

  return (
    <div className="max-w-md mx-auto space-y-6 pt-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-black text-white tracking-tight">Create Student Account</h1>
        <p className="text-zinc-400 text-xs">
          Join your academic department to access cross-campus laboratory instruments.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8">
        <RegisterForm departments={departments} />
      </div>

      <p className="text-center text-xs text-zinc-500">
        Already registered?{' '}
        <Link href="/login" className="text-yellow-400 hover:underline font-semibold">
          Sign in here
        </Link>
      </p>
    </div>
  );
}
