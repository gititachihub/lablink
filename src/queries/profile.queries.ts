import { createClient } from '@/data/supabase/server';
import type { UserQualification, Role } from '@/domain/types';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  departmentId: string;
  studentId?: string;
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, department_id, student_id')
    .eq('id', user.id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    role: data.role as Role,
    departmentId: data.department_id,
    studentId: data.student_id ?? undefined,
  };
}

export async function getUserQualifications(userId: string): Promise<UserQualification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_qualifications')
    .select('id, user_id, qualification_type, qualification_name, verified_at, expires_at')
    .eq('user_id', userId);

  if (error || !data) return [];

  return data.map((q) => ({
    id: q.id,
    userId: q.user_id,
    qualificationType: q.qualification_type as 'training' | 'certification' | 'department_membership',
    qualificationName: q.qualification_name,
    verifiedAt: new Date(q.verified_at),
    expiresAt: q.expires_at ? new Date(q.expires_at) : null,
  }));
}
