# LabLink — Architecture Document

> GenAI campus lab resource-sharing platform.
> Students discover specialised equipment across departments, book slots, submit
> project-based access requests, faculty approve, and the system resolves conflicts
> by recommending fair, feasible allocations using project deadlines, availability,
> and student requirements.

**Stack (all free-tier):** Next.js 16 App Router · TypeScript strict · Supabase
(Postgres 15, Auth, RLS) · Gemini API (`@google/genai`, free tier, server-only) · Vercel Hobby.
No paid services.

---

## 1. Folder Structure

```
src/
├── domain/                     # ★ Pure functions — zero I/O, zero external network/DB imports
│   ├── types.ts                #   Branded types, enums, interfaces for the entire domain
│   ├── allocation/
│   │   ├── constraints.ts      #   Hard-constraint filters (operational, free, eligible, lab-hours, deadline)
│   │   ├── scoring.ts          #   Weighted soft-score calculator (urgency, wait, fairness, spec fit)
│   │   ├── ranking.ts          #   rankCompetingRequests: grouping, ranking, tie-breaking, alternatives
│   │   ├── engine.ts           #   Orchestrator: filter → score → rank → explain → alternatives
│   │   └── explain.ts          #   Human-readable explanation builder ("claimed deadline", score breakdown)
│   ├── booking/
│   │   ├── validate.ts         #   Booking-request validation rules (bounds, non-zero, limits)
│   │   └── time.ts             #   UTC ↔ campus-time helpers (pure; uses Intl.DateTimeFormat, no moment/dayjs)
│   └── gemini/
│       ├── prompt.ts           #   Prompt template injecting today's date, timezone, catalogue schema
│       └── parse.ts            #   Zod schema with string max lengths + normalization (pure)
│
├── data/                       # Data-access layer — raw DB interactions & Supabase clients
│   └── supabase/
│       ├── server.ts           #   createServerClient (cookie-based, for RSC / queries / actions)
│       └── browser.ts          #   createBrowserClient (for client components, auth state only)
│
├── queries/                    # ★ Read-only data fetchers for Server Components (reads only)
│   ├── equipment.queries.ts    #   Catalogue list, item details, specifications
│   ├── booking.queries.ts      #   get_equipment_busy_ranges (anonymised), my bookings/requests
│   ├── department.queries.ts   #   Department lookups
│   ├── profile.queries.ts      #   Current user profile (limited safe fields)
│   └── audit.queries.ts        #   Audit log reader (admin-only)
│
├── actions/                    # ★ Next.js Server Actions — write operations only (invokes RPCs)
│   ├── booking.actions.ts      #   submitRequest (student), cancelRequest (calls cancel_booking_request RPC)
│   ├── approval.actions.ts     #   approveRequest, rejectRequest (calls review_booking_request RPC)
│   ├── equipment.actions.ts    #   createEquipment, updateEquipment (admin / faculty)
│   ├── gemini.actions.ts       #   parseNaturalLanguageRequest (authenticated, rate-limited per user)
│   └── auth.actions.ts         #   signIn, signUp, signOut wrappers
│
├── app/                        # Next.js App Router — pages & layouts
│   ├── layout.tsx              #   Root layout (html, body, providers, skip-link)
│   ├── page.tsx                #   Landing / public equipment catalogue
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx          #   Authenticated shell, role-based nav
│   │   ├── page.tsx            #   Role-aware dashboard home
│   │   ├── equipment/
│   │   │   ├── page.tsx        #   Browse & search catalogue
│   │   │   └── [id]/page.tsx   #   Detail + booking form (with untrusted AI prefill)
│   │   ├── bookings/
│   │   │   ├── page.tsx        #   My bookings (student) / department queue (faculty)
│   │   │   └── [id]/page.tsx   #   Request detail + ranking & approval panel
│   │   └── admin/
│   │       ├── equipment/page.tsx
│   │       └── audit/page.tsx
│
├── components/
│   ├── ui/                     #   Primitive accessible components (Button, Input, Dialog, etc.)
│   ├── equipment/              #   EquipmentCard, EquipmentGrid, EquipmentFilters
│   ├── booking/                #   BookingForm, BookingTimeline, BookingStatusBadge
│   ├── allocation/             #   AllocationExplanation, CompetingQueueTable, AlternativeSlots
│   └── layout/                 #   Nav, Sidebar, SkipLink, Footer
│
├── lib/
│   ├── gemini.server.ts        #   import 'server-only'; GoogleGenAI initialization
│   ├── ratelimit.server.ts     #   import 'server-only'; Per-user sliding-window rate limiter
│   ├── catalogue-matcher.server.ts # Exact & fuzzy matching from string to real equipment UUID
│   ├── validators.ts           #   Shared Zod schemas (re-exported from domain)
│   ├── constants.ts            #   Campus timezone, max pending cap, weights, lab hours
│   └── utils.ts                #   cn() helper, formatters
│
└── seed/                       # Local seed scripts (uses SERVICE_ROLE_KEY, never deployed to Vercel)
    ├── seed.ts                 # Relative date generator + Supabase seeder
    └── data.ts                 # 3 departments, 12 equipment, demo student/faculty accounts
```

**Architectural Boundary Rules:**

