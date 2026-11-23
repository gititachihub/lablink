# LabLink — Architecture Document

> GenAI campus lab resource-sharing platform.
> Students discover specialised equipment across departments, book slots, submit
> project-based access requests, faculty approve, and the system resolves conflicts
> by recommending fair, feasible allocations using project deadlines, availability
> and student requirements.

**Stack (all free-tier):** Next.js 16 App Router · TypeScript strict · Supabase
(Postgres 15, Auth, RLS) · Gemini API (free tier, server-only) · Vercel Hobby.

---

## 1. Folder Structure

```
src/
├── domain/                     # ★ Pure functions — zero I/O, zero imports from Next/Supabase
│   ├── types.ts                #   Branded types, enums, interfaces for the entire domain
│   ├── allocation/
│   │   ├── constraints.ts      #   Hard-constraint filters (operational, free, eligible, lab-hours, deadline)
│   │   ├── scoring.ts          #   Weighted soft-score calculator
│   │   ├── engine.ts           #   Orchestrator: filter → score → rank → explain → alternatives
│   │   └── explain.ts          #   Human-readable explanation builder
│   ├── booking/
│   │   ├── validate.ts         #   Booking-request validation rules
│   │   └── time.ts             #   UTC ↔ campus-time helpers (pure; uses Intl, no library)
│   └── gemini/
│       ├── prompt.ts           #   Prompt template for structured extraction
│       └── parse.ts            #   Zod schema + post-parse normalisation (pure)
│
├── data/                       # Data-access layer — only file that imports Supabase client
│   ├── supabase/
│   │   ├── server.ts           #   createServerClient (cookies-based, for RSC / actions)
│   │   └── browser.ts          #   createBrowserClient (for client components, auth only)
│   ├── equipment.repo.ts       #   CRUD + search queries
│   ├── booking.repo.ts         #   Request + confirmed-booking queries
│   ├── profile.repo.ts         #   Profile queries
│   ├── department.repo.ts
│   └── audit.repo.ts           #   Append-only audit log writer
│
├── actions/                    # Next.js Server Actions — thin orchestration layer
│   ├── booking.actions.ts      #   submitRequest, cancelRequest
│   ├── approval.actions.ts     #   approveRequest, rejectRequest (faculty/admin)
│   ├── equipment.actions.ts    #   CRUD (admin)
│   ├── gemini.actions.ts       #   parseNaturalLanguageRequest
│   └── auth.actions.ts         #   signIn, signUp, signOut wrappers
│
├── app/                        # Next.js App Router — pages & layouts only
│   ├── layout.tsx              #   Root layout (html, body, providers, skip-link)
│   ├── page.tsx                #   Landing / public equipment catalogue
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx          #   Authenticated shell, role-based nav
│   │   ├── page.tsx            #   Role-aware dashboard home
│   │   ├── equipment/
│   │   │   ├── page.tsx        #   Browse & search
│   │   │   └── [id]/page.tsx   #   Detail + booking form
│   │   ├── bookings/
│   │   │   ├── page.tsx        #   My bookings (student) / department bookings (faculty)
│   │   │   └── [id]/page.tsx   #   Request detail + approval panel
│   │   └── admin/
│   │       ├── equipment/page.tsx
│   │       └── users/page.tsx
│   └── api/
│       └── webhooks/           #   Supabase auth webhook (profile creation)
│           └── route.ts
│
├── components/
│   ├── ui/                     #   Primitive accessible components (Button, Input, Dialog, etc.)
│   ├── equipment/              #   EquipmentCard, EquipmentGrid, EquipmentFilters
│   ├── booking/                #   BookingForm, BookingTimeline, BookingStatus
│   ├── allocation/             #   AllocationExplanation, AlternativeSlots
│   └── layout/                 #   Nav, Sidebar, SkipLink, Footer
│
├── lib/
│   ├── gemini.ts               #   GoogleGenerativeAI client init (server-only, reads env)
│   ├── validators.ts           #   Shared Zod schemas (re-exported from domain for actions)
│   ├── constants.ts            #   Campus timezone, lab-hour defaults, scoring weights
│   └── utils.ts                #   cn() helper, formatters
│
└── seed/                       #   Seed scripts (§ 11), never imported by app code
    ├── seed.ts
    └── data.ts
```

