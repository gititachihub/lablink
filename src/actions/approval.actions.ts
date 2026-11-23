'use server';

import { createClient } from '@/data/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const ReviewRequestSchema = z.object({
  requestId: z.string(),
  action: z.enum(['approved', 'rejected']),
  note: z.string().max(1000).optional(),
});

export async function reviewBookingAction(requestId: string, action: 'approved' | 'rejected', note?: string) {
  const parsed = ReviewRequestSchema.safeParse({ requestId, action, note });
  if (!parsed.success) {
    return { error: 'Invalid review parameters' };
  }

  // Handle mock / pitch demo requests gracefully
  if (requestId.startsWith('req-')) {
    if (action === 'approved' && requestId === 'req-meera-pitch-02') {
      return {
        error: 'slot_conflict',
        message: 'This slot was just booked by another approved request (Arjun Patel). Alternatives are available.',
      };
    }
    revalidatePath('/dashboard/queue');
    return { success: true, status: action };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('review_booking_request', {
      p_request_id: parsed.data.requestId,
      p_action: parsed.data.action,
      p_note: parsed.data.note ?? null,
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/dashboard/queue');
    return data;
  } catch (err: unknown) {
    return { error: (err as Error).message || 'Database error occurred' };
  }
}
