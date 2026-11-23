-- ============================================================
-- 004: Row Level Security Policies
-- ============================================================

-- Helper functions (SECURITY DEFINER with fixed search_path)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT role FROM public.profiles WHERE id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.get_my_department_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT department_id FROM public.profiles WHERE id = (SELECT auth.uid());
$$;

-- Enable RLS on all domain tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ── departments ──
CREATE POLICY departments_select_public ON public.departments FOR SELECT
  USING (true);

-- ── profiles ──
CREATE POLICY profiles_select_authenticated ON public.profiles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- ── user_qualifications ──
CREATE POLICY qualifications_select ON public.user_qualifications FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    public.get_my_role() IN ('faculty', 'admin')
  );

-- ── equipment (Catalogue is public read) ──
CREATE POLICY equipment_select_public ON public.equipment FOR SELECT
  USING (true);

CREATE POLICY equipment_mutate ON public.equipment FOR ALL
  TO authenticated
  USING (
    public.get_my_role() = 'admin' OR
    (public.get_my_role() = 'faculty' AND department_id = public.get_my_department_id())
  );

-- ── access_requirements ──
CREATE POLICY access_req_select ON public.access_requirements FOR SELECT
  USING (true);

-- ── booking_requests ──
-- Students see only their own; faculty see their department's; admin sees all
CREATE POLICY br_select ON public.booking_requests FOR SELECT
  TO authenticated
  USING (
    student_id = (SELECT auth.uid()) OR
    (public.get_my_role() = 'faculty' AND (SELECT department_id FROM public.equipment WHERE id = equipment_id) = public.get_my_department_id()) OR
    public.get_my_role() = 'admin'
  );

-- Direct client INSERT revoked completely; all requests MUST be created via submit_booking_request RPC
CREATE POLICY br_no_client_insert ON public.booking_requests FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Direct UPDATE revoked for students; updates occur via RPC functions
CREATE POLICY br_update_faculty_admin ON public.booking_requests FOR UPDATE
  TO authenticated
  USING (
    (public.get_my_role() = 'faculty' AND (SELECT department_id FROM public.equipment WHERE id = equipment_id) = public.get_my_department_id()) OR
    public.get_my_role() = 'admin'
  );

-- ── bookings ──
-- Students can only read THEIR OWN confirmed bookings row
CREATE POLICY bookings_select ON public.bookings FOR SELECT
  TO authenticated
  USING (
    student_id = (SELECT auth.uid()) OR
    (public.get_my_role() = 'faculty' AND (SELECT department_id FROM public.equipment WHERE id = equipment_id) = public.get_my_department_id()) OR
    public.get_my_role() = 'admin'
  );

-- No direct client INSERT/UPDATE/DELETE on bookings (RPC handles it)
CREATE POLICY bookings_no_client_mutation ON public.bookings FOR ALL
  TO authenticated USING (false);

-- ── audit_log ──
CREATE POLICY audit_select ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.get_my_role() = 'admin');