**Boundary rules enforced by import linting:**

| Layer | May import from |
|---|---|
| `domain/` | Only `domain/` (stdlib + `zod` for schemas) |
| `data/` | `domain/`, Supabase SDK |
| `actions/` | `domain/`, `data/`, `lib/` |
| `components/` | `domain/types`, `lib/`, other `components/` |
| `app/` | Everything except `data/` directly (goes through `actions/`) |

---

## 2. Database Schema

> All timestamps are `TIMESTAMPTZ` stored in **UTC**.
> Display uses `Intl.DateTimeFormat` with `Asia/Kolkata` (or configurable campus zone).

```sql
-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- exclusion constraint on tstzrange

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
-- profiles  (1-to-1 with auth.users, populated by trigger)
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
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
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
  project_title            TEXT NOT NULL,
  project_description      TEXT NOT NULL,
  deadline                 TIMESTAMPTZ NOT NULL,
  status                   TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','approved','rejected','cancelled')),
  reviewed_by              UUID REFERENCES profiles(id),
  review_note              TEXT,
  -- Gemini-parsed fields (nullable — form works without AI)
  ai_parsed_fields         JSONB,
  -- Allocation engine output
  allocation_score         NUMERIC(5,2),
  allocation_explanation   TEXT,
  alternative_slots        JSONB,       -- Array of {start, end, score}
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_br_student    ON booking_requests(student_id);
CREATE INDEX idx_br_equipment  ON booking_requests(equipment_id);
CREATE INDEX idx_br_status     ON booking_requests(status);
CREATE INDEX idx_br_time_range ON booking_requests USING GIST (time_range);

-- ============================================================
-- bookings  (confirmed only — the source of truth for schedule)
-- ============================================================
CREATE TABLE bookings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID NOT NULL UNIQUE REFERENCES booking_requests(id),
  student_id    UUID NOT NULL REFERENCES profiles(id),
  equipment_id  UUID NOT NULL REFERENCES equipment(id),
  time_range    TSTZRANGE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ★ EXCLUSION CONSTRAINT: impossible to INSERT overlapping approved bookings
  EXCLUDE USING GIST (equipment_id WITH =, time_range WITH &&)
);

CREATE INDEX idx_bookings_student   ON bookings(student_id);
CREATE INDEX idx_bookings_equipment ON bookings(equipment_id);
CREATE INDEX idx_bookings_range     ON bookings USING GIST (time_range);

-- ============================================================
-- audit_log  (append-only)
-- ============================================================
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID NOT NULL REFERENCES profiles(id),
  action      TEXT NOT NULL,          -- 'request.created', 'request.approved', etc.
  table_name  TEXT NOT NULL,
  record_id   UUID NOT NULL,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_actor  ON audit_log(actor_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_time   ON audit_log(created_at);
```

---

## 3. Booking Safety

### Database-Level Guarantee

```sql
EXCLUDE USING GIST (equipment_id WITH =, time_range WITH &&)
```

This constraint on the `bookings` table makes it **physically impossible** to insert
two rows whose `equipment_id` matches and whose `time_range` values overlap. Any
concurrent `INSERT` that would create an overlap receives a unique-violation error.

### Flow

```
Student submits request
  → booking_requests row (status = 'pending')
  → allocation engine scores the request
  → NO row in bookings yet — pending requests never block a slot

Faculty approves
  → Server action: BEGIN transaction
      1. UPDATE booking_requests SET status = 'approved'
      2. INSERT INTO bookings (...) — exclusion constraint checked here
      COMMIT
  → If constraint violation → transaction rolls back,
    action returns "slot no longer available" + fresh alternatives
```

### Time Handling

| Concern | Approach |
|---|---|
| Storage | All `TIMESTAMPTZ` columns store UTC |
| Server | Node.js runtime uses UTC (`TZ=UTC` in env) |
| Display | `Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata' })` |
| Input | UI date-time picker labelled "Campus Time (IST)" → converted to UTC before sending |
| DST safety | India does not observe DST; architecture supports arbitrary IANA zones if needed |

