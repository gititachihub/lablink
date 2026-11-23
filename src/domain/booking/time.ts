/**
 * Campus time and UTC conversion helpers using pure Intl.DateTimeFormat (no external libraries).
 */
import { CAMPUS_TIMEZONE } from '@/lib/constants';

/**
 * Format a UTC Date into campus local date string: "YYYY-MM-DD"
 */
export function formatCampusDate(date: Date, timezone: string = CAMPUS_TIMEZONE): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Format a UTC Date into campus local time: "HH:MM" (24-hour)
 */
export function formatCampusTime(date: Date, timezone: string = CAMPUS_TIMEZONE): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(date);
}

/**
 * Check if a UTC time range is strictly within equipment lab hours on its campus calendar day.
 */
export function isWithinLabHours(
  start: Date,
  end: Date,
  labOpen: string,
  labClose: string,
  timezone: string = CAMPUS_TIMEZONE
): boolean {
  // If duration spans across different calendar days in campus time, it cannot be inside daily lab hours
  const startDate = formatCampusDate(start, timezone);
  const endDate = formatCampusDate(end, timezone);
  if (startDate !== endDate) {
    return false;
  }

  const startTimeStr = formatCampusTime(start, timezone);
  const endTimeStr = formatCampusTime(end, timezone);

  return startTimeStr >= labOpen && endTimeStr <= labClose && startTimeStr < endTimeStr;
}

/**
 * Difference in fractional hours between two dates.
 */
export function diffInHours(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

/**
 * Difference in fractional calendar days between two dates.
 */
export function diffInDays(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
}
