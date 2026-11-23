'use client';

import { useActionState, useState } from 'react';
import { signInAction } from '@/actions/auth.actions';

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signInAction, null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('DemoPass!2026');
  };

  return (
    <div className="space-y-6">
      {state?.error && (
        <div role="alert" className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-medium">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-zinc-300 mb-1">
            Campus Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student1@lablink.demo"
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus-visible:border-yellow-400"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-zinc-300 mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus-visible:border-yellow-400"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50"
        >
          {isPending ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>

      {/* Demo Credentials Cheat Sheet */}
      <div className="pt-6 border-t border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Demo Accounts (1-Click Fill)</span>
          <span className="text-[11px] text-zinc-500">Pass: DemoPass!2026</span>
        </div>

        <div className="space-y-2 text-xs">
          <button
            type="button"
            onClick={() => fillDemo('student1@lablink.demo')}
            className="w-full text-left p-2 rounded bg-zinc-950 border border-zinc-800 hover:border-yellow-400/50 flex justify-between items-center transition-colors cursor-pointer"
          >
            <div>
              <span className="font-semibold text-zinc-200">Arjun Patel</span>
              <span className="text-zinc-500 text-[11px] block">student1@lablink.demo (Student • Physics)</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-yellow-400">Fill</span>
          </button>

          <button
            type="button"
            onClick={() => fillDemo('student2@lablink.demo')}
            className="w-full text-left p-2 rounded bg-zinc-950 border border-zinc-800 hover:border-yellow-400/50 flex justify-between items-center transition-colors cursor-pointer"
          >
            <div>
              <span className="font-semibold text-zinc-200">Meera Nair</span>
              <span className="text-zinc-500 text-[11px] block">student2@lablink.demo (Student • Physics)</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-yellow-400">Fill</span>
          </button>

          <button
            type="button"
            onClick={() => fillDemo('faculty.physics@lablink.demo')}
            className="w-full text-left p-2 rounded bg-zinc-950 border border-zinc-800 hover:border-yellow-400/50 flex justify-between items-center transition-colors cursor-pointer"
          >
            <div>
              <span className="font-semibold text-zinc-200">Dr. Priya Sharma</span>
              <span className="text-zinc-500 text-[11px] block">faculty.physics@lablink.demo (Faculty • Physics)</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-yellow-400">Fill</span>
          </button>
        </div>
      </div>
    </div>
  );
}