---

## 4. Roles & Row-Level Security

### Roles

| Role | Capabilities |
|---|---|
| `student` | Browse equipment, submit booking requests, view own requests/bookings, cancel own pending requests |
| `faculty` | Everything a student can do + approve/reject requests for their department's equipment |
| `admin` | Everything + manage equipment, manage departments, view audit log, view all users |

### RLS Policies

> `auth.uid()` returns the current user's ID.
> Helper: `get_my_role()` and `get_my_department_id()` are `SECURITY DEFINER`
> SQL functions that query `profiles` once per statement.

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ── Helper functions ──────────────────────────────────────
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_department_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT department_id FROM profiles WHERE id = auth.uid();
$$;

-- ── profiles ──────────────────────────────────────────────
-- Anyone authenticated can read basic profile info (name, department)
CREATE POLICY profiles_select ON profiles FOR SELECT
  USING (true);

-- Users can update their own row EXCEPT the role column
-- (role changes are admin-only via a dedicated admin action that
--  uses the service_role key, bypassing RLS)
CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- Insert handled by auth trigger (service_role), not user-facing
-- Delete: not permitted via API

-- ── equipment ─────────────────────────────────────────────
-- Public read: anyone (even anon) can browse the catalogue
CREATE POLICY equipment_select ON equipment FOR SELECT
  USING (true);

-- Insert / Update / Delete: admin or faculty of that department
CREATE POLICY equipment_mutate ON equipment FOR ALL
  USING (
    get_my_role() = 'admin'
    OR (get_my_role() = 'faculty' AND department_id = get_my_department_id())
  )
  WITH CHECK (
    get_my_role() = 'admin'
    OR (get_my_role() = 'faculty' AND department_id = get_my_department_id())
  );

