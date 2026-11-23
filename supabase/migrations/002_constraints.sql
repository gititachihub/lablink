-- ============================================================
-- 002: Integrity Constraints & Exclusion Safety
-- ============================================================

-- Bounded check on user_qualifications
ALTER TABLE public.user_qualifications
  ADD CONSTRAINT chk_qualification_dates CHECK (expires_at IS NULL OR expires_at > verified_at);

-- Lab hours constraint
ALTER TABLE public.equipment
  ADD CONSTRAINT chk_lab_hours CHECK (lab_close > lab_open);

-- Strict finite bounded range check on booking_requests
ALTER TABLE public.booking_requests
  ADD CONSTRAINT chk_bounded_request_range CHECK (
    NOT isempty(time_range) AND
    lower_inc(time_range) AND
    NOT upper_inc(time_range) AND
    lower(time_range) IS NOT NULL AND
    upper(time_range) IS NOT NULL AND
    upper(time_range) > lower(time_range)
  );

-- Strict finite bounded range check on bookings
ALTER TABLE public.bookings
  ADD CONSTRAINT chk_bounded_booking_range CHECK (
    NOT isempty(time_range) AND
    lower_inc(time_range) AND
    NOT upper_inc(time_range) AND
    lower(time_range) IS NOT NULL AND
    upper(time_range) IS NOT NULL AND
    upper(time_range) > lower(time_range)
  );

-- ★ EXCLUSION CONSTRAINT: overlap physically impossible at Postgres kernel level
ALTER TABLE public.bookings
  ADD CONSTRAINT exclude_overlapping_bookings
  EXCLUDE USING GIST (equipment_id WITH =, time_range WITH &&);

-- Immutability: Revoke UPDATE and DELETE on audit_log
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_log FROM PUBLIC, authenticated, anon;
