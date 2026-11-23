'use client';

import { useActionState } from 'react';
import { submitBookingAction } from '@/actions/booking.actions';
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
        <div role="alert" className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-medium">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div role="status" className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-medium">
          ✓ Booking request submitted successfully! Pending faculty review.
        </div>
      )}

      <div>
        <label htmlFor="equipmentId" className="block text-xs font-semibold text-zinc-300 mb-1">
          Select Equipment
        </label>
        <select
          id="equipmentId"
          name="equipmentId"
          required
          defaultValue={preselectedEquipmentId || ''}
          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2 text-sm text-white focus-visible:border-yellow-400"
        >
          <option value="" disabled>Choose equipment...</option>
          {equipmentList.map((eq) => (
            <option key={eq.id} value={eq.id}>{eq.name} ({eq.category})</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="startTime" className="block text-xs font-semibold text-zinc-300 mb-1">
            Slot Start Time (UTC / ISO)
          </label>
          <input
            id="startTime"
            name="startTime"
            type="datetime-local"
            required
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2 text-sm text-white focus-visible:border-yellow-400"
            onChange={(e) => {
              // Convert local input to ISO
              const date = new Date(e.target.value);
              if (!isNaN(date.getTime())) {
                const hiddenInput = document.getElementById('startTimeHidden') as HTMLInputElement;
                if (hiddenInput) hiddenInput.value = date.toISOString();
              }
            }}
          />
          <input type="hidden" id="startTimeHidden" name="startTime" />
        </div>

        <div>
          <label htmlFor="endTime" className="block text-xs font-semibold text-zinc-300 mb-1">
            Slot End Time (UTC / ISO)
          </label>
          <input
            id="endTime"
            name="endTime"
            type="datetime-local"
            required
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2 text-sm text-white focus-visible:border-yellow-400"
            onChange={(e) => {
              const date = new Date(e.target.value);
              if (!isNaN(date.getTime())) {
                const hiddenInput = document.getElementById('endTimeHidden') as HTMLInputElement;
                if (hiddenInput) hiddenInput.value = date.toISOString();
              }
            }}
          />
          <input type="hidden" id="endTimeHidden" name="endTime" />
        </div>
      </div>

      <div>
        <label htmlFor="projectTitle" className="block text-xs font-semibold text-zinc-300 mb-1">
          Project / Experiment Title
        </label>
        <input
          id="projectTitle"
          name="projectTitle"
          type="text"
          required
          placeholder="e.g. Thin-film Epitaxial Layer XRD Analysis"
          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus-visible:border-yellow-400"
        />
      </div>

      <div>
        <label htmlFor="projectDescription" className="block text-xs font-semibold text-zinc-300 mb-1">
          Experiment Description & Objectives
        </label>
        <textarea
          id="projectDescription"
          name="projectDescription"
          required
          rows={3}
          placeholder="Describe your research objective and sample preparation status..."
          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus-visible:border-yellow-400"
        />
      </div>

      <div>
        <label htmlFor="deadline" className="block text-xs font-semibold text-zinc-300 mb-1">
          Project Deadline
        </label>
        <input
          id="deadline"
          name="deadline"
          type="date"
          required
          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2 text-sm text-white focus-visible:border-yellow-400"
          onChange={(e) => {
            const date = new Date(e.target.value);
            if (!isNaN(date.getTime())) {
              const hiddenInput = document.getElementById('deadlineHidden') as HTMLInputElement;
              if (hiddenInput) hiddenInput.value = date.toISOString();
            }
          }}
        />
        <input type="hidden" id="deadlineHidden" name="deadline" />
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-zinc-500">Max 3 active pending requests per student.</span>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
        >
          {isPending ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
    </form>
  );
}