-- ── access_requirements ───────────────────────────────────
-- Readable by all (students need to know what's required)
CREATE POLICY access_req_select ON access_requirements FOR SELECT
  USING (true);

-- Mutable by admin / owning-department faculty
CREATE POLICY access_req_mutate ON access_requirements FOR ALL
  USING (
    get_my_role() = 'admin'
    OR (get_my_role() = 'faculty'
        AND (SELECT department_id FROM equipment WHERE id = equipment_id)
            = get_my_department_id())
  );

-- ── booking_requests ──────────────────────────────────────
-- Students see only their own; faculty see their department's; admin sees all
CREATE POLICY br_select ON booking_requests FOR SELECT
  USING (
    student_id = auth.uid()
    OR (get_my_role() = 'faculty'
        AND (SELECT department_id FROM equipment WHERE id = equipment_id)
            = get_my_department_id())
    OR get_my_role() = 'admin'
  );

-- Only students can insert, and only as themselves
CREATE POLICY br_insert ON booking_requests FOR INSERT
  WITH CHECK (
    get_my_role() = 'student'
    AND student_id = auth.uid()
  );

-- Students can cancel own pending; faculty can approve/reject their dept's
CREATE POLICY br_update ON booking_requests FOR UPDATE
  USING (
    (student_id = auth.uid() AND status = 'pending')
    OR (get_my_role() = 'faculty'
        AND (SELECT department_id FROM equipment WHERE id = equipment_id)
            = get_my_department_id())
    OR get_my_role() = 'admin'
  );

-- ── bookings ──────────────────────────────────────────────
-- Same visibility as booking_requests
CREATE POLICY bookings_select ON bookings FOR SELECT
  USING (
    student_id = auth.uid()
    OR (get_my_role() = 'faculty'
        AND (SELECT department_id FROM equipment WHERE id = equipment_id)
            = get_my_department_id())
    OR get_my_role() = 'admin'
  );

-- Insert only via server action (service_role); no direct user inserts
-- Update/Delete: admin only via service_role

-- ── audit_log ─────────────────────────────────────────────
-- Read: admin only
CREATE POLICY audit_select ON audit_log FOR SELECT
  USING (get_my_role() = 'admin');

-- Write: via service_role in server actions; no direct user writes
```

### Role Escalation Prevention

- The `profiles_update` policy's `WITH CHECK` clause compares the incoming `role`
  against the existing `role`, ensuring users **cannot change their own role**.
- Role changes are performed exclusively by admin server actions using the
  `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS.
- The `service_role` key is **never** exposed to the client.

---

## 5. Allocation Engine Specification

> Location: `src/domain/allocation/`.  All functions are **pure** — they accept
> data as arguments and return results with no side effects or I/O.

### Input

```typescript
interface AllocationInput {
  request: BookingRequest;              // the candidate request
  equipment: Equipment;                 // target equipment with lab hours
  accessRequirements: AccessRequirement[];
  existingBookings: Booking[];          // confirmed bookings for this equipment
  pendingRequests: BookingRequest[];     // other pending requests (for fairness)
  studentHistory: Booking[];            // requester's past bookings (for fairness)
  now: Date;                            // injected clock for testability
}
```

### Step 1 — Hard Constraints (pass / fail)

Each constraint is a pure function `(input) => ConstraintResult` where
`ConstraintResult = { pass: boolean; reason: string }`.

| # | Constraint | Fails when |
|---|---|---|
| H1 | `equipmentOperational` | `equipment.is_operational === false` |
| H2 | `slotFree` | `time_range` overlaps any entry in `existingBookings` |
| H3 | `accessEligible` | Student lacks a required training/certification/membership |
| H4 | `withinLabHours` | Requested time falls outside `lab_open`–`lab_close` |
| H5 | `fitsMaxDuration` | Duration exceeds `equipment.max_booking_hours` |
| H6 | `feasibleBeforeDeadline` | Requested slot starts after `request.deadline` |

If **any** hard constraint fails, the request is **infeasible** for this slot.
The engine skips scoring and proceeds directly to alternative-slot generation.

### Step 2 — Weighted Soft Score

All sub-scores are normalised to `[0, 1]`. Weights are defined in
`src/lib/constants.ts` and sum to `1.0`.

| Factor | Weight | Score formula |
|---|---|---|
| **Urgency** | 0.30 | `1 − clamp(daysUntilDeadline / 14, 0, 1)` — closer deadline → higher |
| **Waiting time** | 0.25 | `clamp(daysSinceSubmission / 7, 0, 1)` — longer wait → higher |
| **Past-usage fairness** | 0.25 | `1 − clamp(studentHoursThisMonth / maxHoursPerStudent, 0, 1)` — less past usage → higher |
| **Equipment fit** | 0.20 | `1.0` if specs match request keywords exactly, `0.5` partial, `0.0` mismatch |

```
finalScore = Σ (weight_i × score_i)   // range [0, 1]
```

### Step 3 — Explanation

`buildExplanation(scores, weights) → string`

Produces a human-readable paragraph, e.g.:

> "Score 0.74 — High urgency (deadline in 3 days, +0.27), moderate wait (submitted
> 2 days ago, +0.18), low past usage this month (2 h, +0.21), good equipment fit
> (+0.08). Recommended for approval."

### Step 4 — Alternative Slots (when infeasible or low-scoring)

`findAlternatives(equipment, existingBookings, constraints, windowDays = 7) → Slot[]`

- Scans the next `windowDays` calendar days in `lab_open`–`lab_close` windows.
- Divides each day into 1-hour candidate slots.
- Filters each through the hard constraints.
- Returns up to 5 slots sorted by proximity to the originally requested time.

### Engine Orchestration

```typescript
function evaluateRequest(input: AllocationInput): AllocationResult {
  const hardResults = runHardConstraints(input);
  if (hardResults.some(r => !r.pass)) {
    return {
      feasible: false,
      failedConstraints: hardResults.filter(r => !r.pass),
      alternatives: findAlternatives(...),
    };
  }
  const { score, breakdown } = computeScore(input);
  return {
    feasible: true,
    score,
    breakdown,
    explanation: buildExplanation(breakdown),
    alternatives: score < 0.3 ? findAlternatives(...) : [],
  };
}
```

---

## 6. Gemini Usage

