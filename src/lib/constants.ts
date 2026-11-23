/**
 * Canonical platform constants for LabLink.
 */

export const CAMPUS_TIMEZONE = 'Asia/Kolkata' as const;

export const MAX_PENDING_REQUESTS_PER_STUDENT = 3 as const;

export const SCORING_WEIGHTS = {
  urgency: 0.35,
  wait: 0.35,
  fairness: 0.30,
} as const;

export const LAB_HOURS_DEFAULT = {
  open: '09:00',
  close: '18:00',
} as const;

export const MAX_HOURS_PER_STUDENT_PER_MONTH = 20 as const;
