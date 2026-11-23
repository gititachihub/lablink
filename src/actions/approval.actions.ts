'use server';

import { createClient } from '@/data/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const ReviewRequestSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(['approved', 'rejected']),
  note: z.string().max(1000).optional(),
});

export async function reviewBookingAction(requestId: string, action: 'approved' | 'rejected', note?: string) {
  const parsed = ReviewRequestSchema.safeParse({ requestId, action, note });
  if (!parsed.success) {
    return { error: 'Invalid review parameters' };
  }

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
}
