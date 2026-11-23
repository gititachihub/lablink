'use client';

import { useActionState, useState, useTransition } from 'react';
import { submitBookingAction } from '@/actions/booking.actions';
import { parseNaturalLanguageBookingAction } from '@/actions/gemini.actions';
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
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiParsing, startAiTransition] = useTransition();

  // Controlled form state for AI prefill
  const [selectedEquipment, setSelectedEquipment] = useState(preselectedEquipmentId || (equipmentList[0]?.id ?? ''));
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [startIso, setStartIso] = useState('');
  const [endIso, setEndIso] = useState('');
  const [deadlineIso, setDeadlineIso] = useState('');
  const [aiStatus, setAiStatus] = useState<string | null>(null);

  const handleAiExtract = (promptText: string) => {
    if (!promptText.trim()) return;
    setAiStatus('Parsing with Gemini GenAI...');
    startAiTransition(async () => {
      const res = await parseNaturalLanguageBookingAction(promptText);
      if (res.equipmentId) setSelectedEquipment(res.equipmentId);
      if (res.projectTitle) setTitle(res.projectTitle);
      if (res.projectDescription) setDesc(res.projectDescription);
      if (res.startTime) setStartIso(res.startTime);
      if (res.endTime) setEndIso(res.endTime);
      if (res.deadline) setDeadlineIso(res.deadline);
      setAiStatus(`✓ Extracted via Gemini (${(res.confidence * 100).toFixed(0)}% confidence). Review before submit:`);
    });
  };

  return (
    <div className="space-y-6">
      {/* GenAI Assistant Bar */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#17171A] to-[#0F0F10] border border-[#FFD60A]/30 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#FFD60A] flex items-center gap-1.5">
            <span>✨ Gemini NL Booking Assistant</span>
          </span>
          <span className="text-[10px] text-[#A1A1AA] font-mono">Server-side untrusted prefill</span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. Need XRD next Tuesday 14:00 to 17:00 for thin-film analysis, deadline in 2 days"
            className="flex-1 bg-[#050505] border border-[#26262B] rounded-lg px-3 py-1.5 text-xs text-[#F5F5F5] placeholder-[#71717A] focus:border-[#FFD60A] focus:outline-none"
          />
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isAiParsing}
            onClick={() => handleAiExtract(aiPrompt)}
          >
            {isAiParsing ? 'Parsing...' : 'Extract'}
          </Button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#A1A1AA]">
          <span>Quick prompt:</span>
          <button
            type="button"
            onClick={() => {
              const demo = 'Need X-Ray Diffractometer next Tuesday 14:00 to 17:00 for thin-film analysis, deadline in 2 days';
              setAiPrompt(demo);
              handleAiExtract(demo);
            }}
            className="text-[#FFD60A] underline hover:text-[#ffe033] cursor-pointer"
          >
            Pitch Scenario (Arjun Patel)
          </button>
        </div>

        {aiStatus && (
          <div role="status" aria-live="polite" className="text-xs font-mono text-[#FFD60A]">
            {aiStatus}
          </div>
        )}
      </div>

      <form action={formAction} className="space-y-4">
        {state?.error && (
          <div role="alert" className="p-3 rounded-lg bg-[#2D1111] border border-[#F87171]/40 text-[#F87171] text-xs font-semibold">
            {state.error}
          </div>
        )}
        {state?.success && (
          <div role="status" className="p-3 rounded-lg bg-[#0E2916] border border-[#4ADE80]/40 text-[#4ADE80] text-xs font-semibold">
            ✓ Booking request submitted! Awaiting faculty review in queue.
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
            value={selectedEquipment}
            onChange={(e) => setSelectedEquipment(e.target.value)}
            className="w-full bg-[#050505] border border-[#26262B] rounded-lg px-3.5 py-2 text-sm text-[#F5F5F5] focus:border-[#FFD60A] focus:outline-none"
          >
            {equipmentList.map((eq) => (
              <option key={eq.id} value={eq.id}>{eq.name} ({eq.category})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="startTime" className="block text-xs font-semibold text-[#F5F5F5]">
              Slot Start (Campus IST)
            </label>
            <input
              id="startTime"
              name="startTime"
              type="text"
              required
              value={startIso}
              onChange={(e) => setStartIso(e.target.value)}
              placeholder="2026-12-01T08:30:00.000Z"
              className="w-full bg-[#050505] border border-[#26262B] rounded-lg px-3.5 py-2 text-xs font-mono text-[#F5F5F5] focus:border-[#FFD60A] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="endTime" className="block text-xs font-semibold text-[#F5F5F5]">
              Slot End (Campus IST)
            </label>
            <input
              id="endTime"
              name="endTime"
              type="text"
              required
              value={endIso}
              onChange={(e) => setEndIso(e.target.value)}
              placeholder="2026-12-01T11:30:00.000Z"
              className="w-full bg-[#050505] border border-[#26262B] rounded-lg px-3.5 py-2 text-xs font-mono text-[#F5F5F5] focus:border-[#FFD60A] focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="projectTitle" className="block text-xs font-semibold text-[#F5F5F5]">
            Project / Experiment Title
          </label>
          <input
            id="projectTitle"
            name="projectTitle"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Thin-film Epitaxial Layer XRD Analysis"
            className="w-full bg-[#050505] border border-[#26262B] rounded-lg px-3.5 py-2 text-sm text-[#F5F5F5] placeholder-[#71717A] focus:border-[#FFD60A] focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="projectDescription" className="block text-xs font-semibold text-[#F5F5F5]">
            Experiment Objectives
          </label>
          <textarea
            id="projectDescription"
            name="projectDescription"
            required
            rows={3}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
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
            type="text"
            required
            value={deadlineIso}
            onChange={(e) => setDeadlineIso(e.target.value)}
            placeholder="2026-12-03T18:00:00.000Z"
            className="w-full bg-[#050505] border border-[#26262B] rounded-lg px-3.5 py-2 text-xs font-mono text-[#F5F5F5] focus:border-[#FFD60A] focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#26262B]">
          <span className="text-xs text-[#A1A1AA]">Max 3 active pending requests per student.</span>
          <Button type="submit" variant="primary" size="md" disabled={isPending}>
            {isPending ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </div>
  );
}