### Architecture

```
User types free-text request
  → Client component sends text via Server Action
  → Server Action calls Gemini API (server-only, using GEMINI_API_KEY)
  → Response validated against Zod schema
  → Parsed fields returned to client
  → User reviews, edits, and confirms in a structured form
  → Confirmed data submitted as a normal booking request
```

### Prompt Design

```typescript
// src/domain/gemini/prompt.ts
const SYSTEM_PROMPT = `You are a lab booking assistant. Extract structured booking
details from a student's natural-language request. Return ONLY valid JSON matching
this schema — no markdown, no explanation:

{
  "equipment_name": string,
  "preferred_date": "YYYY-MM-DD",
  "preferred_start_time": "HH:MM",
  "preferred_end_time": "HH:MM",
  "project_title": string,
  "project_description": string,
  "deadline": "YYYY-MM-DD",
  "special_requirements": string | null
}

If a field cannot be determined, set it to null.`;
```

### Validation (Zod)

```typescript
// src/domain/gemini/parse.ts
import { z } from 'zod';

export const GeminiBookingSchema = z.object({
  equipment_name:       z.string().nullable(),
  preferred_date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  preferred_start_time: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  preferred_end_time:   z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  project_title:        z.string().nullable(),
  project_description:  z.string().nullable(),
  deadline:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  special_requirements: z.string().nullable(),
});

export function parseGeminiResponse(raw: string): ParseResult {
  const json = JSON.parse(raw);           // may throw
  return GeminiBookingSchema.safeParse(json);  // { success, data?, error? }
}
```

### Graceful Degradation

| Scenario | Behaviour |
|---|---|
| Gemini returns valid JSON | Pre-fill form fields; user edits and confirms |
| Gemini returns invalid JSON | Log warning; show empty form with message "AI couldn't parse your request — please fill in the details manually" |
| Gemini API timeout / rate limit | Catch error; show empty form with same manual-entry message |
| Gemini API key missing | AI button hidden; only the manual form is rendered |
| `GEMINI_API_KEY` env var unset | `lib/gemini.ts` exports `null`; action skips AI call |

**The structured booking form is always the primary UI.** The AI parse is a
convenience layer on top; the form is fully functional without it.

---

## 7. Secrets & Environment Variables

### `.env.local` (never committed — listed in `.gitignore`)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...          # safe for client (RLS enforced)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...               # ⚠ SERVER-ONLY — bypasses RLS

# Gemini
GEMINI_API_KEY=AIza...                              # ⚠ SERVER-ONLY

