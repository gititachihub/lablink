import { createClient } from '@/data/supabase/server';
import { rankCompetingRequests, type RankCompetingResult } from '@/domain/allocation/ranking';
import type { AllocationContext, BookingRequest, Equipment } from '@/domain/types';
import { SCORING_WEIGHTS, MAX_HOURS_PER_STUDENT_PER_MONTH, CAMPUS_TIMEZONE } from '@/lib/constants';

function parseTstzRange(rangeStr: string): { start: Date; end: Date } {
  const cleaned = rangeStr.replace(/[\[\)\(\]]/g, '');
  const [startStr, endStr] = cleaned.split(',');
  return {
    start: new Date(startStr.trim()),
    end: new Date(endStr.trim()),
  };
}

export async function getMyBookingRequests() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('booking_requests')
    .select('*, equipment(name, category)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getMyBookingRequests error:', error.message);
    return [];
  }
  return data ?? [];
}

export async function getMyBookings() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select('*, equipment(name, category)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getMyBookings error:', error.message);
    return [];
  }
  return data ?? [];
}

export interface FacultyQueueItem {
  equipment: Equipment;
  rankedResult: RankCompetingResult;
  rawRequests: Array<{
    id: string;
    student_id: string;
    equipment_id: string;
    time_range: string;
    project_title: string;
    project_description: string;
    deadline: string;
    deadline_verified: boolean;
    status: string;
    profiles?: { full_name: string; email: string; student_id?: string } | null;
  }>;
}

export async function getFacultyQueue(facultyDeptId?: string): Promise<FacultyQueueItem[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('booking_requests')
    .select('*, equipment(*), profiles!booking_requests_student_id_fkey(full_name, email, student_id)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (facultyDeptId) {
    query = query.eq('equipment.department_id', facultyDeptId);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    return [];
  }

  // Fetch past bookings for fairness hours
  const { data: allBookings } = await supabase.from('bookings').select('id, student_id, equipment_id, time_range, request_id, created_at');
  const pastHoursMap = new Map<string, number>();

  if (allBookings) {
    for (const b of allBookings) {
      const bounds = parseTstzRange(b.time_range);
      const hours = Math.max(0, (bounds.end.getTime() - bounds.start.getTime()) / 3600000);
      pastHoursMap.set(b.student_id, (pastHoursMap.get(b.student_id) || 0) + hours);
    }
  }

  // Group requests by equipment_id
  const byEquipment = new Map<string, typeof data>();
  for (const row of data) {
    const list = byEquipment.get(row.equipment_id) || [];
    list.push(row);
    byEquipment.set(row.equipment_id, list);
  }

  const ctx: AllocationContext = {
    now: new Date(),
    maxHoursPerStudent: MAX_HOURS_PER_STUDENT_PER_MONTH,
    weights: SCORING_WEIGHTS,
    campusTimezone: CAMPUS_TIMEZONE,
  };

  const results: FacultyQueueItem[] = [];

  for (const [, rows] of byEquipment.entries()) {
    const firstEq = rows[0].equipment;
    const equipment: Equipment = {
      id: firstEq.id,
      name: firstEq.name,
      description: firstEq.description ?? '',
      departmentId: firstEq.department_id,
      category: firstEq.category,
      specifications: firstEq.specifications ?? {},
      isOperational: firstEq.is_operational,
      requiresTraining: firstEq.requires_training,
      maxBookingHours: firstEq.max_booking_hours,
      labOpen: firstEq.lab_open,
      labClose: firstEq.lab_close,
    };

    const domainRequests: BookingRequest[] = rows.map((r) => {
      const bounds = parseTstzRange(r.time_range);
      return {
        id: r.id,
        studentId: r.student_id,
        equipmentId: r.equipment_id,
        timeRange: { start: bounds.start, end: bounds.end },
        projectTitle: r.project_title,
        projectDescription: r.project_description,
        deadline: new Date(r.deadline),
        deadlineVerified: r.deadline_verified,
        status: r.status,
        createdAt: new Date(r.created_at),
      };
    });

    const rankedResult = rankCompetingRequests({
      requests: domainRequests,
      equipment,
      qualificationsByStudent: new Map(),
      existingBookings: (allBookings ?? []).map((b) => {
        const bounds = parseTstzRange(b.time_range);
        return {
          id: b.id,
          requestId: b.request_id,
          studentId: b.student_id,
          equipmentId: b.equipment_id,
          timeRange: { start: bounds.start, end: bounds.end },
          createdAt: new Date(b.created_at),
        };
      }),
      studentHoursMap: pastHoursMap,
      ctx,
    });

    results.push({
      equipment,
      rankedResult,
      rawRequests: rows,
    });
  }

  return results;
}