| Layer | Responsibility | Permitted Imports | Forbidden Imports |
|---|---|---|---|
| `src/domain/` | Pure business logic, math, constraints, ranking | Stdlib, `zod` | Next.js, React, Supabase, network, DB, files |
| `src/queries/` | **Reads only** for Server Components | `src/domain/`, `src/data/supabase/server` | `src/actions/`, mutation RPCs |
| `src/actions/` | **Writes only** (Server Actions) | `src/domain/`, `src/data/`, `src/lib/` | Direct SQL, bypassing Postgres RPCs |
| `src/lib/*.server.ts` | Server-only infrastructure | `server-only`, `@google/genai` | Any client component |
| `src/components/` | Accessible UI rendering | `src/domain/types`, `src/lib/utils` | Direct DB clients, `server-only` modules |

---

## 2. Database Schema & Integrity Constraints

All timestamps are `TIMESTAMPTZ` stored in **UTC**.
Database enforces bounded ranges, foreign keys, row-level security, and atomic constraints.

```sql
-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- exclusion constraint on (uuid, tstzrange)

-- ============================================================
-- departments
-- ============================================================
CREATE TABLE departments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  building      TEXT NOT NULL,
  floor         SMALLINT,
  contact_email TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- profiles (1-to-1 with auth.users, maintained by DB trigger)
-- ============================================================
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'student'
                    CHECK (role IN ('student', 'faculty', 'admin')),
  department_id   UUID NOT NULL REFERENCES departments(id),
  student_id      TEXT,                        -- NULL for faculty/admin
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_department ON profiles(department_id);
CREATE INDEX idx_profiles_role       ON profiles(role);

-- ============================================================
-- user_qualifications (evaluates H3: access eligibility)
-- ============================================================
CREATE TABLE user_qualifications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  qualification_type TEXT NOT NULL
                       CHECK (qualification_type IN ('training', 'certification', 'department_membership')),
  qualification_name TEXT NOT NULL,
  verified_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at         TIMESTAMPTZ, -- NULL means never expires
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_qualification_dates CHECK (expires_at IS NULL OR expires_at > verified_at)
);

CREATE INDEX idx_user_qualifications_user ON user_qualifications(user_id);
CREATE INDEX idx_user_qualifications_name ON user_qualifications(qualification_name);

-- ============================================================
-- equipment
-- ============================================================
CREATE TABLE equipment (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  description        TEXT NOT NULL,
  department_id      UUID NOT NULL REFERENCES departments(id),
  category           TEXT NOT NULL,
  specifications     JSONB NOT NULL DEFAULT '{}',
  is_operational     BOOLEAN NOT NULL DEFAULT true,
  requires_training  BOOLEAN NOT NULL DEFAULT false,
  max_booking_hours  SMALLINT NOT NULL DEFAULT 4
                       CHECK (max_booking_hours BETWEEN 1 AND 12),
  lab_open           TIME NOT NULL DEFAULT '09:00',
  lab_close          TIME NOT NULL DEFAULT '18:00',
  image_url          TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_lab_hours CHECK (lab_close > lab_open)
);

CREATE INDEX idx_equipment_department ON equipment(department_id);
CREATE INDEX idx_equipment_category   ON equipment(category);
CREATE INDEX idx_equipment_operational ON equipment(is_operational);

-- ============================================================
-- access_requirements
-- ============================================================
CREATE TABLE access_requirements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id     UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  requirement_type TEXT NOT NULL
                     CHECK (requirement_type IN (
                       'training', 'certification',
                       'faculty_approval', 'department_membership'
                     )),
  description      TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_req_equipment ON access_requirements(equipment_id);

-- ============================================================
-- booking_requests
-- ============================================================
CREATE TABLE booking_requests (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id               UUID NOT NULL REFERENCES profiles(id),
  equipment_id             UUID NOT NULL REFERENCES equipment(id),
  time_range               TSTZRANGE NOT NULL,
  project_title            TEXT NOT NULL CHECK (char_length(project_title) BETWEEN 3 AND 150),
  project_description      TEXT NOT NULL CHECK (char_length(project_description) BETWEEN 10 AND 2000),
  deadline                 TIMESTAMPTZ NOT NULL,
  deadline_verified        BOOLEAN NOT NULL DEFAULT false, -- Faculty-verified flag
  status                   TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by              UUID REFERENCES profiles(id),
  review_note              TEXT CHECK (review_note IS NULL OR char_length(review_note) <= 1000),
  ai_parsed_fields         JSONB,       -- Untrusted AI prefill snapshot
  allocation_score         NUMERIC(5,2),-- Submission-time snapshot only
  allocation_explanation   TEXT,
  alternative_slots        JSONB,       -- Array of {start, end, score}
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ★ STRICT BOUNDED TIME RANGE CONSTRAINT (prevents unbounded/empty ranges)
  CONSTRAINT chk_bounded_request_range CHECK (
    NOT isempty(time_range) AND
    lower_inc(time_range) AND
    NOT upper_inc(time_range) AND
    lower(time_range) IS NOT NULL AND
    upper(time_range) IS NOT NULL AND
    upper(time_range) > lower(time_range)
  )
);

CREATE INDEX idx_br_student    ON booking_requests(student_id);
CREATE INDEX idx_br_equipment  ON booking_requests(equipment_id);
CREATE INDEX idx_br_status     ON booking_requests(status);
CREATE INDEX idx_br_time_range ON booking_requests USING GIST (time_range);

-- ============================================================
-- bookings (confirmed only — physical source of truth)
-- ============================================================
CREATE TABLE bookings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID NOT NULL UNIQUE REFERENCES booking_requests(id),
  student_id    UUID NOT NULL REFERENCES profiles(id),
  equipment_id  UUID NOT NULL REFERENCES equipment(id),
  time_range    TSTZRANGE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ★ STRICT BOUNDED TIME RANGE CONSTRAINT
  CONSTRAINT chk_bounded_booking_range CHECK (
    NOT isempty(time_range) AND
    lower_inc(time_range) AND
    NOT upper_inc(time_range) AND
    lower(time_range) IS NOT NULL AND
    upper(time_range) IS NOT NULL AND
    upper(time_range) > lower(time_range)
  ),

  -- ★ EXCLUSION CONSTRAINT: overlap physically impossible at Postgres kernel level
  EXCLUDE USING GIST (equipment_id WITH =, time_range WITH &&)
);

CREATE INDEX idx_bookings_student   ON bookings(student_id);
CREATE INDEX idx_bookings_equipment ON bookings(equipment_id);
CREATE INDEX idx_bookings_range     ON bookings USING GIST (time_range);

-- ============================================================
-- audit_log (immutable append-only log; ip_address dropped)
-- ============================================================
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID NOT NULL REFERENCES profiles(id),
  action      TEXT NOT NULL, -- 'request.created', 'request.approved', 'request.rejected', 'request.cancelled'
  table_name  TEXT NOT NULL,
  record_id   UUID NOT NULL,
  old_data    JSONB,
  new_data    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_actor  ON audit_log(actor_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_time   ON audit_log(created_at);

-- IMMUTABILITY: Revoke update and delete completely
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM PUBLIC, authenticated, anon;
```

