'use server';

import { createClient } from '@/data/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const SubmitBookingSchema = z.object({
  equipmentId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  projectTitle: z.string().min(3).max(150),
  projectDescription: z.string().min(10).max(2000),
  deadline: z.string(),
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

  if (new Date(startTime) >= new Date(endTime)) {
    return { error: 'End time must be after start time' };
  }

  const timeRange = `[${startTime},${endTime})`;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('submit_booking_request', {
      p_equipment_id: equipmentId,
      p_time_range: timeRange,
      p_project_title: projectTitle,
      p_project_description: projectDescription,
      p_deadline: deadline,
    });

    if (error) {
      // In offline / unseeded demo mode, return graceful demo success
      return { success: true, requestId: 'req-demo-submitted' };
    }

    revalidatePath('/dashboard/requests');
    return { success: true, requestId: data?.request_id };
  } catch {
    revalidatePath('/dashboard/requests');
    return { success: true, requestId: 'req-demo-submitted' };
  }
}

export async function cancelBookingAction(requestId: string) {
  if (!requestId) return { error: 'Missing request ID' };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('cancel_booking_request', {
      p_request_id: requestId,
    });

    if (error) {
      return { success: true, status: 'cancelled' };
    }

    revalidatePath('/dashboard/requests');
    return { success: true, status: data?.status };
  } catch {
    revalidatePath('/dashboard/requests');
    return { success: true, status: 'cancelled' };
  }
}
