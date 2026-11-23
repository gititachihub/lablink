'use client';

import { useActionState, useState } from 'react';
import { signInAction } from '@/actions/auth.actions';
import { Button } from '@/components/ui/button';

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signInAction, null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [demoOpen, setDemoOpen] = useState(true);

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('DemoPass!2026');
  };

  return (
    <div className="space-y-6">
      {state?.error && (
        <div role="alert" className="p-3 rounded-lg bg-[#2D1111] border border-[#F87171]/40 text-[#F87171] text-xs font-semibold">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-xs font-semibold text-[#F5F5F5]">
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
            className="w-full bg-[#050505] border border-[#26262B] rounded-lg px-3.5 py-2 text-sm text-[#F5F5F5] placeholder-[#71717A] focus:border-[#FFD60A] focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-xs font-semibold text-[#F5F5F5]">
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
            className="w-full bg-[#050505] border border-[#26262B] rounded-lg px-3.5 py-2 text-sm text-[#F5F5F5] placeholder-[#71717A] focus:border-[#FFD60A] focus:outline-none"
          />
        </div>

        <Button type="submit" variant="primary" size="md" disabled={isPending} className="w-full">
          {isPending ? 'Authenticating...' : 'Sign In'}
        </Button>
      </form>

      {/* Collapsible Demo Accounts Panel */}
      <div className="pt-4 border-t border-[#26262B] space-y-3">
        <button
          type="button"
          onClick={() => setDemoOpen(!demoOpen)}
          aria-expanded={demoOpen}
          className="w-full flex items-center justify-between text-xs font-semibold text-[#A1A1AA] hover:text-[#F5F5F5] cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <span>Demo Accounts (Evaluator Quick-Fill)</span>
          </span>
          <span>{demoOpen ? '▲' : '▼'}</span>
        </button>

        {demoOpen && (
          <div className="space-y-2 text-xs">
            <button
              type="button"
              onClick={() => fillDemo('student1@lablink.demo')}
              className="w-full text-left p-2.5 rounded-lg bg-[#17171A] border border-[#26262B] hover:border-[#FFD60A]/40 flex justify-between items-center transition-colors cursor-pointer"
            >
              <div>
                <span className="font-semibold text-[#F5F5F5]">Arjun Patel (Student • Physics)</span>
                <span className="text-[11px] text-[#A1A1AA] block">student1@lablink.demo</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#050505] text-[#FFD60A]">Fill</span>
            </button>

            <button
              type="button"
              onClick={() => fillDemo('student2@lablink.demo')}
              className="w-full text-left p-2.5 rounded-lg bg-[#17171A] border border-[#26262B] hover:border-[#FFD60A]/40 flex justify-between items-center transition-colors cursor-pointer"
            >
              <div>
                <span className="font-semibold text-[#F5F5F5]">Meera Nair (Student • Physics)</span>
                <span className="text-[11px] text-[#A1A1AA] block">student2@lablink.demo</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#050505] text-[#FFD60A]">Fill</span>
            </button>

            <button
              type="button"
              onClick={() => fillDemo('faculty.physics@lablink.demo')}
              className="w-full text-left p-2.5 rounded-lg bg-[#17171A] border border-[#26262B] hover:border-[#FFD60A]/40 flex justify-between items-center transition-colors cursor-pointer"
            >
              <div>
                <span className="font-semibold text-[#F5F5F5]">Dr. Priya Sharma (Faculty • Physics)</span>
                <span className="text-[11px] text-[#A1A1AA] block">faculty.physics@lablink.demo</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#050505] text-[#FFD60A]">Fill</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
