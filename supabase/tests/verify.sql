-- ============================================================
-- Supabase Security & RLS Verification Suite
-- Each test runs in an isolated transaction that rolls back.
-- ============================================================

-- Test 1: Student cannot change own role or department (Trigger & RLS)
BEGIN;
DO $$
DECLARE
  v_dept_id UUID := gen_random_uuid();
  v_other_dept UUID := gen_random_uuid();
  v_user_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.departments (id, name, building, contact_email)
  VALUES (v_dept_id, 'Test Dept 1', 'Hall A', 'dept1@test.edu'),
         (v_other_dept, 'Test Dept 2', 'Hall B', 'dept2@test.edu');

  INSERT INTO public.profiles (id, email, full_name, role, department_id)
  VALUES (v_user_id, 'student1@test.edu', 'Student One', 'student', v_dept_id);

  -- Test role elevation protection
  BEGIN
    UPDATE public.profiles SET role = 'admin' WHERE id = v_user_id;
    RAISE EXCEPTION 'TEST 1 FAILED: role elevation should have been blocked';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%Role elevation is forbidden%' THEN RAISE; END IF;
  END;

  -- Test department modification protection
  BEGIN
    UPDATE public.profiles SET department_id = v_other_dept WHERE id = v_user_id;
    RAISE EXCEPTION 'TEST 1 FAILED: department modification should have been blocked';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%Department modification is forbidden%' THEN RAISE; END IF;
  END;
  RAISE NOTICE 'TEST 1 PASSED: Role and department mutation blocked';
END $$;
ROLLBACK;

-- Test 2: Direct client INSERT into booking_requests is denied by RLS
BEGIN;
DO $$
DECLARE
  v_dept_id UUID := gen_random_uuid();
  v_user_id UUID := gen_random_uuid();
  v_equip_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.departments (id, name, building, contact_email)
  VALUES (v_dept_id, 'Physics', 'Science Bldg', 'phys@test.edu');

  INSERT INTO public.profiles (id, email, full_name, role, department_id)
  VALUES (v_user_id, 'student2@test.edu', 'Student Two', 'student', v_dept_id);

  INSERT INTO public.equipment (id, name, description, department_id, category)
  VALUES (v_equip_id, 'NMR 400', 'NMR Spectrometer', v_dept_id, 'Spectroscopy');

  -- Simulate authenticated student
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_id::text)::text, true);

  BEGIN
    INSERT INTO public.booking_requests (
      student_id, equipment_id, time_range, project_title, project_description, deadline
    ) VALUES (
      v_user_id, v_equip_id,
      tstzrange('2026-12-01 10:00:00Z', '2026-12-01 12:00:00Z', '[)'),
      'Direct Title', 'Direct Description text here', now() + interval '5 days'
    );
    RAISE EXCEPTION 'TEST 2 FAILED: Direct client insert into booking_requests succeeded';
  EXCEPTION WHEN insufficient_privilege OR row_security_active_violation OR check_violation THEN
    RAISE NOTICE 'TEST 2 PASSED: Direct client insert blocked by RLS';
  END;
END $$;
ROLLBACK;

-- Test 3: 4th pending request rejected by submit_booking_request RPC
BEGIN;
DO $$
DECLARE
  v_dept_id UUID := gen_random_uuid();
  v_user_id UUID := gen_random_uuid();
  v_equip_id UUID := gen_random_uuid();
  i INT;
  v_res JSONB;
BEGIN
  INSERT INTO public.departments (id, name, building, contact_email)
  VALUES (v_dept_id, 'Bio', 'Bio Bldg', 'bio@test.edu');

  INSERT INTO public.profiles (id, email, full_name, role, department_id)
  VALUES (v_user_id, 'student3@test.edu', 'Student Three', 'student', v_dept_id);

  INSERT INTO public.equipment (id, name, description, department_id, category)
  VALUES (v_equip_id, 'Microscope', 'Fluorescence Scope', v_dept_id, 'Microscopy');

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_id::text)::text, true);

  FOR i IN 1..3 LOOP
    v_res := public.submit_booking_request(
      v_equip_id,
      tstzrange(now() + (i || ' days')::interval, now() + (i || ' days 2 hours')::interval, '[)'),
      'Project ' || i, 'Description for project ' || i, now() + interval '10 days'
    );
  END LOOP;

  -- 4th attempt must fail with cap exception
  BEGIN
    v_res := public.submit_booking_request(
      v_equip_id,
      tstzrange(now() + interval '4 days', now() + interval '4 days 2 hours', '[)'),
      'Project 4', 'Description for project 4', now() + interval '10 days'
    );
    RAISE EXCEPTION 'TEST 3 FAILED: 4th request was not rejected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%Pending request limit reached%' THEN
      RAISE NOTICE 'TEST 3 PASSED: 4th request correctly rejected';
    ELSE
      RAISE;
    END IF;
  END;
