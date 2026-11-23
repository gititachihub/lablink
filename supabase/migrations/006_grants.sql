-- ============================================================
-- 006: Function Grants & Security Revocations
-- ============================================================

-- Revoke execute from PUBLIC and anon on all sensitive functions
REVOKE EXECUTE ON FUNCTION public.get_equipment_busy_ranges(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_equipment_busy_ranges(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_booking_request(UUID, TSTZRANGE, TEXT, TEXT, TIMESTAMPTZ, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_booking_request(UUID, TSTZRANGE, TEXT, TEXT, TIMESTAMPTZ, JSONB) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.review_booking_request(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_booking_request(UUID, TEXT, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cancel_booking_request(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking_request(UUID) TO authenticated;
