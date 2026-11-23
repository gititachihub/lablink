import { createClient } from '@/data/supabase/server';
import type { Equipment } from '@/domain/types';

export interface DepartmentRow {
  id: string;
  name: string;
  building: string;
  floor: number | null;
  contact_email: string;
}

export async function getDepartments(): Promise<DepartmentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('departments')
    .select('id, name, building, floor, contact_email')
    .order('name', { ascending: true });

  if (error) {
    console.error('getDepartments error:', error.message);
    return [];
  }
  return data ?? [];
}

export async function getEquipmentList(filters?: {
  query?: string;
  departmentId?: string;
  category?: string;
}): Promise<Equipment[]> {
  const supabase = await createClient();
  let q = supabase
    .from('equipment')
    .select('*, departments(name)')
    .order('name', { ascending: true });

  if (filters?.departmentId) {
    q = q.eq('department_id', filters.departmentId);
  }
  if (filters?.category) {
    q = q.eq('category', filters.category);
  }
  if (filters?.query) {
    q = q.ilike('name', `%${filters.query}%`);
  }

  const { data, error } = await q;
  if (error) {
    console.error('getEquipmentList error:', error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    departmentId: row.department_id,
    category: row.category,
    specifications: row.specifications ?? {},
    isOperational: row.is_operational,
    requiresTraining: row.requires_training,
    maxBookingHours: row.max_booking_hours,
    labOpen: row.lab_open,
    labClose: row.lab_close,
    imageUrl: row.image_url,
  }));
}

export async function getEquipmentById(id: string): Promise<Equipment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    description: data.description ?? '',
    departmentId: data.department_id,
    category: data.category,
    specifications: data.specifications ?? {},
    isOperational: data.is_operational,
    requiresTraining: data.requires_training,
    maxBookingHours: data.max_booking_hours,
    labOpen: data.lab_open,
    labClose: data.lab_close,
    imageUrl: data.image_url,
  };
}

export async function getEquipmentBusyRanges(
  equipmentId: string,
  fromIso: string,
  toIso: string
): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_equipment_busy_ranges', {
    p_equipment_id: equipmentId,
    p_from: fromIso,
    p_to: toIso,
  });

  if (error) {
    console.error('getEquipmentBusyRanges error:', error.message);
    return [];
  }

  return (data ?? []).map((r: { busy_range: string }) => r.busy_range);
}
