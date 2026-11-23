'use client';

import { useState, useTransition } from 'react';
import { reviewBookingAction } from '@/actions/approval.actions';
import { Button } from '@/components/ui/button';

export function FacultyReviewActions({
  requestId,
  isWinner,
}: {
  requestId: string;
  isWinner: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string; alternatives?: boolean } | null>(null);

  const handleAction = (action: 'approved' | 'rejected') => {
    startTransition(async () => {
      const res = await reviewBookingAction(requestId, action, rejectNote || undefined);
      if (res?.error === 'slot_conflict') {
        setFeedback({
          success: false,
          message: 'Slot no longer available: Confirmed for another approved booking.',
          alternatives: true,
        });
      } else if (res?.error) {
        setFeedback({ success: false, message: res.error });
      } else {
        setFeedback({
          success: true,
          message: `Request successfully ${action}! Audit trail updated.`,
        });
      }
    });
  };

  return (
    <div className="space-y-3 pt-3 border-t border-[#26262B]">
      {feedback && (
        <div
          role="status"
          className={`p-3 rounded-lg text-xs font-semibold ${
            feedback.success
              ? 'bg-[#0E2916] text-[#4ADE80] border border-[#4ADE80]/40'
              : 'bg-[#2D1111] text-[#F87171] border border-[#F87171]/40'
          }`}
        >
          <p>{feedback.message}</p>
          {feedback.alternatives && (
            <p className="mt-1 text-[11px] text-[#FFD60A]">
              Suggested action: Review earliest free alternative slots below.
            </p>
          )}
        </div>
      )}

      {showRejectInput && (
        <div className="space-y-1.5">
          <label htmlFor={`reject-note-${requestId}`} className="block text-[11px] font-semibold text-[#A1A1AA]">
            Rejection Reason / Guidance for Student
          </label>
          <input
            id={`reject-note-${requestId}`}
            type="text"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="e.g. Please re-apply for next Thursday window..."
            className="w-full bg-[#050505] border border-[#26262B] rounded-lg px-3 py-1.5 text-xs text-[#F5F5F5] placeholder-[#71717A] focus:border-[#FFD60A] focus:outline-none"
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant={isWinner ? 'primary' : 'secondary'}
          size="sm"
          disabled={isPending}
          onClick={() => handleAction('approved')}
          className="flex-1"
        >
          {isPending ? 'Processing...' : isWinner ? '★ Approve Winner' : 'Approve'}
        </Button>

        {showRejectInput ? (
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={isPending}
            onClick={() => handleAction('rejected')}
          >
            Confirm Reject
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowRejectInput(true)}
          >
            Reject with Note
          </Button>
        )}
      </div>
    </div>
  );
}
