import Link from 'next/link';
import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto space-y-6 pt-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-black text-white tracking-tight">Sign In to LabLink</h1>
        <p className="text-zinc-400 text-xs">
          Access specialized research equipment booking and review queues.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8">
        <LoginForm />
      </div>

      <p className="text-center text-xs text-zinc-500">
        New student on campus?{' '}
        <Link href="/register" className="text-yellow-400 hover:underline font-semibold">
          Register an account
        </Link>
      </p>
    </div>
  );
}
