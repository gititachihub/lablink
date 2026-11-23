import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const SubmitBookingSchema = z.object({
  equipmentId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  projectTitle: z.string().min(3).max(150),
  projectDescription: z.string().min(10).max(2000),
  deadline: z.string().datetime(),
});

const ReviewRequestSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(['approved', 'rejected']),
  note: z.string().max(1000).optional(),
});

describe('Action Input Schemas', () => {
  it('validates a valid booking request submission', () => {
    const valid = {
      equipmentId: '123e4567-e89b-12d3-a456-426614174000',
      startTime: '2026-12-01T10:00:00Z',
      endTime: '2026-12-01T12:00:00Z',
      projectTitle: 'XRD Analysis on Perovskites',
      projectDescription: 'Interfacial strain and lattice parameter measurements',
      deadline: '2026-12-03T18:00:00Z',
    };
    const res = SubmitBookingSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it('rejects short project titles and descriptions', () => {
    const invalid = {
      equipmentId: '123e4567-e89b-12d3-a456-426614174000',
      startTime: '2026-12-01T10:00:00Z',
      endTime: '2026-12-01T12:00:00Z',
      projectTitle: 'X',
      projectDescription: 'Short',
      deadline: '2026-12-03T18:00:00Z',
    };
    const res = SubmitBookingSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it('validates faculty review action', () => {
    const valid = {
      requestId: '123e4567-e89b-12d3-a456-426614174000',
      action: 'approved' as const,
      note: 'Approved for urgent deadline',
    };
    const res = ReviewRequestSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it('rejects invalid review action types', () => {
    const invalid = {
      requestId: '123e4567-e89b-12d3-a456-426614174000',
      action: 'pending',
    };
    const res = ReviewRequestSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });
});
