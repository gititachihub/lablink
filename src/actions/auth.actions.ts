'use server';

import { createClient } from '@/data/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { DEMO_USERS, DEMO_PASSWORD } from '@/seed/data';

const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2).max(100),
  departmentId: z.string(),
  studentId: z.string().optional(),
});

export async function signInAction(_prevState: unknown, formData: FormData) {
  const parsed = SignInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: 'Invalid email or password format' };
  }

  const { email, password } = parsed.data;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (!error) {
      const { data: profile } = await supabase.from('profiles').select('role').single();
      if (profile?.role === 'faculty') redirect('/dashboard/queue');
      redirect('/dashboard');
    }
  } catch {
    // Check demo fallback
  }

  // Demo Fallback Authentication
  const demoMatch = DEMO_USERS.find((u) => u.email === email);
  if (demoMatch && password === DEMO_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set('lablink-demo-session', JSON.stringify({
      id: `demo-${demoMatch.role}-${demoMatch.email}`,
      email: demoMatch.email,
      fullName: demoMatch.name,
      role: demoMatch.role,
      departmentId: '11111111-1111-4111-8111-111111111111',
      studentId: demoMatch.studentId,
    }), { path: '/', httpOnly: true, maxAge: 86400 });

    if (demoMatch.role === 'faculty') {
      redirect('/dashboard/queue');
    }
    redirect('/dashboard');
  }

  return { error: 'Invalid credentials. Use 1-Click Demo Accounts below or register.' };
}

export async function signUpAction(_prevState: unknown, formData: FormData) {
  const parsed = SignUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName'),
    departmentId: formData.get('departmentId'),
    studentId: formData.get('studentId') || undefined,
  });

  if (!parsed.success) {
    return { error: 'Please check your inputs and try again' };
  }

  try {
    const supabase = await createClient();
    await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          full_name: parsed.data.fullName,
          department_id: parsed.data.departmentId,
          student_id: parsed.data.studentId,
        },
      },
    });
  } catch {
    // Demo cookie fallback
  }

  const cookieStore = await cookies();
  cookieStore.set('lablink-demo-session', JSON.stringify({
    id: `demo-student-${parsed.data.email}`,
    email: parsed.data.email,
    fullName: parsed.data.fullName,
    role: 'student',
    departmentId: parsed.data.departmentId,
    studentId: parsed.data.studentId,
  }), { path: '/', httpOnly: true, maxAge: 86400 });

  redirect('/dashboard');
}

export async function signOutAction() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore
  }
  const cookieStore = await cookies();
  cookieStore.delete('lablink-demo-session');
  redirect('/login');
}
