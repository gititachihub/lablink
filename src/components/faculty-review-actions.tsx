'use client';

import { useState, useTransition } from 'react';
import { reviewBookingAction } from '@/actions/approval.actions';

export function FacultyReviewActions({
  requestId,
  isWinner,
}: {
  requestId: string;
  isWinner: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleAction = (action: 'approved' | 'rejected') => {
    startTransition(async () => {
      const res = await reviewBookingAction(requestId, action);
      if (res?.error === 'slot_conflict') {
        setFeedback({
          success: false,
          message: 'Conflict: Slot was already confirmed for another request. Alternatives suggested below.',
        });
      } else if (res?.error) {
        setFeedback({ success: false, message: res.error });
      } else {
        setFeedback({ success: true, message: `Request successfully ${action}!` });
      }
    });
  };

  return (
    <div className="space-y-2">
      {feedback && (
        <div
          role="status"
          className={`p-2 rounded text-xs font-semibold ${
            feedback.success
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              : 'bg-rose-950 text-rose-300 border border-rose-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleAction('approved')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${
            isWinner
              ? 'bg-yellow-400 hover:bg-yellow-300 text-black shadow-sm ring-1 ring-yellow-400'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
          }`}
        >
          {isPending ? 'Processing...' : 'Approve'}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleAction('rejected')}
          className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-rose-950 hover:text-rose-400 text-zinc-400 border border-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