---

## 3. Booking Safety & Concurrency

### Database-Level Exclusion Constraint

Overlapping bookings are prevented by the Postgres `btree_gist` exclusion constraint:
```sql
EXCLUDE USING GIST (equipment_id WITH =, time_range WITH &&)
```

1. **Pending requests NEVER hold a lock or block a slot.** Any number of students may request the same time window.
2. Only confirmed bookings enter the `bookings` table.
3. Approval runs through a `SECURITY DEFINER` stored procedure inside a single serialised transaction:
   - Sets `booking_requests.status = 'approved'`
   - Inserts into `bookings`
   - Logs to `audit_log`
4. If two faculty members concurrently approve two requests for the same equipment and overlapping times, the second `INSERT` raises SQLSTATE `23P01` (`exclusion_violation`). The procedure catches this error, rolls back the approval, updates the losing request with fresh alternative slots, and returns a clean conflict payload.

---

## 4. Roles, Profiles, RLS, and Postgres RPC Functions

### Roles & Security Model
- **Roles:** `student`, `faculty`, `admin`.
- The deployed application runs **entirely** with `anon` and `authenticated` Supabase roles. **The `SUPABASE_SERVICE_ROLE_KEY` is never deployed to Vercel or used by application code.** It is restricted to local seed scripts.
- To prevent RLS performance degradation and recursion, all policies use `(SELECT auth.uid())`.

### 1. Hardcoded Profile Creation Trigger
Users cannot supply their own role on registration. The trigger ignores `raw_user_meta_data->>'role'` completely:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_default_dept UUID;
BEGIN
  -- Default to Physics department if none provided
  SELECT id INTO v_default_dept FROM departments WHERE name = 'Physics' LIMIT 1;

  INSERT INTO public.profiles (id, email, full_name, role, department_id, student_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Campus Member'),
    'student', -- HARDCODED: never trust metadata
    COALESCE((NEW.raw_user_meta_data->>'department_id')::UUID, v_default_dept),
    NEW.raw_user_meta_data->>'student_id'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2. Profile Security & Limited Field Exposure
- `SELECT` is restricted to authenticated users.
- Users can update **only** `full_name`. Attempts to modify `role`, `department_id`, or `email` are blocked by trigger:

```sql
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Role elevation is forbidden';
  END IF;
  IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
    RAISE EXCEPTION 'Department modification is forbidden';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Email modification is forbidden';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_profile_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();
```

### 3. Row Level Security Policies

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper functions (SECURITY DEFINER with fixed search_path)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT role FROM profiles WHERE id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.get_my_department_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT department_id FROM profiles WHERE id = (SELECT auth.uid());
$$;

-- ── profiles ──
CREATE POLICY profiles_select_authenticated ON profiles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY profiles_update_own ON profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- ── user_qualifications ──
CREATE POLICY qualifications_select ON user_qualifications FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    public.get_my_role() IN ('faculty', 'admin')
  );

-- ── equipment (Catalogue is public read) ──
CREATE POLICY equipment_select_public ON equipment FOR SELECT
  USING (true);

CREATE POLICY equipment_mutate ON equipment FOR ALL
  TO authenticated
  USING (
    public.get_my_role() = 'admin' OR
    (public.get_my_role() = 'faculty' AND department_id = public.get_my_department_id())
  );

