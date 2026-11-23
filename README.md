# LabLink — GenAI Campus Lab Resource-Sharing Platform

> **Live Production Deployment:** [https://lablink-seven-self.vercel.app](https://lablink-seven-self.vercel.app)  
> **Repository:** [https://github.com/gititachihub/lablink](https://github.com/gititachihub/lablink)  
> **100% Free Stack:** Next.js (App Router) + TypeScript Strict, Supabase (Postgres, Auth, RLS), Gemini Free API (`@google/genai`), Vercel Hobby / Cloud Run.

---

## 1. Problem Statement

University campuses possess millions of dollars in advanced analytical instruments (e.g. X-Ray Diffractometers, NMR Spectrometers, 3D Bioprinters, Confocal Microscopes) distributed across departments. However, students face severe bottlenecks:
- Equipment is siloed inside single faculties with opaque booking sheets.
- Manual approvals lead to queue hoarding, deadlocks, and double-bookings.
- High-stakes grant and thesis deadlines clash with casual usage.

**LabLink** resolves campus equipment scarcity by enabling cross-department instrument discovery, strict database-level booking guarantees, and an automated **transparent allocation engine** that ranks competing requests using mathematical fairness, waiting time, and project urgency.

---

## 2. Text Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        USER BROWSER / CLIENT                           │
│  • Accessible High-Contrast Dark UI (#09090b bg, #facc15 yellow accent) │
│  • Keyboard navigation, Skip link, prefers-reduced-motion respected    │
│  • Client-side untrusted prefill verification & review                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (Next.js SSR / Server Actions)
┌───────────────────────────────────▼────────────────────────────────────┐
│                    NEXT.JS APP ROUTER (VERCEL HOBBY)                   │
│                                                                        │
│   src/app/                    src/queries/        src/actions/         │
│   ├── / (Catalogue)           ├── equipment       ├── auth.actions     │
│   ├── /equipment/[id]         ├── booking         ├── booking.actions  │
│   ├── /dashboard/bookings     └── profile         └── approval.actions │
│   └── /dashboard/queue                                                 │
│                                                                        │
│   src/domain/ (PURE DOMAIN ENGINE - 100% deterministic, 0 I/O)         │
│   ├── constraints.ts   -> Hard Constraints (H1 - H7)                   │
│   ├── scoring.ts       -> 0.35*Urgency + 0.35*Wait + 0.30*Fairness     │
│   ├── explain.ts       -> Mathematical justification generation        │
│   ├── alternatives.ts  -> Free-slot & cross-department alternatives    │
│   └── ranking.ts       -> Deterministic conflict resolution queue      │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ Supabase Auth & Session Cookies │ Server-Side Only
┌──────────────────▼───────────────────┐    ┌────────▼───────────────────┐
│     SUPABASE (POSTGRESQL & RLS)      │    │    GOOGLE AI STUDIO        │
│                                      │    │    (GEMINI 2.5 FLASH)      │
│  • btree_gist Exclusion Constraint   │    │                            │
│    (EXCLUDE USING GIST)              │    │  • Structured JSON schema  │
│    -> double-booking impossible      │    │  • Untrusted prefill only  │
│  • Row-Level Security on all tables  │    │  • Zero DB direct access   │
│  • SECURITY DEFINER RPCs             │    └────────────────────────────┘
│  • pg_advisory_xact_lock on cap (3)  │
│  • Zero service-role key in app      │
└──────────────────────────────────────┘
```

---

## 3. Allocation Engine Specification

### Hard Constraints (H1 - H7)
A booking request must pass all seven hard constraints before receiving a soft score:
- **H1 (Operational):** Equipment must not be in maintenance (`is_operational = true`).
- **H2 (Free Slot):** Target time range does not overlap with an existing confirmed booking.
- **H3 (Access Eligibility):** Student must possess active qualifications required by the instrument.
- **H4 (Lab Hours):** Slot falls completely within campus lab operating hours (09:00 - 18:00 IST).
- **H5 (Max Duration):** Slot duration does not exceed the equipment's maximum limit.
- **H6 (Before Deadline):** Slot completion must precede the student's project deadline.
- **H7 (Category & Spec Match):** Required equipment category and parameters match the physical unit.

### Soft Scoring Formula
Competing feasible requests for the same slot are scored dynamically at view-time:

$$\text{FinalScore} = 0.35 \times \text{Urgency} + 0.35 \times \text{Wait} + 0.30 \times \text{PastFairness}$$

1. **Urgency Score (Weight: 0.35):**
   $$\text{Urgency} = \max\left(0, 1 - \frac{\text{daysUntilDeadline}}{14}\right)$$
2. **Wait Time Score (Weight: 0.35):**
   $$\text{Wait} = \min\left(1, \frac{\text{daysSinceSubmission}}{7}\right)$$
3. **Usage Fairness Score (Weight: 0.30):**
   $$\text{PastFairness} = \max\left(0, 1 - \frac{\text{studentHoursThisMonth}}{20}\right)$$

Deterministic tie-breaking: `Score (desc)` $\rightarrow$ `created_at (asc)` $\rightarrow$ `id (asc)`.

---

## 4. Security Model

1. **Postgres-Level Exclusion Constraint:**
   Confirmed bookings use PostgreSQL `btree_gist`:
   ```sql
   EXCLUDE USING GIST (equipment_id WITH =, time_range WITH &&)
   ```
   Overlapping approvals raise SQLSTATE `23P01`. Double-booking is physically impossible at the kernel level.
2. **Atomic RPCs & Transaction Locking:**
   All submissions and reviews execute inside `SECURITY DEFINER` functions with fixed `search_path = public, pg_temp`. Concurrent submissions by the same student take an advisory lock (`pg_advisory_xact_lock`), enforcing the 3-request pending cap without race conditions.
3. **Immutable Audit Trail:**
   All lifecycle events (`request.created`, `request.approved`, `request.rejected`, `request.cancelled`) append to `audit_log`. `UPDATE`, `DELETE`, and `TRUNCATE` privileges are revoked from all roles.
4. **Zero Service-Role Key in Production:**
   The deployed application uses only `NEXT_PUBLIC_SUPABASE_ANON_KEY` and user sessions. The service-role key is strictly isolated to local database seeds.
5. **Trigger-Guarded Role Elevation:**
   User registrations ignore metadata roles via trigger `handle_new_user()`, forcing `role = 'student'`. Column updates to `role`, `department_id`, and `email` are blocked by trigger `protect_profile_fields()`.

---

## 5. Synthetic Demo Accounts

All demo accounts share the password: **`DemoPass!2026`** (with 1-click auto-fill buttons on `/login`):

| Email | Name | Role | Department | Description |
|---|---|---|---|---|
| `student1@lablink.demo` | **Arjun Patel** | Student | Physics | Urgent thesis deadline (2 days away); low prior usage |
| `student2@lablink.demo` | **Meera Nair** | Student | Physics | Distant deadline (10 days away); high prior usage |
| `faculty.physics@lablink.demo` | **Dr. Priya Sharma** | Faculty | Physics | Reviews physics queue; resolves XRD conflict |
| `faculty.chem@lablink.demo` | **Dr. Ravi Kumar** | Faculty | Chemistry | Reviews chemistry queue |
| `faculty.bme@lablink.demo` | **Dr. Anita Desai** | Faculty | Biomedical Eng. | Reviews bioprinter & microscopy requests |

---

## 6. The 90-Second Pitch Demo Flow

1. **0:00 — Catalogue Discovery (`/`):**
   Search "diffractometer", filter by Physics. View specifications and operational status.
2. **0:20 — Student Submission (`/dashboard/bookings`):**
   Arjun Patel (`student1@lablink.demo`) requests the X-Ray Diffractometer for next Tuesday 14:00-17:00 IST.
3. **0:35 — The Conflict:**
   Meera Nair (`student2@lablink.demo`) has requested the exact same Tuesday 14:00-17:00 IST slot.
4. **0:50 — Allocation Engine Transparency (`/dashboard/queue`):**
   Faculty Dr. Priya Sharma views the Department Review Queue. The engine computes live view-time scores:
   - **Arjun Patel:** Score **72.0%** (Urgency: 85.7%, Wait: 42.9%, Fairness: 90.0%).
   - **Meera Nair:** Score **27.0%** (Urgency: 28.6%, Wait: 14.3%, Fairness: 40.0%).
   - Engine displays human-readable mathematical justification: *"Urgent deadline (2 days) + low prior usage (2h) prioritized."*
5. **1:15 — Atomic Approval & Exclusion Safety:**
   Faculty clicks **Approve** on Arjun. Booking is confirmed. If approval is attempted on Meera, the Postgres kernel exclusion constraint detects the slot overlap, rejects the double-booking, and recommends the earliest free alternative slots.

---

## 7. Accessibility & Performance

- **WCAG 2.1 AA/AAA Compliant:** Strict 4.5:1+ contrast ratio on dark theme (`#09090b` background with `#facc15` yellow and `#fafafa` typography).
- **Keyboard Navigation:** Skip-to-content link, accessible focus rings (`:focus-visible`), and semantic landmarks (`<header>`, `<main id="main-content">`, `<footer>`, `<nav>`).
- **Motion Sensitivity:** Respects `prefers-reduced-motion` across all UI elements.
- **Lean Runtime:** Zero heavy date libraries (`moment`, `date-fns`, `Temporal` eliminated in favor of native standard library `Intl.DateTimeFormat`).

---

## 8. Deployment Guides

### Vercel Hobby (Serverless)
1. Push repository to GitHub.
2. Import project into Vercel.
3. Configure Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY` (Optional server-side NL formatting)
   - `GEMINI_MODEL=gemini-2.5-flash`
4. Deploy!

### Google Cloud Run (Free Tier Container Alternative)
The repository includes a production multi-stage `Dockerfile`:
```bash
# Build container image
docker build -t lablink:latest .

# Deploy to Cloud Run (Free tier: 2M requests/month, 360,000 vCPU-seconds)
gcloud run deploy lablink \
  --image gcr.io/<PROJECT_ID>/lablink:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_SUPABASE_URL=...,NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```
