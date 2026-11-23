'use server';

import { createClient } from '@/data/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const SubmitBookingSchema = z.object({
  equipmentId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  projectTitle: z.string().min(3).max(150),
  projectDescription: z.string().min(10).max(2000),
  deadline: z.string().datetime(),
});

export async function submitBookingAction(_prevState: unknown, formData: FormData) {
  const parsed = SubmitBookingSchema.safeParse({
    equipmentId: formData.get('equipmentId'),
    startTime: formData.get('startTime'),
    endTime: formData.get('endTime'),
    projectTitle: formData.get('projectTitle'),
    projectDescription: formData.get('projectDescription'),
    deadline: formData.get('deadline'),
  });

  if (!parsed.success) {
    return { error: 'Invalid form inputs: ' + parsed.error.issues.map((i) => i.message).join(', ') };
  }

  const { equipmentId, startTime, endTime, projectTitle, projectDescription, deadline } = parsed.data;

  // Validate start < end
  if (new Date(startTime) >= new Date(endTime)) {
    return { error: 'End time must be after start time' };
  }

  const timeRange = `[${startTime},${endTime})`;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('submit_booking_request', {
    p_equipment_id: equipmentId,
    p_time_range: timeRange,
    p_project_title: projectTitle,
    p_project_description: projectDescription,
    p_deadline: deadline,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/bookings');
  return { success: true, requestId: data?.request_id };
}

export async function cancelBookingAction(requestId: string) {
  if (!requestId) return { error: 'Missing request ID' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('cancel_booking_request', {
    p_request_id: requestId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/bookings');
  return { success: true, status: data?.status };
}