# App
NEXT_PUBLIC_CAMPUS_TIMEZONE=Asia/Kolkata            # safe for client
TZ=UTC                                              # Node.js runtime timezone
```

### Enforcement Rules

| Variable prefix | Where it's readable | Enforcement |
|---|---|---|
| `NEXT_PUBLIC_*` | Client + Server | Next.js built-in: only `NEXT_PUBLIC_` vars are bundled into client JS |
| No prefix | Server only | Never appears in client bundle; accessed only in Server Actions, Route Handlers, `server.ts` |

- `SUPABASE_SERVICE_ROLE_KEY` is used **only** in server actions that need to
  bypass RLS (role changes, booking confirmations, audit writes).
- `GEMINI_API_KEY` is used **only** in `src/lib/gemini.ts`, which is imported
  **only** by server actions.
- `.env.example` in the repo contains variable **names** with placeholder values.

---

## 8. Runtime Dependencies

| Package | Justification |
|---|---|
| `next` | App Router framework, SSR, Server Actions, API routes |
| `react`, `react-dom` | UI rendering (peer deps of Next.js) |
| `typescript` | Strict type checking (devDep) |
| `@supabase/supabase-js` | Supabase client for Postgres queries and Auth |
| `@supabase/ssr` | Cookie-based Supabase auth for server components and middleware |
| `@google/generative-ai` | Official Gemini API SDK (server-only, tree-shaken) |
| `zod` | Runtime schema validation for Gemini output and form inputs |
| `tailwindcss` | Utility-first CSS; no runtime JS, purged in production (devDep) |
| `eslint`, `eslint-config-next` | Linting including a11y rules (devDep) |

**Not included (and why):**

| Omitted | Reason |
|---|---|
| `date-fns` / `dayjs` / `moment` | `Intl.DateTimeFormat` + `Temporal` (or simple UTC math) covers all needs |
| `axios` | `fetch` is built into Next.js with caching |
| `prisma` / `drizzle` | Supabase JS client is sufficient; avoids ORM overhead |
| `next-auth` | Supabase Auth handles everything including RLS integration |
| `shadcn/ui` or component library | Custom accessible primitives keep the bundle lean |
| `@tanstack/react-query` | Server Components + Server Actions eliminate most client fetching |

---

## 9. Test Plan

### Mapping to Evaluation Criteria

| Criterion | Test type | What is tested |
|---|---|---|
| **Code quality** | Static analysis | `tsc --noEmit` strict mode; ESLint with `eslint-config-next` |
| **Security** | Unit + integration | RLS policy tests via Supabase client impersonation; role escalation attempts; env var leak check in client bundle |
| **Efficiency** | Unit | Allocation engine benchmarks on large input sets; bundle size check (`next build` output < 200 KB first-load JS) |
| **Testing** | All | Coverage target ≥ 80% on `domain/`; integration tests for critical paths |
| **Accessibility** | Automated + manual | `eslint-plugin-jsx-a11y`; Axe-core integration test on key pages |
| **Problem alignment** | E2E | Full booking lifecycle scenario test |

### Test Suites

#### 1. Domain Unit Tests (`domain/`)

```
allocation/constraints.test.ts
  ✓ rejects non-operational equipment
  ✓ rejects overlapping slot
  ✓ rejects ineligible student
  ✓ rejects outside lab hours
  ✓ rejects exceeding max duration
  ✓ rejects past-deadline request

allocation/scoring.test.ts
  ✓ urgency score increases as deadline approaches
  ✓ waiting-time score increases with days since submission
  ✓ fairness score penalises heavy past users
  ✓ final score is weighted sum in [0, 1]

allocation/engine.test.ts
  ✓ feasible request returns score + explanation
  ✓ infeasible request returns failed constraints + alternatives
  ✓ alternatives are within lab hours and non-overlapping

gemini/parse.test.ts
  ✓ valid JSON passes Zod schema
  ✓ missing fields parsed as null
  ✓ malformed JSON returns safeParse failure
  ✓ extra fields are stripped

booking/validate.test.ts
  ✓ rejects end before start
  ✓ rejects past dates
  ✓ rejects zero-length range
```

#### 2. Data Integration Tests (`data/`)

```
booking.repo.test.ts
  ✓ creating overlapping bookings throws exclusion-constraint error
  ✓ non-overlapping bookings succeed
  ✓ pending requests do not block new bookings
```

#### 3. Concurrency / Double-Booking Test ⚠️

```
booking.concurrent.test.ts
  ✓ Two simultaneous approve actions for the same slot:
    - Launch two parallel transactions that each attempt to INSERT
      into bookings with the same equipment_id and overlapping time_range
    - Assert: exactly ONE succeeds, the other receives a constraint violation
    - Assert: the failed action returns alternative slots
    - Assert: bookings table contains exactly one row for that slot
```

**Implementation:** Use `Promise.all` with two Supabase service-role clients
executing the approve flow concurrently against a test database.

#### 4. RLS Policy Tests

```
rls.test.ts
  ✓ student cannot read another student's booking requests
  ✓ student cannot update their own role
  ✓ faculty cannot approve requests outside their department
  ✓ anon user can read equipment but not booking_requests
  ✓ admin can read audit_log; student and faculty cannot
```

#### 5. Accessibility Tests

```
a11y.test.ts
  ✓ Landing page passes Axe-core (zero violations)
  ✓ Booking form has associated labels for every input
  ✓ All interactive elements are keyboard-reachable (Tab order)
  ✓ Focus is trapped inside modal dialogs
  ✓ Error messages are linked via aria-describedby
