import { describe, it, expect } from 'vitest';
import { validateTimeRange } from './validate';

describe('Booking Time Range Validation', () => {
  it('rejects missing start or end dates', () => {
    // @ts-expect-error test invalid input
    const res = validateTimeRange({ start: null, end: new Date() });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('required');
  });

  it('rejects invalid NaN date values', () => {
    const res = validateTimeRange({
      start: new Date('invalid-date'),
      end: new Date(),
    });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Invalid date');
  });

  it('rejects end time before start time', () => {
    const res = validateTimeRange({
      start: new Date('2026-11-24T10:00:00Z'),
      end: new Date('2026-11-24T09:00:00Z'),
    });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('strictly after');
  });

  it('rejects zero duration range', () => {
    const now = new Date('2026-11-24T10:00:00Z');
    const res = validateTimeRange({ start: now, end: now });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('strictly after');
  });

  it('rejects duration exceeding maxHours limit', () => {
    const res = validateTimeRange(
      {
        start: new Date('2026-11-24T10:00:00Z'),
        end: new Date('2026-11-24T16:00:00Z'), // 6h
      },
      4 // max 4h
    );
    expect(res.valid).toBe(false);
    expect(res.error).toContain('exceeds the maximum allowed');
  });

  it('accepts valid time range within duration limits', () => {
    const res = validateTimeRange(
      {
        start: new Date('2026-11-24T10:00:00Z'),
        end: new Date('2026-11-24T13:00:00Z'), // 3h
      },
      4
    );
    expect(res.valid).toBe(true);
    expect(res.error).toBeUndefined();
  });
});
