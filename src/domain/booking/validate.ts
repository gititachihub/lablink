/**
 * Pure booking validation helpers.
 */
import { TimeRange } from '../types';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateTimeRange(range: TimeRange, maxHours: number = 12): ValidationResult {
  if (!range.start || !range.end) {
    return { valid: false, error: 'Start and end times are required.' };
  }

  const startTime = range.start.getTime();
  const endTime = range.end.getTime();

  if (isNaN(startTime) || isNaN(endTime)) {
    return { valid: false, error: 'Invalid date values provided.' };
  }

  if (endTime <= startTime) {
    return { valid: false, error: 'End time must be strictly after start time.' };
  }

  const durationHours = (endTime - startTime) / (1000 * 60 * 60);
  if (durationHours > maxHours) {
    return {
      valid: false,
      error: `Booking duration (${durationHours}h) exceeds the maximum allowed limit of ${maxHours}h.`,
    };
  }

  return { valid: true };
}