-- ── access_requirements ──
CREATE POLICY access_req_select ON access_requirements FOR SELECT
  USING (true);

-- ── booking_requests ──
-- Students see only their own; faculty see their department's; admin sees all
CREATE POLICY br_select ON booking_requests FOR SELECT
  TO authenticated
  USING (
    student_id = (SELECT auth.uid()) OR
    (public.get_my_role() = 'faculty' AND (SELECT department_id FROM equipment WHERE id = equipment_id) = public.get_my_department_id()) OR
    public.get_my_role() = 'admin'
  );

-- Students can insert: MUST be pending, no scores/explanations/reviews prefilled
CREATE POLICY br_insert_student ON booking_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'student' AND
    student_id = (SELECT auth.uid()) AND
    status = 'pending' AND
    reviewed_by IS NULL AND
    review_note IS NULL AND
    allocation_score IS NULL AND
    allocation_explanation IS NULL AND
    alternative_slots IS NULL AND
    deadline_verified = false AND
    -- Cap on active pending requests: maximum 3 per student
    (
      SELECT count(*) FROM booking_requests
      WHERE student_id = (SELECT auth.uid()) AND status = 'pending'
    ) < 3
  );

-- Direct UPDATE revoked for students; updates occur via RPC functions
CREATE POLICY br_update_faculty_admin ON booking_requests FOR UPDATE
  TO authenticated
  USING (
    (public.get_my_role() = 'faculty' AND (SELECT department_id FROM equipment WHERE id = equipment_id) = public.get_my_department_id()) OR
    public.get_my_role() = 'admin'
  );

-- ── bookings ──
-- Students can only read THEIR OWN confirmed bookings row
CREATE POLICY bookings_select ON bookings FOR SELECT
  TO authenticated
  USING (
    student_id = (SELECT auth.uid()) OR
    (public.get_my_role() = 'faculty' AND (SELECT department_id FROM equipment WHERE id = equipment_id) = public.get_my_department_id()) OR
    public.get_my_role() = 'admin'
  );

-- No direct client INSERT/UPDATE/DELETE on bookings (RPC handles it)
CREATE POLICY bookings_no_client_mutation ON bookings FOR ALL
  TO authenticated USING (false);

-- ── audit_log ──
CREATE POLICY audit_select ON audit_log FOR SELECT
  TO authenticated
  USING (public.get_my_role() = 'admin');
```

### 4. Anonymised Availability Function
Students never read other students' bookings directly. Availability queries call this RPC:

```sql
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
  FROM bookings
  WHERE equipment_id = p_equipment_id
    AND time_range && tstzrange(p_from, p_to, '[)');
$$;

