-- ============================================================
-- 005: Security Definer Stored Procedures (RPCs)
-- ============================================================

-- 1. Anonymised Availability Function
CREATE OR REPLACE FUNCTION public.get_equipment_busy_ranges(
  p_equipment_id UUID,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
)
RETURNS TABLE (busy_range TSTZRANGE)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT time_range AS busy_range
  FROM public.bookings
  WHERE equipment_id = p_equipment_id
    AND time_range && tstzrange(p_from, p_to, '[)');
$$;

-- 2. Submit Booking Request (with Advisory Lock & 3-request cap)
CREATE OR REPLACE FUNCTION public.submit_booking_request(
  p_equipment_id UUID,
  p_time_range TSTZRANGE,
  p_project_title TEXT,
  p_project_description TEXT,
  p_deadline TIMESTAMPTZ,
  p_ai_parsed_fields JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pending_count INT;
  v_new_id UUID;
  c_max_pending CONSTANT INT := 3;
BEGIN
  IF public.get_my_role() <> 'student' THEN
    RAISE EXCEPTION 'Only students may submit booking requests';
  END IF;

  -- Advisory transaction lock on student ID prevents concurrent limit bypass
  PERFORM pg_advisory_xact_lock(hashtext((SELECT auth.uid())::text));

  SELECT count(*) INTO v_pending_count
  FROM public.booking_requests
  WHERE student_id = (SELECT auth.uid()) AND status = 'pending';

  IF v_pending_count >= c_max_pending THEN
    RAISE EXCEPTION 'Pending request limit reached: maximum % active pending requests allowed per student', c_max_pending;
  END IF;

  INSERT INTO public.booking_requests (
    student_id, equipment_id, time_range, project_title, project_description,
    deadline, deadline_verified, status, ai_parsed_fields, reviewed_by,
    review_note, allocation_score, allocation_explanation, alternative_slots
  )
  VALUES (
    (SELECT auth.uid()), p_equipment_id, p_time_range, p_project_title, p_project_description,
    p_deadline, false, 'pending', p_ai_parsed_fields, NULL,
    NULL, NULL, NULL, NULL
  )
  RETURNING id INTO v_new_id;

  INSERT INTO public.audit_log (actor_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    (SELECT auth.uid()), 'request.created', 'booking_requests', v_new_id, NULL,
    jsonb_build_object('equipment_id', p_equipment_id, 'time_range', p_time_range, 'deadline', p_deadline)
  );

  RETURN jsonb_build_object('success', true, 'request_id', v_new_id);
END;
$$;

-- 3. Review Booking Request (Approve / Reject with 23P01 handling)
CREATE OR REPLACE FUNCTION public.review_booking_request(
  p_request_id UUID,
  p_action TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_req RECORD;
  v_caller_role TEXT;
  v_caller_dept UUID;
  v_equip_dept UUID;
  v_booking_id UUID;
BEGIN
  IF p_action NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;

  SELECT * INTO v_req FROM public.booking_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Request is no longer pending (status: %)', v_req.status;
  END IF;

  v_caller_role := public.get_my_role();
  v_caller_dept := public.get_my_department_id();
  SELECT department_id INTO v_equip_dept FROM public.equipment WHERE id = v_req.equipment_id;

  IF v_caller_role <> 'admin' AND (v_caller_role <> 'faculty' OR v_caller_dept <> v_equip_dept) THEN
    RAISE EXCEPTION 'Not authorized to review requests for this department equipment';
  END IF;

  IF p_action = 'rejected' THEN
    UPDATE public.booking_requests
    SET status = 'rejected', reviewed_by = (SELECT auth.uid()), review_note = p_note, updated_at = now()
    WHERE id = p_request_id;

    INSERT INTO public.audit_log (actor_id, action, table_name, record_id, old_data, new_data)
    VALUES ((SELECT auth.uid()), 'request.rejected', 'booking_requests', p_request_id,
            jsonb_build_object('status', 'pending'),
            jsonb_build_object('status', 'rejected', 'note', p_note));

    RETURN jsonb_build_object('success', true, 'status', 'rejected');
  END IF;

  -- APPROVAL FLOW
  BEGIN
    UPDATE public.booking_requests
    SET status = 'approved', reviewed_by = (SELECT auth.uid()), review_note = p_note, updated_at = now()
    WHERE id = p_request_id;

    INSERT INTO public.bookings (request_id, student_id, equipment_id, time_range)
    VALUES (v_req.id, v_req.student_id, v_req.equipment_id, v_req.time_range)
    RETURNING id INTO v_booking_id;

    INSERT INTO public.audit_log (actor_id, action, table_name, record_id, old_data, new_data)
    VALUES ((SELECT auth.uid()), 'request.approved', 'bookings', v_booking_id, NULL,
            jsonb_build_object('request_id', v_req.id, 'time_range', v_req.time_range));

    RETURN jsonb_build_object('success', true, 'status', 'approved', 'booking_id', v_booking_id);

  EXCEPTION WHEN SQLSTATE '23P01' THEN
    UPDATE public.booking_requests
    SET review_note = 'System: Slot conflicted with an existing approved booking. Check alternatives.',
        updated_at = now()
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'slot_conflict',
      'message', 'This slot was just booked by another approved request. Alternatives are available.'
    );
  END;
END;
$$;

-- 4. Cancel Booking Request
CREATE OR REPLACE FUNCTION public.cancel_booking_request(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_req RECORD;
BEGIN
  SELECT * INTO v_req FROM public.booking_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_req.student_id <> (SELECT auth.uid()) AND public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Unauthorized to cancel this request';
  END IF;

  IF v_req.status = 'approved' THEN
    DELETE FROM public.bookings WHERE request_id = p_request_id;
  END IF;

  UPDATE public.booking_requests
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_request_id;

  INSERT INTO public.audit_log (actor_id, action, table_name, record_id, old_data, new_data)
  VALUES ((SELECT auth.uid()), 'request.cancelled', 'booking_requests', p_request_id,
          jsonb_build_object('status', v_req.status),
          jsonb_build_object('status', 'cancelled'));

  RETURN jsonb_build_object('success', true, 'status', 'cancelled');
END;
$$;
