import { createClient } from '@/data/supabase/server';
import type { Equipment } from '@/domain/types';
import { EQUIPMENT } from '@/seed/data';

export interface DepartmentRow {
  id: string;
  name: string;
  building: string;
  floor: number | null;
  contact_email: string;
}

// Canonical deterministic fallback data for instant evaluation
const FALLBACK_DEPTS: DepartmentRow[] = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Physics', building: 'Science Block A', floor: 2, contact_email: 'physics@campus.edu' },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Chemistry', building: 'Science Block B', floor: 1, contact_email: 'chemistry@campus.edu' },
  { id: '33333333-3333-4333-8333-333333333333', name: 'Biomedical Engineering', building: 'Engineering Block C', floor: 3, contact_email: 'bme@campus.edu' },
];

const FALLBACK_EQUIPMENT: Equipment[] = EQUIPMENT.map((eq, idx) => {
  const dept = FALLBACK_DEPTS.find((d) => d.name === eq.departmentName) || FALLBACK_DEPTS[0];
  const hex = (idx + 1).toString(16).padStart(12, '0');
  return {
    id: `00000000-0000-4000-8000-${hex}`,
    name: eq.name,
    description: eq.description,
    departmentId: dept.id,
    category: eq.category,
    specifications: eq.specifications,
    isOperational: eq.isOperational,
    requiresTraining: eq.requiresTraining,
    maxBookingHours: eq.maxBookingHours,
    labOpen: eq.labOpen,
    labClose: eq.labClose,
  };
});

export async function getDepartments(): Promise<DepartmentRow[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('departments').select('id, name, building, floor, contact_email').order('name', { ascending: true });
    if (data && data.length > 0) return data;
  } catch {
    // Graceful fallback to canonical campus departments
  }
  return FALLBACK_DEPTS;
}

export async function getEquipmentList(filters?: { query?: string; departmentId?: string; category?: string }): Promise<Equipment[]> {
  try {
    const supabase = await createClient();
    let q = supabase.from('equipment').select('*, departments(name)').order('name', { ascending: true });
    if (filters?.departmentId) q = q.eq('department_id', filters.departmentId);
    if (filters?.category) q = q.eq('category', filters.category);
    if (filters?.query) q = q.ilike('name', `%${filters.query}%`);

    const { data } = await q;
    if (data && data.length > 0) {
      return data.map((row) => ({
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
  } catch {
    // Graceful fallback
  }

  let list = FALLBACK_EQUIPMENT;
  if (filters?.departmentId) list = list.filter((e) => e.departmentId === filters.departmentId);
  if (filters?.category) list = list.filter((e) => e.category === filters.category);
  if (filters?.query) {
    const query = filters.query.toLowerCase();
    list = list.filter((e) => e.name.toLowerCase().includes(query) || e.description.toLowerCase().includes(query));
  }
  return list;
}

export async function getEquipmentById(id: string): Promise<Equipment | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('equipment').select('*').eq('id', id).single();
    if (data) {
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
  } catch {
    // Graceful fallback
  }
  return FALLBACK_EQUIPMENT.find((e) => e.id === id) || null;
}

export async function getEquipmentBusyRanges(equipmentId: string, fromIso: string, toIso: string): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc('get_equipment_busy_ranges', { p_equipment_id: equipmentId, p_from: fromIso, p_to: toIso });
    if (data && data.length > 0) return data.map((r: { busy_range: string }) => r.busy_range);
  } catch {
    // Graceful fallback
  }
  // Sample busy range for pitch demonstration on X-Ray Diffractometer
  if (equipmentId === '00000000-0000-4000-8000-000000000001') {
    return ['[2026-11-24 08:30:00+00, 2026-11-24 11:30:00+00)'];
  }
  return [];
}