```

#### 6. E2E Scenario Test

```
booking-lifecycle.e2e.ts
  1. Student signs up → profile created with role 'student'
  2. Student browses equipment catalogue
  3. Student types natural-language request → AI parses (or fallback)
  4. Student reviews, edits, submits booking request
  5. Faculty signs in → sees request in dashboard
  6. Allocation engine scores request → explanation shown
  7. Faculty approves → booking confirmed
  8. Student sees confirmed booking in "My Bookings"
  9. Audit log contains all actions
```

---

## 10. Accessibility Plan

### Standards

Target **WCAG 2.1 Level AA** compliance.

### Implementation Checklist

| Area | Approach |
|---|---|
| **Labels** | Every `<input>`, `<select>`, `<textarea>` has an explicit `<label htmlFor>`. Visually-hidden labels where design requires icon-only inputs. |
| **Keyboard navigation** | All interactive elements reachable via Tab. Logical tab order follows visual layout. No keyboard traps. `Escape` closes modals and dropdowns. |
| **Focus management** | Visible focus ring on all interactive elements (`:focus-visible` with high-contrast outline). Focus moved programmatically to relevant content after route changes and modal opens. |
| **Skip link** | "Skip to main content" link as first focusable element in layout. |
| **Contrast** | Text contrast ≥ 4.5:1 (normal), ≥ 3:1 (large). UI controls ≥ 3:1 against background. Verified with Tailwind's colour palette. |
| **Not colour-only** | Status indicators use **icon + text + colour** (e.g., ✓ Approved / ✗ Rejected / ⏳ Pending). Charts use patterns in addition to colours. |
| **Error handling** | Inline error messages linked to fields via `aria-describedby`. Error summary at top of form with links to offending fields. Live region (`aria-live="polite"`) for async status updates. |
| **Images** | All `<img>` tags have descriptive `alt` text. Decorative images use `alt=""` and `aria-hidden="true"`. |
| **Semantic HTML** | `<nav>`, `<main>`, `<header>`, `<footer>`, `<section>` with `aria-label` where multiple landmarks exist. Headings form a logical `h1` → `h2` → `h3` hierarchy per page. |
| **Tables** | Booking schedules use `<table>` with `<caption>`, `<thead>`, `scope` attributes. |
| **Motion** | Respect `prefers-reduced-motion`. Disable animations when set. |
| **Testing** | `eslint-plugin-jsx-a11y` in CI. Axe-core automated checks. Manual keyboard-only walkthrough before submission. |

---

## 11. Seed Data

> All seed data is in `src/seed/data.ts`, clearly prefixed with `[DEMO]` or
> marked with `is_seed: true` metadata. The seed script (`src/seed/seed.ts`)
> uses the `SUPABASE_SERVICE_ROLE_KEY` and is **never** run in production.

### Departments (3)

| Name | Building | Floor |
|---|---|---|
| Physics | Science Block A | 2 |
| Chemistry | Science Block B | 1 |
| Biomedical Engineering | Engineering Block C | 3 |

### Equipment (12)

| # | Name | Department | Category |
|---|---|---|---|
| 1 | X-Ray Diffractometer | Physics | Crystallography |
| 2 | Optical Spectrometer | Physics | Spectroscopy |
| 3 | Cryostat System | Physics | Low Temperature |
| 4 | Laser Interferometer | Physics | Optics |
| 5 | Gas Chromatograph | Chemistry | Analytical |
| 6 | NMR Spectrometer | Chemistry | Spectroscopy |
| 7 | Rotary Evaporator | Chemistry | Synthesis |
| 8 | Fume Hood Station | Chemistry | Safety |
| 9 | 3D Bioprinter | Biomedical Eng. | Fabrication |
| 10 | Flow Cytometer | Biomedical Eng. | Cell Analysis |
| 11 | PCR Thermal Cycler | Biomedical Eng. | Molecular Biology |
| 12 | Confocal Microscope | Biomedical Eng. | Imaging |

Each equipment entry includes realistic `specifications` JSON, `lab_open`/`lab_close`
times, `max_booking_hours`, and associated `access_requirements`.

### Synthetic Users

| Email | Name | Role | Department |
|---|---|---|---|
| `admin@lablink.demo` | Demo Admin | admin | Physics |
| `faculty.physics@lablink.demo` | Dr. Priya Sharma | faculty | Physics |
| `faculty.chem@lablink.demo` | Dr. Ravi Kumar | faculty | Chemistry |
| `faculty.bme@lablink.demo` | Dr. Anita Desai | faculty | Biomedical Eng. |
| `student1@lablink.demo` | Arjun Patel | student | Physics |
| `student2@lablink.demo` | Meera Nair | student | Chemistry |
| `student3@lablink.demo` | Karthik Rao | student | Biomedical Eng. |
| `student4@lablink.demo` | Zara Khan | student | Physics |

All demo users use the password `LabLink-Demo-2024!` (documented in seed script,
not in production env).

### Pre-Seeded Booking Requests

- 3 approved bookings (one per department) with confirmed `bookings` rows
- 2 pending requests (to demonstrate the approval flow and allocation scoring)
- 1 rejected request (to show the rejected state with review notes)

---

## 12. The 90-Second Pitch Flow

> This is the demo scenario the app must support end-to-end, timed to run in
> ≤ 90 seconds with pre-seeded data.

```
 0:00  LANDING PAGE
       → Show the public equipment catalogue.
       → "Any student on campus can discover specialised equipment across
          every department."

 0:15  STUDENT SIGNS IN  (pre-seeded student1@lablink.demo)
       → Dashboard shows their bookings and requests.

 0:20  NATURAL-LANGUAGE BOOKING
       → Student types: "I need the X-Ray Diffractometer next Tuesday 2-5pm
         for my crystal structure project, deadline is Dec 15"
       → Gemini parses → structured form pre-filled.
       → Student reviews, tweaks end-time, confirms.

 0:40  ALLOCATION ENGINE SCORES
       → Show the score breakdown and explanation:
         "Score 0.82 — High urgency (deadline in 22 days), first-time user
          this month, good equipment fit."

 0:50  FACULTY SIGNS IN  (pre-seeded faculty.physics@lablink.demo)
       → Department dashboard shows pending requests with scores.
       → Faculty sees allocation recommendation.

 1:00  FACULTY APPROVES
       → Booking confirmed. Student's calendar updated.
       → Demonstrate: attempting a conflicting booking → exclusion constraint
         blocks it → system suggests alternative slots.

 1:15  CONFLICT RESOLUTION
       → Show alternative-slot suggestions with scores.
       → "The system fairly balances deadlines, wait times, and past usage
          across all students."

 1:25  WRAP-UP
       → Show audit log (admin view).
       → Mention: RLS, accessibility, TypeScript strict, free-tier stack.
       → "LabLink makes specialised equipment accessible to every student,
          fairly and transparently."

 1:30  END
