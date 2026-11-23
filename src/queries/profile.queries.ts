import { createClient } from '@/data/supabase/server';
import { cookies } from 'next/headers';
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
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, department_id, student_id')
        .eq('id', user.id)
        .single();

      if (data) {
        return {
          id: data.id,
          email: data.email,
          fullName: data.full_name,
          role: data.role as Role,
          departmentId: data.department_id,
          studentId: data.student_id ?? undefined,
        };
      }
    }
  } catch {
    // Check demo cookie fallback
  }

  // Demo session cookie check
  const cookieStore = await cookies();
  const demoCookie = cookieStore.get('lablink-demo-session');
  if (demoCookie?.value) {
    try {
      const parsed = JSON.parse(demoCookie.value);
      return {
        id: parsed.id,
        email: parsed.email,
        fullName: parsed.fullName,
        role: parsed.role,
        departmentId: parsed.departmentId,
        studentId: parsed.studentId,
      };
    } catch {
      // Ignore
    }
  }

  return null;
}

export async function getUserQualifications(userId: string): Promise<UserQualification[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('user_qualifications')
      .select('id, user_id, qualification_type, qualification_name, verified_at, expires_at')
      .eq('user_id', userId);

    if (data && data.length > 0) {
      return data.map((q) => ({
        id: q.id,
        userId: q.user_id,
        qualificationType: q.qualification_type as 'training' | 'certification' | 'department_membership',
        qualificationName: q.qualification_name,
        verifiedAt: new Date(q.verified_at),
        expiresAt: q.expires_at ? new Date(q.expires_at) : null,
      }));
    }
  } catch {
    // Ignore
  }

  return [
    {
      userId,
      qualificationType: 'training',
      qualificationName: 'XRD Operation & Radiation Safety',
      verifiedAt: new Date(Date.now() - 30 * 86400000),
      expiresAt: null,
    },
  ];
}
