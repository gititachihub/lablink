'use client';

import { useActionState } from 'react';
import { signUpAction } from '@/actions/auth.actions';
import { Button } from '@/components/ui/button';
import type { DepartmentRow } from '@/queries/equipment.queries';

export function RegisterForm({ departments }: { departments: DepartmentRow[] }) {
  const [state, formAction, isPending] = useActionState(signUpAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div role="alert" className="p-3 rounded-lg bg-[#2D1111] border border-[#F87171]/40 text-[#F87171] text-xs font-semibold">
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="fullName" className="block text-xs font-semibold text-[#F5F5F5]">
          Full Name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          placeholder="e.g. Arjun Patel"
          className="w-full bg-[#050505] border border-[#26262B] rounded-lg px-3.5 py-2 text-sm text-[#F5F5F5] placeholder-[#71717A] focus:border-[#FFD60A] focus:outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-xs font-semibold text-[#F5F5F5]">
          Campus Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="student@campus.edu"
          className="w-full bg-[#050505] border border-[#26262B] rounded-lg px-3.5 py-2 text-sm text-[#F5F5F5] placeholder-[#71717A] focus:border-[#FFD60A] focus:outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="departmentId" className="block text-xs font-semibold text-[#F5F5F5]">
          Academic Department
        </label>
        <select
          id="departmentId"
          name="departmentId"
          required
          defaultValue=""
          className="w-full bg-[#050505] border border-[#26262B] rounded-lg px-3.5 py-2 text-sm text-[#F5F5F5] focus:border-[#FFD60A] focus:outline-none"
        >
          <option value="" disabled>Select your department...</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.building})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="studentId" className="block text-xs font-semibold text-[#F5F5F5]">
          Student ID (Optional)
        </label>
        <input
          id="studentId"
          name="studentId"
          type="text"
          placeholder="e.g. PH-2024-042"
          className="w-full bg-[#050505] border border-[#26262B] rounded-lg px-3.5 py-2 text-sm text-[#F5F5F5] placeholder-[#71717A] focus:border-[#FFD60A] focus:outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-xs font-semibold text-[#F5F5F5]">
          Password (min 6 characters)
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          placeholder="••••••••"
          className="w-full bg-[#050505] border border-[#26262B] rounded-lg px-3.5 py-2 text-sm text-[#F5F5F5] placeholder-[#71717A] focus:border-[#FFD60A] focus:outline-none"
        />
      </div>

      <div className="pt-2">
        <Button type="submit" variant="primary" size="md" disabled={isPending} className="w-full">
          {isPending ? 'Registering...' : 'Create Student Account'}
        </Button>
      </div>
    </form>
  );
}
