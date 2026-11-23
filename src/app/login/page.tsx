import Link from 'next/link';
import { LoginForm } from '@/components/login-form';
import { Card } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto space-y-6 pt-6">
      <div className="text-center space-y-1.5">
        <h1 className="text-2xl font-black text-[#F5F5F5] tracking-tight">Sign In to LabLink</h1>
        <p className="text-[#A1A1AA] text-xs">
          Access research equipment booking and department allocation queues.
        </p>
      </div>

      <Card>
        <LoginForm />
      </Card>

      <p className="text-center text-xs text-[#A1A1AA]">
        New student on campus?{' '}
        <Link href="/register" className="text-[#FFD60A] hover:underline font-semibold">
          Register student account
        </Link>
      </p>
    </div>
  );
}