REVOKE EXECUTE ON FUNCTION public.get_equipment_busy_ranges FROM anon;
GRANT EXECUTE ON FUNCTION public.get_equipment_busy_ranges TO authenticated;
```

### 5. Atomic State Transition RPCs (Approve / Reject / Cancel)
Executes status change, booking insertion/deletion, and audit logging in a single transaction with SQLSTATE `23P01` error handling:

```sql
CREATE OR REPLACE FUNCTION public.review_booking_request(
  p_request_id UUID,
  p_action TEXT, -- 'approved' or 'rejected'
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

  SELECT * INTO v_req FROM booking_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Request is no longer pending (status: %)', v_req.status;
  END IF;

  -- Verify faculty department permissions
  v_caller_role := public.get_my_role();
  v_caller_dept := public.get_my_department_id();
  SELECT department_id INTO v_equip_dept FROM equipment WHERE id = v_req.equipment_id;

  IF v_caller_role <> 'admin' AND (v_caller_role <> 'faculty' OR v_caller_dept <> v_equip_dept) THEN
    RAISE EXCEPTION 'Not authorized to review requests for this department equipment';
  END IF;

  IF p_action = 'rejected' THEN
    UPDATE booking_requests
    SET status = 'rejected',
        reviewed_by = (SELECT auth.uid()),
        review_note = p_note,
        updated_at = now()
    WHERE id = p_request_id;

    INSERT INTO audit_log (actor_id, action, table_name, record_id, old_data, new_data)
    VALUES ((SELECT auth.uid()), 'request.rejected', 'booking_requests', p_request_id,
            jsonb_build_object('status', 'pending'),
            jsonb_build_object('status', 'rejected', 'note', p_note));

    RETURN jsonb_build_object('success', true, 'status', 'rejected');
  END IF;

  -- APPROVAL FLOW: Atomic INSERT into bookings
  BEGIN
    UPDATE booking_requests
    SET status = 'approved',
        reviewed_by = (SELECT auth.uid()),
        review_note = p_note,
        updated_at = now()
    WHERE id = p_request_id;

    INSERT INTO bookings (request_id, student_id, equipment_id, time_range)
    VALUES (v_req.id, v_req.student_id, v_req.equipment_id, v_req.time_range)
    RETURNING id INTO v_booking_id;

    INSERT INTO audit_log (actor_id, action, table_name, record_id, old_data, new_data)
    VALUES ((SELECT auth.uid()), 'request.approved', 'bookings', v_booking_id,
            NULL,
            jsonb_build_object('request_id', v_req.id, 'time_range', v_req.time_range));

    RETURN jsonb_build_object('success', true, 'status', 'approved', 'booking_id', v_booking_id);

  EXCEPTION WHEN SQLSTATE '23P01' THEN
    -- Exclusion constraint violation (overlapping booking already confirmed)
    UPDATE booking_requests
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

CREATE OR REPLACE FUNCTION public.cancel_booking_request(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_req RECORD;
BEGIN
  SELECT * INTO v_req FROM booking_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  -- Only owner or admin may cancel
  IF v_req.student_id <> (SELECT auth.uid()) AND public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Unauthorized to cancel this request';
  END IF;

  IF v_req.status = 'approved' THEN
    DELETE FROM bookings WHERE request_id = p_request_id;
  END IF;

  UPDATE booking_requests
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_request_id;

  INSERT INTO audit_log (actor_id, action, table_name, record_id, old_data, new_data)
  VALUES ((SELECT auth.uid()), 'request.cancelled', 'booking_requests', p_request_id,
          jsonb_build_object('status', v_req.status),
          jsonb_build_object('status', 'cancelled'));

  RETURN jsonb_build_object('success', true, 'status', 'cancelled');
END;
$$;

-- Security grant management: Revoke from anon, allow authenticated
REVOKE EXECUTE ON FUNCTION public.review_booking_request FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_booking_request TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cancel_booking_request FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking_request TO authenticated;
```

---

## 5. Allocation & Conflict Resolution Engine

> Location: `src/domain/allocation/`. Pure CPU functions, zero network/DB dependencies.

### Pure Domain Types
```typescript
export interface AllocationContext {
  now: Date;                           // Injected clock for deterministic evaluation
  maxHoursPerStudent: number;          // Default: 20 hours/month
  weights: { urgency: 0.35; wait: 0.35; fairness: 0.30 };
}

export interface UserQualification {
  qualificationType: 'training' | 'certification' | 'department_membership';
  qualificationName: string;
  expiresAt: Date | null;
}
```

### Hard Constraints (Pass / Fail)

| # | Constraint | Evaluation Logic |
|---|---|---|
| H1 | `equipmentOperational` | `equipment.is_operational === true` |
| H2 | `slotFree` | Requested range has zero overlap with any confirmed booking in `existingBookings` |
| H3 | `accessEligible` | For each required `access_requirements`, student has active matching `user_qualifications` |
| H4 | `withinLabHours` | Time span is within equipment `lab_open` and `lab_close` in campus time |
| H5 | `fitsMaxDuration` | Duration hours `<= equipment.max_booking_hours` |
| H6 | `feasibleBeforeDeadline` | Requested slot start time `< request.deadline` |

### Weighted Soft Score Formula

Score values are strictly in `[0, 1]`.

| Factor | Weight | Exact Formula | Description |
|---|---|---|---|
| **Urgency** | 0.35 | `1 - Math.min(Math.max(daysUntilDeadline, 0), 14) / 14` | Approaching deadline increases urgency |
| **Waiting Time** | 0.35 | `Math.min(Math.max(daysSinceSubmission, 0), 7) / 7` | Longer queue time prioritises request |
| **Past Fairness** | 0.30 | `1 - Math.min(studentHoursThisMonth, 20) / 20` | Prioritises students with lower past usage |

```
finalScore = (0.35 * urgency) + (0.35 * waitTime) + (0.30 * pastFairness)
```

> **Equipment Fit:** Replaced arbitrary keyword matching with deterministic catalogue category filtering upfront. All requests entering scoring are 100% matched to equipment capabilities.

### Multi-Request Conflict Ranking: `rankCompetingRequests`
When multiple pending requests compete for overlapping slots on the same equipment:

```typescript
export function rankCompetingRequests(
  requests: BookingRequest[],
  equipment: Equipment,
  qualificationsByStudent: Map<string, UserQualification[]>,
  existingBookings: Booking[],
  studentHoursMap: Map<string, number>,
  ctx: AllocationContext
): {
  winner: ScoredRequest | null;
  rankedQueue: ScoredRequest[];
  fallbacksWithAlternatives: ScoredRequest[];
}
```

1. **Recompute View-Time Scores:** The stored `allocation_score` is only an initial snapshot; scores are re-evaluated dynamically using `ctx.now`.
2. **Filter Feasible:** Verify all 6 hard constraints against confirmed bookings.
3. **Sort by Deterministic Ranking:**
   - Primary: `finalScore` descending
   - Secondary (tie-breaker 1): Earlier submission timestamp (`created_at` ascending)
   - Tertiary (tie-breaker 2): Lexicographic UUID string comparison (`id` ascending)
4. **Select Winner:** Top-ranked candidate is designated `winner`.
5. **Generate Alternative Slots for Fallbacks:** Run `findAlternatives()` for each losing request to present immediate one-click reschedule options.
6. **Explanation Output:** Exposes explicit "claimed deadline" (or "faculty-verified deadline"), days in queue, and monthly usage count.

---

## 6. Gemini Integration Architecture

### Secure Server-Only Extraction
- **Package:** Official Google GenAI SDK (`@google/genai`).
- **Enforcement:** Placed in `src/lib/gemini.server.ts` with `import 'server-only'`. It is structurally impossible for client bundles to import the AI client or leak `GEMINI_API_KEY`.
- **Untrusted Output Policy:** AI output is strictly a client prefill suggestion. The user must review and edit all fields. Direct persistence of raw AI output is impossible because client submission calls Server Actions with standard Zod schema validation.

```typescript
// src/lib/gemini.server.ts
import 'server-only';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({});

export async function parseBookingPrompt(userPrompt: string, currentDate: string, timezone: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: userPrompt,
    config: {
      systemInstruction: `You are a campus lab booking assistant. Extract booking parameters relative to today's date (${currentDate}) in campus timezone (${timezone}). Return JSON matching the schema. If unclear, set to null.`,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          equipment_name: { type: Type.STRING },
          preferred_date: { type: Type.STRING, description: 'YYYY-MM-DD' },
          preferred_start_time: { type: Type.STRING, description: 'HH:MM' },
          preferred_end_time: { type: Type.STRING, description: 'HH:MM' },
          project_title: { type: Type.STRING },
          project_description: { type: Type.STRING },
          deadline: { type: Type.STRING, description: 'YYYY-MM-DD' },
        },
      },
    },
  });

  return response.text;
}
```

### Server-Side Validation, ID Resolution & Rate Limiting
1. **User Authentication Check:** `(SELECT auth.uid())` is required before invoking the Gemini action.
2. **Per-User Rate Limiting:** Enforces maximum 5 AI requests per minute per user.
3. **Length Bounding (Zod):**
   ```typescript
   export const GeminiBookingSchema = z.object({
     equipment_name: z.string().max(100).nullable(),
     preferred_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
     preferred_start_time: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
     preferred_end_time: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
     project_title: z.string().max(150).nullable(),
     project_description: z.string().max(2000).nullable(),
     deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
   });
   ```
4. **Catalogue Matching:** Server action matches extracted `equipment_name` against real equipment records in Supabase using exact and trigram matching, mapping it to a verified `equipment_id` UUID.
5. **Fallback Guarantee:** If Gemini fails, times out (5s abort controller), or returns non-conforming JSON, the system presents the standard manual booking form with zero disruption.

---

## 7. Secrets & Environment Variables

### Environment Variables
| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (Client & Server) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (Client & Server) | Supabase anonymous public key (enforces RLS) |
| `NEXT_PUBLIC_CAMPUS_TIMEZONE` | Public (Client & Server) | Campus timezone identifier (e.g. `Asia/Kolkata`) |
| `GEMINI_API_KEY` | Server-Only (`import 'server-only'`) | Google Gemini API Key |
| `TZ` | Server-Only | Node.js runtime timezone (`UTC`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Local Seed Only** | Strictly for `src/seed/seed.ts`. Never deployed to Vercel. |

---

## 8. Runtime & Development Dependencies

### Complete Dependency Manifest

```json
{
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.48.0",
    "@supabase/ssr": "^0.5.2",
    "@google/genai": "^0.1.2",
    "zod": "^3.24.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.0.1",
    "server-only": "^0.0.1"
  },
  "devDependencies": {
    "typescript": "^5.7.3",
    "@types/node": "^22.13.0",
    "@types/react": "^19.0.8",
    "@types/react-dom": "^19.0.3",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "postcss": "^8.5.1",
    "eslint": "^9.19.0",
    "eslint-config-next": "^16.0.0",
    "eslint-plugin-jsx-a11y": "^6.10.2",
    "vitest": "^3.0.4"
  }
}
```

### Dependency Justification
- `next`, `react`, `react-dom`: Modern React Server Components, Server Actions, App Router.
- `@supabase/supabase-js`, `@supabase/ssr`: Postgres connection, authentication, cookie-based session handling.
- `@google/genai`: Current official Google GenAI SDK for Gemini 2.5 Flash.
- `zod`: Strict runtime schema validation for forms and AI responses.
- `clsx`, `tailwind-merge`: Lean dynamic styling utilities (`cn()`).
- `server-only`: Build-time guard guaranteeing server secrets never leak into client bundles.
- `vitest`: Fast zero-config test runner for domain pure functions and scenarios.

---

## 9. Test Plan & Automated Verification

### CI/CD Isolation Policy
- **Automated CI (GitHub Actions):** Executes `tsc --noEmit`, ESLint (`eslint-plugin-jsx-a11y`), and Vitest pure domain unit tests only. Zero secrets or database credentials are required in CI.
- **Manual Integration Runs:** Database, RLS, and concurrency tests execute manually against a separate, free-tier Supabase staging project.

### 1. Pure Unit Tests (`src/domain/`)
- `constraints.test.ts`: Validates all 6 hard constraints individually and in combination.
- `scoring.test.ts`: Validates mathematical boundaries of urgency, wait time, and fairness formulas.
- `ranking.test.ts`: Verifies tie-breaking logic (score → submission time → UUID string order).
- `gemini/parse.test.ts`: Tests Zod bounds, invalid date rejections, and string stripping.

### 2. Scenario Test (`test/scenario/booking-lifecycle.test.ts`)
Vitest end-to-end flow test (mocking data client):
1. Ingests natural language prompt.
2. Formats untrusted prefill; validates with Zod.
3. Evaluates competing requests through `rankCompetingRequests`.
4. Asserts winner selection, explanation generation, and alternative slot calculation for fallbacks.

### 3. Database Exclusion & Concurrency Test (`test/integration/concurrency.test.ts`)
Run against staging Supabase instance:
```typescript
test('concurrent approval of overlapping slots triggers SQLSTATE 23P01', async () => {
  const reqA = await createTestBookingRequest(slot1);
  const reqB = await createTestBookingRequest(slot1_overlapping);

  // Trigger parallel approvals via authenticated faculty sessions
  const [resA, resB] = await Promise.all([
    facultyClientA.rpc('review_booking_request', { p_request_id: reqA.id, p_action: 'approved' }),
    facultyClientB.rpc('review_booking_request', { p_request_id: reqB.id, p_action: 'approved' }),
  ]);

  const outcomes = [resA.data.success, resB.data.success];
  expect(outcomes).toContain(true);
  expect(outcomes).toContain(false);

  // Exactly one booking in table
  const { data: bookings } = await anonClient.from('bookings').select('*');
  expect(bookings).toHaveLength(1);
});
```

---

## 10. Accessibility (a11y) Architecture

Compliant with **WCAG 2.1 Level AA**:
1. **Forms & Labels:** Every input has a linked `<label htmlFor="id">`. Helper and error messages link via `aria-describedby`.
2. **Keyboard Trapping & Esc:** Modals and dialogs trap keyboard focus and dismiss on `Escape`.
3. **Contrast:** Text contrast strictly exceeds 4.5:1; interactive borders exceed 3:1.
4. **Non-Colour Status:**
   - Approved: Green badge + Checkmark icon (`✓`) + "Approved" text
   - Rejected: Red badge + Cross icon (`✕`) + "Rejected" text
   - Pending: Amber badge + Clock icon (`⏳`) + "Pending" text
5. **Screen Readers & Focus:** Live announcements for AI extraction status via `<div role="status" aria-live="polite">`. Skip navigation link rendered as the first focusable element.

---

## 11. Seed Data Specifications

> Relative dates generated via `now() + INTERVAL '...'` to ensure seed data never goes stale.
> Demo accounts are student and faculty only. **No public admin account.**

### 1. Departments (3)
1. **Physics:** Science Block A, Floor 2 (`physics@campus.edu`)
2. **Chemistry:** Science Block B, Floor 1 (`chemistry@campus.edu`)
3. **Biomedical Engineering:** Engineering Block C, Floor 3 (`bme@campus.edu`)

### 2. Equipment Catalogue (12 items)
- **Physics:** X-Ray Diffractometer, Optical Spectrometer, Cryostat System, Laser Interferometer
- **Chemistry:** Gas Chromatograph, 400 MHz NMR Spectrometer, Rotary Evaporator, High-Temp Tube Furnace
- **Biomedical Eng.:** 3D Bioprinter, Flow Cytometer, Real-Time PCR System, Confocal Laser Microscope

### 3. Synthetic Demo Users (Documented in README)
| Email | Name | Role | Department |
|---|---|---|---|
| `faculty.physics@lablink.demo` | Dr. Priya Sharma | faculty | Physics |
| `faculty.chem@lablink.demo` | Dr. Ravi Kumar | faculty | Chemistry |
| `faculty.bme@lablink.demo` | Dr. Anita Desai | faculty | Biomedical Eng. |
| `student1@lablink.demo` | Arjun Patel | student | Physics |
| `student2@lablink.demo` | Meera Nair | student | Physics |
| `student3@lablink.demo` | Karthik Rao | student | Chemistry |
| `student4@lablink.demo` | Zara Khan | student | Biomedical Eng. |

*Password for all demo accounts:* `DemoPass!2026`

---

## 12. The 90-Second Pitch Demo Flow

```
 0:00  LANDING PAGE
       → Public equipment catalogue: search "diffractometer", inspect specs and requirements.

 0:15  NATURAL LANGUAGE BOOKING (Student 1: Arjun Patel)
       → Types: "Need X-Ray Diffractometer next Tuesday 14:00 to 17:00 for thin-film analysis, deadline in 2 days"
       → Server-side Gemini formats untrusted prefill; Arjun verifies and clicks Submit.

 0:35  THE CONFLICT: TWO STUDENTS, ONE SLOT
       → Student 2 (Meera Nair) has already requested the exact same Tuesday 14:00-17:00 slot.
       → Show Competing Queue view: both requests are pending for the same equipment.

 0:50  ALLOCATION ENGINE TRANSPARENCY
       → Faculty (Dr. Priya Sharma) opens Department Review Dashboard.
       → The pure domain engine ranks both requests at view-time:
         * Student 1 (Arjun):
           - Claimed Deadline: 2 days away -> Urgency Score = 1 - 2/14 = 0.857
           - Wait Time: Submitted 3 days ago -> Wait Score = 3/7 = 0.429
           - Past Usage: 2 hours this month -> Fairness Score = 1 - 2/20 = 0.900
           - Weighted Score = (0.35 * 0.857) + (0.35 * 0.429) + (0.30 * 0.900)
                            = 0.300 + 0.150 + 0.270 = 0.720 (72.0%)
         * Student 2 (Meera):
           - Claimed Deadline: 10 days away -> Urgency Score = 1 - 10/14 = 0.286
           - Wait Time: Submitted 1 day ago -> Wait Score = 1/7 = 0.143
           - Past Usage: 12 hours this month -> Fairness Score = 1 - 12/20 = 0.400
           - Weighted Score = (0.35 * 0.286) + (0.35 * 0.143) + (0.30 * 0.400)
                            = 0.100 + 0.050 + 0.120 = 0.270 (27.0%)
       → System displays mathematical explanation ranking Arjun #1 (Score 0.72) over Meera #2 (Score 0.27).

 1:05  ATOMIC APPROVAL & DOUBLE-BOOKING PREVENTION
       → Faculty clicks "Approve Winner" for Arjun.
       → Single transaction sets status to approved and commits to bookings table.
       → Demonstrates exclusion safety: Any concurrent attempt to confirm Meera's request
         in that window triggers Postgres exclusion violation (SQLSTATE 23P01).

 1:15  AUTOMATED CONFLICT RESOLUTION
       → System automatically provides Meera with 3 pre-calculated alternative feasible slots
         (e.g., Wednesday 10:00-13:00) with one-click rescheduling.

 1:25  SUMMARY & IMPACT
       → Zero secrets in client, zero cost (100% free tier), Postgres-guaranteed booking safety.