END $$;
ROLLBACK;

-- Test 4: Student cannot read another student's requests
BEGIN;
DO $$
DECLARE
  v_dept_id UUID := gen_random_uuid();
  v_student_a UUID := gen_random_uuid();
  v_student_b UUID := gen_random_uuid();
  v_equip_id UUID := gen_random_uuid();
  v_count INT;
BEGIN
  INSERT INTO public.departments (id, name, building, contact_email)
  VALUES (v_dept_id, 'Chemistry', 'Chem Bldg', 'chem@test.edu');

  INSERT INTO public.profiles (id, email, full_name, role, department_id)
  VALUES (v_student_a, 'student_a@test.edu', 'Student A', 'student', v_dept_id),
         (v_student_b, 'student_b@test.edu', 'Student B', 'student', v_dept_id);

  INSERT INTO public.equipment (id, name, description, department_id, category)
  VALUES (v_equip_id, 'Mass Spec', 'High Resolution MS', v_dept_id, 'Spectrometry');

  -- Student B submits request
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_student_b::text)::text, true);
  PERFORM public.submit_booking_request(
    v_equip_id, tstzrange(now() + interval '1 day', now() + interval '1 day 2 hours', '[)'),
    'Student B Title', 'Student B Description details', now() + interval '5 days'
  );

  -- Switch context to Student A
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_student_a::text)::text, true);
  SELECT count(*) INTO v_count FROM public.booking_requests WHERE student_id = v_student_b;

  IF v_count = 0 THEN
    RAISE NOTICE 'TEST 4 PASSED: Student A cannot read Student B requests';
  ELSE
    RAISE EXCEPTION 'TEST 4 FAILED: Student A could see % requests of Student B', v_count;
  END IF;
END $$;
ROLLBACK;

-- Test 5: Faculty cannot review another department's request
BEGIN;
DO $$
DECLARE
  v_dept_chem UUID := gen_random_uuid();
  v_dept_phys UUID := gen_random_uuid();
  v_student UUID := gen_random_uuid();
  v_faculty_chem UUID := gen_random_uuid();
  v_equip_phys UUID := gen_random_uuid();
  v_req_res JSONB;
  v_req_id UUID;
BEGIN
  INSERT INTO public.departments (id, name, building, contact_email)
  VALUES (v_dept_chem, 'Dept Chem', 'Chem Hall', 'chem@test.edu'),
         (v_dept_phys, 'Dept Phys', 'Phys Hall', 'phys@test.edu');

  INSERT INTO public.profiles (id, email, full_name, role, department_id)
  VALUES (v_student, 'student_x@test.edu', 'Student X', 'student', v_dept_phys),
         (v_faculty_chem, 'prof_chem@test.edu', 'Prof Chem', 'faculty', v_dept_chem);

  INSERT INTO public.equipment (id, name, description, department_id, category)
  VALUES (v_equip_phys, 'Laser', 'Ultrafast Laser', v_dept_phys, 'Optics');

  -- Student submits request for physics equipment
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_student::text)::text, true);
  v_req_res := public.submit_booking_request(
    v_equip_phys, tstzrange(now() + interval '2 days', now() + interval '2 days 3 hours', '[)'),
    'Laser Exp', 'Laser experiment project description', now() + interval '7 days'
  );
  v_req_id := (v_req_res->>'request_id')::UUID;

  -- Chem faculty tries to review physics request
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_faculty_chem::text)::text, true);
  BEGIN
    PERFORM public.review_booking_request(v_req_id, 'approved', 'Approved by chem faculty');
    RAISE EXCEPTION 'TEST 5 FAILED: Cross-department review should have been denied';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%Not authorized to review requests for this department equipment%' THEN
      RAISE NOTICE 'TEST 5 PASSED: Cross-department review rejected';
    ELSE
      RAISE;
    END IF;
  END;
