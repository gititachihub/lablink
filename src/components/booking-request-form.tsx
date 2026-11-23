'use client';

import { useActionState } from 'react';
import { submitBookingAction } from '@/actions/booking.actions';
import { Button } from '@/components/ui/button';
import type { Equipment } from '@/domain/types';

export function BookingRequestForm({
  equipmentList,
  preselectedEquipmentId,
}: {
  equipmentList: Equipment[];
  preselectedEquipmentId?: string;
}) {
  const [state, formAction, isPending] = useActionState(submitBookingAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div role="alert" className="p-3 rounded-lg bg-[#2D1111] border border-[#F87171]/40 text-[#F87171] text-xs font-semibold">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div role="status" className="p-3 rounded-lg bg-[#0E2916] border border-[#4ADE80]/40 text-[#4ADE80] text-xs font-semibold">
          ✓ Booking request submitted successfully! Awaiting faculty review in queue.
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="equipmentId" className="block text-xs font-semibold text-[#F5F5F5]">
          Selected Research Instrument
        </label>
        <select
          id="equipmentId"
          name="equipmentId"
          required
          defaultValue={preselectedEquipmentId || ''}
          className="w-full bg-[#050505] border border-[#26262B] rounded-lg px-3.5 py-2 text-sm text-[#F5F5F5] focus:border-[#FFD60A] focus:outline-none"
        >
          <option value="" disabled>Choose equipment...</option>
          {equipmentList.map((eq) => (
            <option key={eq.id} value={eq.id}>{eq.name} ({eq.category})</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="startTime" className="block text-xs font-semibold text-[#F5F5F5]">
            Slot Start — Campus time (IST)
          </label>
          <input
            id="startTime"
            name="startTime"
            type="datetime-local"
            required
            className="w-full bg-[#050505] border border-[#26262B] rounded-lg px-3.5 py-2 text-sm text-[#F5F5F5] focus:border-[#FFD60A] focus:outline-none"
            onChange={(e) => {
              const date = new Date(e.target.value);
              if (!isNaN(date.getTime())) {
                const hidden = document.getElementById('startTimeHidden') as HTMLInputElement;
                if (hidden) hidden.value = date.toISOString();
              }
            }}
          />
          <input type="hidden" id="startTimeHidden" name="startTime" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="endTime" className="block text-xs font-semibold text-[#F5F5F5]">
            Slot End — Campus time (IST)
          </label>
          <input
            id="endTime"
            name="endTime"
            type="datetime-local"
            required
            className="w-full bg-[#050505] border border-[#26262B] rounded-lg px-3.5 py-2 text-sm text-[#F5F5F5] focus:border-[#FFD60A] focus:outline-none"
            onChange={(e) => {
              const date = new Date(e.target.value);
              if (!isNaN(date.getTime())) {
                const hidden = document.getElementById('endTimeHidden') as HTMLInputElement;
                if (hidden) hidden.value = date.toISOString();
              }
            }}
          />
          <input type="hidden" id="endTimeHidden" name="endTime" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="projectTitle" className="block text-xs font-semibold text-[#F5F5F5]">
          Experiment / Research Project Title
        </label>
        <input
          id="projectTitle"
          name="projectTitle"
          type="text"
          required
          placeholder="e.g. Thin-film Epitaxial Layer XRD Analysis"
          className="w-full bg-[#050505] border border-[#26262B] rounded-lg px-3.5 py-2 text-sm text-[#F5F5F5] placeholder-[#71717A] focus:border-[#FFD60A] focus:outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="projectDescription" className="block text-xs font-semibold text-[#F5F5F5]">
          Project Objectives & Method Description
        </label>
        <textarea
          id="projectDescription"
          name="projectDescription"
          required
          rows={3}
          placeholder="Detail research scope, sample status, and justification..."
          className="w-full bg-[#050505] border border-[#26262B] rounded-lg px-3.5 py-2 text-sm text-[#F5F5F5] placeholder-[#71717A] focus:border-[#FFD60A] focus:outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="deadline" className="block text-xs font-semibold text-[#F5F5F5]">
          Project Hard Deadline
        </label>
        <input
          id="deadline"
          name="deadline"
          type="date"
          required
          className="w-full bg-[#050505] border border-[#26262B] rounded-lg px-3.5 py-2 text-sm text-[#F5F5F5] focus:border-[#FFD60A] focus:outline-none"
          onChange={(e) => {
            const date = new Date(e.target.value);
            if (!isNaN(date.getTime())) {
              const hidden = document.getElementById('deadlineHidden') as HTMLInputElement;
              if (hidden) hidden.value = date.toISOString();
            }
          }}
        />
        <input type="hidden" id="deadlineHidden" name="deadline" />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[#26262B]">
        <span className="text-xs text-[#A1A1AA]">Max 3 active pending requests per student.</span>
        <Button type="submit" variant="primary" size="md" disabled={isPending}>
          {isPending ? 'Submitting...' : 'Submit Request'}
        </Button>
      </div>
    </form>
  );
}
