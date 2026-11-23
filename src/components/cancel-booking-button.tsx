'use client';

import { useTransition } from 'react';
import { cancelBookingAction } from '@/actions/booking.actions';

export function CancelBookingButton({ requestId }: { requestId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm('Are you sure you want to cancel this request?')) {
          startTransition(async () => {
            await cancelBookingAction(requestId);
          });
        }
      }}
      className="px-2.5 py-1 text-xs rounded bg-zinc-800 hover:bg-rose-950 hover:text-rose-400 text-zinc-400 border border-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
    >
      {isPending ? 'Cancelling...' : 'Cancel'}
    </button>
  );
}
