'use client';

import { useActionState } from 'react';
import { signUpAction } from '@/actions/auth.actions';
import type { DepartmentRow } from '@/queries/equipment.queries';

export function RegisterForm({ departments }: { departments: DepartmentRow[] }) {
  const [state, formAction, isPending] = useActionState(signUpAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div role="alert" className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-medium">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="fullName" className="block text-xs font-semibold text-zinc-300 mb-1">
          Full Name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          placeholder="e.g. Arjun Patel"
          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus-visible:border-yellow-400"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-xs font-semibold text-zinc-300 mb-1">
          Campus Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="student@campus.edu"
          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus-visible:border-yellow-400"
        />
      </div>

      <div>
        <label htmlFor="departmentId" className="block text-xs font-semibold text-zinc-300 mb-1">
          Primary Department
        </label>
        <select
          id="departmentId"
          name="departmentId"
          required
          defaultValue=""
          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2 text-sm text-white focus-visible:border-yellow-400"
        >
          <option value="" disabled>Select your department...</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name} ({d.building})</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="studentId" className="block text-xs font-semibold text-zinc-300 mb-1">
          Student ID (Optional)
        </label>
        <input
          id="studentId"
          name="studentId"
          type="text"
          placeholder="e.g. PH-2024-042"
          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus-visible:border-yellow-400"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-xs font-semibold text-zinc-300 mb-1">
          Password (min 6 characters)
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          placeholder="••••••••"
          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus-visible:border-yellow-400"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50"
      >
        {isPending ? 'Registering...' : 'Create Account'}
      </button>
    </form>
  );
}