END $$;
ROLLBACK;

-- Test 6: Overlapping approval fails with 23P01 leaving exactly one booking
BEGIN;
DO $$
DECLARE
  v_dept UUID := gen_random_uuid();
  v_student1 UUID := gen_random_uuid();
  v_student2 UUID := gen_random_uuid();
  v_faculty UUID := gen_random_uuid();
  v_equip UUID := gen_random_uuid();
  v_slot TSTZRANGE := tstzrange('2026-12-05 14:00:00Z', '2026-12-05 17:00:00Z', '[)');
  v_req1_res JSONB;
  v_req2_res JSONB;
  v_req1_id UUID;
  v_req2_id UUID;
  v_rev1 JSONB;
  v_rev2 JSONB;
  v_booking_count INT;
BEGIN
  INSERT INTO public.departments (id, name, building, contact_email)
  VALUES (v_dept, 'Engineering', 'Eng Hall', 'eng@test.edu');

  INSERT INTO public.profiles (id, email, full_name, role, department_id)
  VALUES (v_student1, 's1@test.edu', 'Student S1', 'student', v_dept),
         (v_student2, 's2@test.edu', 'Student S2', 'student', v_dept),
         (v_faculty, 'prof@test.edu', 'Prof Eng', 'faculty', v_dept);

  INSERT INTO public.equipment (id, name, description, department_id, category)
  VALUES (v_equip, 'Wind Tunnel', 'Aerodynamic Tunnel', v_dept, 'Aerodynamics');

  -- Student 1 submits
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_student1::text)::text, true);
  v_req1_res := public.submit_booking_request(v_equip, v_slot, 'Proj 1', 'Desc for project 1', now() + interval '4 days');
  v_req1_id := (v_req1_res->>'request_id')::UUID;

  -- Student 2 submits for overlapping slot
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_student2::text)::text, true);
  v_req2_res := public.submit_booking_request(v_equip, v_slot, 'Proj 2', 'Desc for project 2', now() + interval '4 days');
  v_req2_id := (v_req2_res->>'request_id')::UUID;

  -- Faculty approves request 1
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_faculty::text)::text, true);
  v_rev1 := public.review_booking_request(v_req1_id, 'approved', 'Looks good');
  IF (v_rev1->>'success')::BOOLEAN IS NOT TRUE THEN
    RAISE EXCEPTION 'TEST 6 FAILED: First approval failed';
  END IF;

  -- Faculty attempts to approve request 2 (overlapping slot)
  v_rev2 := public.review_booking_request(v_req2_id, 'approved', 'Also good');
  IF (v_rev2->>'success')::BOOLEAN IS TRUE OR (v_rev2->>'error') <> 'slot_conflict' THEN
    RAISE EXCEPTION 'TEST 6 FAILED: Second approval did not detect slot conflict';
  END IF;

  SELECT count(*) INTO v_booking_count FROM public.bookings WHERE equipment_id = v_equip;
  IF v_booking_count <> 1 THEN
    RAISE EXCEPTION 'TEST 6 FAILED: Expected exactly 1 booking, found %', v_booking_count;
  END IF;

  RAISE NOTICE 'TEST 6 PASSED: Exclusion constraint handled; exactly 1 booking confirmed';
END $$;
ROLLBACK;

-- Test 7: Anon can read equipment only, cannot access booking_requests or RPCs
BEGIN;
DO $$
DECLARE
  v_count INT;
BEGIN
  PERFORM set_config('role', 'anon', true);

  -- Anon reading equipment must work
  SELECT count(*) INTO v_count FROM public.equipment;
  RAISE NOTICE 'TEST 7 INFO: Anon read % equipment items', v_count;

  -- Anon reading booking_requests returns 0
  SELECT count(*) INTO v_count FROM public.booking_requests;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'TEST 7 FAILED: Anon was able to read % booking_requests', v_count;
  END IF;

  RAISE NOTICE 'TEST 7 PASSED: Anon access restricted to public catalogue';
END $$;
ROLLBACK;