```

---

## 13. Risks, Limits & Cut List

### Production & Free-Tier Limits
| Service | Free Tier Boundary | Operational Mitigation |
|---|---|---|
| **Supabase Project Pausing** | Inactive projects pause after 7 days | Documented in README: ping project before demo run. |
| **Gemini API Rate Limits** | 15 RPM (verify in current Google AI documentation) | Strict 5 req/min per-user rate limit; form is 100% functional without AI. |
| **Vercel Hobby Serverless** | 10s execution limit (verify in current Vercel documentation) | AI request has a 5s client abort; all database operations execute in `< 100ms`. |
| **Storage / DB Size** | 500 MB Postgres limit | Text records and bounded logs consume `< 5 MB`. |

### Ordered Cut List (If time runs short during hackathon)
1. **Cut 1st:** Gemini natural language prefill (fall back directly to manual booking form).
2. **Cut 2nd:** Dynamic alternative slot finder (simply notify user that the requested slot is busy).
3. **Cut 3rd:** Faculty verification flag (`deadline_verified`).
4. **Cut 4th:** Audit log viewer page.
5. **NEVER CUT:** `btree_gist` exclusion constraint, RLS policies, atomic review RPC, and catalogue discovery.

---

## 14. Architecture Change Log

| Item # | Area | Section Touched | Summary of Specific Change |
|---|---|---|---|
| 1 | Security | § 2, § 4 | Forced `status='pending'` and null values on `booking_requests` INSERT; revoked direct student UPDATE. |
| 2 | Security | § 2, § 4 | Profiles restricted to authenticated SELECT; updates limited strictly to `full_name` via DB trigger. |
| 3 | Security | § 11 | Removed `admin@lablink.demo` and public admin passwords. Demo accounts are student and faculty only. |
| 4 | Security | § 1, § 4 | Removed webhook route; implemented DB trigger `handle_new_user()` on `auth.users` forcing `role='student'`. |
| 5 | Security | § 4 | Created `review_booking_request` and `cancel_booking_request` as `SECURITY DEFINER` RPCs handling SQLSTATE `23P01`. Service-role key removed from deployed app. |
| 6 | Security | § 2, § 4 | Added `chk_bounded_request_range` and `chk_bounded_booking_range`. Revoked UPDATE/DELETE on `audit_log`. Adopted `(SELECT auth.uid())` pattern. Dropped `ip_address`. |
| 7 | Functionality | § 1, § 5 | Implemented pure domain `rankCompetingRequests` with dynamic view-time scoring and deterministic tie-breaking. |
| 8 | Functionality | § 2, § 5 | Created `user_qualifications` table enabling verification of hard constraint H3 (`accessEligible`). |
| 9 | Functionality | § 4 | Implemented `get_equipment_busy_ranges` RPC returning anonymised time ranges. Blocked students reading other bookings. |
| 10 | Functionality | § 2, § 5 | Added `deadline_verified`, max 3 pending requests per student cap, "claimed deadline" explanations, and deterministic spec filtering. |
| 11 | Functionality | § 1, § 6 | Gemini prompt injects current date and campus timezone; JSON mode with Zod bounds; server-side ID matching; rate-limited. |
| 12 | Functionality | § 6, § 8 | Replaced deprecated `@google/generative-ai` with official `@google/genai` SDK using `gemini-2.5-flash`. |
| 13 | Pitch Flow | § 12 | Rewrote 90-second pitch with 2 competing requests for the same slot, showing exact mathematical score breakdowns. |
| 14 | Structure | § 1, § 6 | Added `src/queries/` layer for Server Component reads; isolated Gemini client with `import 'server-only'`. |
| 15 | Dependencies/Tests| § 8, § 9 | Complete dependency manifest; Vitest scenario test replaces Playwright; removed Temporal mention; pure CI tests. |
| 16 | Risks/Dates | § 11, § 13 | Seed data uses relative intervals; documented Supabase 7-day inactivity pause; marked 15 RPM and 10s limits as "verify in docs". |
