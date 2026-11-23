-- ============================================================
-- 001: Core Tables and Indexes
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 1. Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  building      TEXT NOT NULL,
  floor         SMALLINT,
  contact_email TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Profiles (1-to-1 with auth.users, maintained by DB trigger)
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'faculty', 'admin')),
  department_id   UUID NOT NULL REFERENCES public.departments(id),
  student_id      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3. User Qualifications (evaluates H3: access eligibility)
CREATE TABLE IF NOT EXISTS public.user_qualifications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  qualification_type TEXT NOT NULL CHECK (qualification_type IN ('training', 'certification', 'department_membership')),
  qualification_name TEXT NOT NULL,
  verified_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_qualifications_user ON public.user_qualifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_qualifications_name ON public.user_qualifications(qualification_name);

-- 4. Equipment
CREATE TABLE IF NOT EXISTS public.equipment (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  description        TEXT NOT NULL,
  department_id      UUID NOT NULL REFERENCES public.departments(id),
  category           TEXT NOT NULL,
  specifications     JSONB NOT NULL DEFAULT '{}',
  is_operational     BOOLEAN NOT NULL DEFAULT true,
  requires_training  BOOLEAN NOT NULL DEFAULT false,
  max_booking_hours  SMALLINT NOT NULL DEFAULT 4 CHECK (max_booking_hours BETWEEN 1 AND 12),
  lab_open           TIME NOT NULL DEFAULT '09:00',
  lab_close          TIME NOT NULL DEFAULT '18:00',
  image_url          TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_equipment_department ON public.equipment(department_id);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON public.equipment(category);
CREATE INDEX IF NOT EXISTS idx_equipment_operational ON public.equipment(is_operational);

-- 5. Access Requirements
CREATE TABLE IF NOT EXISTS public.access_requirements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id     UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('training', 'certification', 'faculty_approval', 'department_membership')),
  description      TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_access_req_equipment ON public.access_requirements(equipment_id);

-- 6. Booking Requests
CREATE TABLE IF NOT EXISTS public.booking_requests (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id               UUID NOT NULL REFERENCES public.profiles(id),
  equipment_id             UUID NOT NULL REFERENCES public.equipment(id),
  time_range               TSTZRANGE NOT NULL,
  project_title            TEXT NOT NULL CHECK (char_length(project_title) BETWEEN 3 AND 150),
  project_description      TEXT NOT NULL CHECK (char_length(project_description) BETWEEN 10 AND 2000),
  deadline                 TIMESTAMPTZ NOT NULL,
  deadline_verified        BOOLEAN NOT NULL DEFAULT false,
  status                   TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by              UUID REFERENCES public.profiles(id),
  review_note              TEXT CHECK (review_note IS NULL OR char_length(review_note) <= 1000),
  ai_parsed_fields         JSONB,
  allocation_score         NUMERIC(5,2),
  allocation_explanation   TEXT,
  alternative_slots        JSONB,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_br_student ON public.booking_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_br_equipment ON public.booking_requests(equipment_id);
CREATE INDEX IF NOT EXISTS idx_br_status ON public.booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_br_time_range ON public.booking_requests USING GIST (time_range);

-- 7. Confirmed Bookings (Physical Source of Truth)
CREATE TABLE IF NOT EXISTS public.bookings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID NOT NULL UNIQUE REFERENCES public.booking_requests(id),
  student_id    UUID NOT NULL REFERENCES public.profiles(id),
  equipment_id  UUID NOT NULL REFERENCES public.equipment(id),
  time_range    TSTZRANGE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bookings_student ON public.bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_equipment ON public.bookings(equipment_id);
CREATE INDEX IF NOT EXISTS idx_bookings_range ON public.bookings USING GIST (time_range);

-- 8. Audit Log (Immutable, No IP address)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID NOT NULL REFERENCES public.profiles(id),
  action      TEXT NOT NULL,
  table_name  TEXT NOT NULL,
  record_id   UUID NOT NULL,
  old_data    JSONB,
  new_data    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_time ON public.audit_log(created_at);
