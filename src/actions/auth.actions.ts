'use server';

import { createClient } from '@/data/supabase/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2).max(100),
  departmentId: z.string().uuid(),
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  // Determine role for redirect
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .single();

  if (profile?.role === 'faculty') {
    redirect('/dashboard/queue');
  }
  redirect('/dashboard/bookings');
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
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

  if (error) {
    return { error: error.message };
  }

  redirect('/dashboard/bookings');
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
