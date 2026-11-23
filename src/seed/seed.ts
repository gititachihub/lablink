import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { DEPARTMENTS, EQUIPMENT, DEMO_USERS, DEMO_PASSWORD } from './data';

function loadEnv(): { url: string; key: string } {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found. Cannot run local seed without SUPABASE_SERVICE_ROLE_KEY.');
  }
  const content = fs.readFileSync(envPath, 'utf8');
  let url = '';
  let key = '';
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      url = trimmed.split('=')[1].trim().replace(/^["']|["']$/g, '');
    }
    if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      key = trimmed.split('=')[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  }
  return { url, key };
}

function getNextTuesdaySlot(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getUTCDay();
  // Tuesday is day 2
  let daysUntilTuesday = (2 - day + 7) % 7;
  if (daysUntilTuesday === 0) daysUntilTuesday = 7;
  const tuesday = new Date(now.getTime() + daysUntilTuesday * 24 * 60 * 60 * 1000);
  // 14:00 to 17:00 IST = 08:30 to 11:30 UTC
  const start = new Date(Date.UTC(tuesday.getUTCFullYear(), tuesday.getUTCMonth(), tuesday.getUTCDate(), 8, 30, 0));
  const end = new Date(Date.UTC(tuesday.getUTCFullYear(), tuesday.getUTCMonth(), tuesday.getUTCDate(), 11, 30, 0));
  return { start, end };
}

async function runSeed() {
  const { url, key } = loadEnv();
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  console.log('Seeding LabLink database...');

  // 1. Departments
  const deptMap = new Map<string, string>();
  for (const dept of DEPARTMENTS) {
    const { data, error } = await supabase.from('departments').upsert(
      { name: dept.name, building: dept.building, floor: dept.floor, contact_email: dept.contactEmail },
      { onConflict: 'name' }
    ).select('id, name').single();
    if (error) throw error;
    deptMap.set(data.name, data.id);
  }
  console.log(`Departments seeded (${deptMap.size})`);

  // 2. Equipment
  const equipMap = new Map<string, string>();
  for (const eq of EQUIPMENT) {
    const deptId = deptMap.get(eq.departmentName)!;
    const { data: existing } = await supabase.from('equipment').select('id').eq('name', eq.name).single();
    if (existing) {
      equipMap.set(eq.name, existing.id);
    } else {
      const { data, error } = await supabase.from('equipment').insert({
        name: eq.name,
        department_id: deptId,
        category: eq.category,
        description: eq.description,
        specifications: eq.specifications,
        is_operational: eq.isOperational,
        requires_training: eq.requiresTraining,
        max_booking_hours: eq.maxBookingHours,
        lab_open: eq.labOpen,
        lab_close: eq.labClose,
      }).select('id').single();
      if (error) throw error;
      equipMap.set(eq.name, data.id);
    }
  }
  console.log(`Equipment seeded (${equipMap.size})`);

  // 3. Demo Users
  const userMap = new Map<string, string>();
  for (const u of DEMO_USERS) {
    const deptId = deptMap.get(u.departmentName)!;
    const { data: list } = await supabase.auth.admin.listUsers();
    let uid = list?.users.find((x) => x.email === u.email)?.id;
    if (!uid) {
      const { data: created, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: u.name, department_id: deptId, student_id: u.studentId },
      });
      if (error) throw error;
      uid = created.user.id;
    }
    await supabase.from('profiles').update({
      full_name: u.name,
      role: u.role,
      department_id: deptId,
      student_id: u.studentId || null,
    }).eq('id', uid);
    userMap.set(u.email, uid);
  }
  console.log(`Demo users seeded (${userMap.size})`);

  // 4. Qualifications
  const arjunId = userMap.get('student1@lablink.demo')!;
  const meeraId = userMap.get('student2@lablink.demo')!;
  for (const uid of [arjunId, meeraId]) {
    await supabase.from('user_qualifications').delete().eq('user_id', uid);
    await supabase.from('user_qualifications').insert({
      user_id: uid,
      qualification_type: 'training',
      qualification_name: 'XRD Operation & Radiation Safety',
      verified_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    });
  }

  // 5. Pitch Scenario: Competing Requests
  const xrdId = equipMap.get('X-Ray Diffractometer')!;
  const slot = getNextTuesdaySlot();
  const timeRangeStr = `[${slot.start.toISOString()},${slot.end.toISOString()})`;

  // Past bookings for fairness scores (Arjun 2h, Meera 12h)
  const pastSlot1 = `[${new Date(Date.now() - 5 * 86400000).toISOString()},${new Date(Date.now() - 5 * 86400000 + 2 * 3600000).toISOString()})`;
  const { data: dummyReq1 } = await supabase.from('booking_requests').insert({
    student_id: arjunId, equipment_id: xrdId, time_range: pastSlot1,
    project_title: 'Prior Calibration Run', project_description: 'Instrument calibration baseline',
    deadline: new Date(Date.now() + 86400000).toISOString(), status: 'approved',
  }).select('id').single();
  if (dummyReq1) {
    await supabase.from('bookings').upsert({
      request_id: dummyReq1.id, student_id: arjunId, equipment_id: xrdId, time_range: pastSlot1,
    }, { onConflict: 'request_id' });
  }

  // Arjun's request (submitted 3d ago, deadline 2d ahead)
  await supabase.from('booking_requests').insert({
    student_id: arjunId, equipment_id: xrdId, time_range: timeRangeStr,
    project_title: 'Thin-film Epitaxial Layer XRD Analysis',
    project_description: 'Characterizing interfacial strain and lattice parameters of pulsed laser deposited perovskite oxide thin films.',
    deadline: new Date(Date.now() + 2 * 86400000).toISOString(), status: 'pending',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  });

  // Meera's request (submitted 1d ago, deadline 10d ahead)
  await supabase.from('booking_requests').insert({
    student_id: meeraId, equipment_id: xrdId, time_range: timeRangeStr,
    project_title: 'Polycrystalline Alloy Phase Identification',
    project_description: 'Phase identification and Rietveld refinement on synthesized titanium-aluminum alloy ingots.',
    deadline: new Date(Date.now() + 10 * 86400000).toISOString(), status: 'pending',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  });

  console.log('Pitch scenario seeded: Arjun Patel vs Meera Nair on X-Ray Diffractometer for next Tuesday!');
}

runSeed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