```

---

## Risks & What to Cut First

### Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Gemini free-tier rate limit (15 RPM) | High | Low | AI is optional; manual form always works. Cache recent parses. |
| Supabase free-tier limits (500 MB, 50K MAU) | Low | Medium | Seed data is small; hackathon demo won't hit limits. |
| Vercel Hobby serverless timeout (10s) | Medium | Medium | Allocation engine is pure CPU (< 50ms); Gemini call has 5s timeout with fallback. |
| `btree_gist` not available | Very Low | High | Supabase supports it; verified in docs. Fallback: application-level locking (worse). |
| Time pressure | High | High | Cut list below. |

### Cut List (in order — cut from bottom up)

| Priority | Feature | Why it's safe to cut |
|---|---|---|
| Cut last | Exclusion constraint + booking flow | Core differentiator; must ship |
| Cut last | Equipment catalogue + RLS | Core requirement; must ship |
| Cut 5th | Audit log | Nice-to-have; add if time allows |
| Cut 4th | Equipment-fit sub-score in allocation | Simplify to 3-factor scoring |
| Cut 3rd | Alternative-slot suggestions | Return "slot unavailable" without suggestions |
| Cut 2nd | Natural-language Gemini parsing | Manual form is the primary UI anyway |
| Cut 1st | Admin user-management UI | Manage roles via Supabase dashboard |
