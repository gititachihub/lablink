import { describe, it, expect } from 'vitest';
import {
  Equipment,
  BookingRequest,
  Booking,
  UserQualification,
  AccessRequirement,
  AllocationContext,
} from '../types';
import {
  checkEquipmentOperational,
  checkSlotFree,
  checkAccessEligible,
  checkWithinLabHours,
  checkFitsMaxDuration,
  checkFeasibleBeforeDeadline,
  checkCategoryAndSpecMatch,
  runHardConstraints,
} from './constraints';
import { computeScore } from './scoring';
import { buildExplanation } from './explain';
import { findAlternativeEquipment } from './alternatives';
import { evaluateRequest } from './engine';
import { rankCompetingRequests } from './ranking';
import { SCORING_WEIGHTS, CAMPUS_TIMEZONE } from '@/lib/constants';

// Standard mock fixtures
const mockEquipment: Equipment = {
  id: 'equip-physics-1',
  name: 'X-Ray Diffractometer',
  description: 'High resolution powder diffractometer',
  departmentId: 'dept-physics',
  category: 'Crystallography',
  specifications: { voltage: '40kV', source: 'Cu-Ka' },
  isOperational: true,
  requiresTraining: true,
  maxBookingHours: 4,
  labOpen: '09:00',
  labClose: '18:00',
};

const defaultContext: AllocationContext = {
  now: new Date('2026-11-24T04:00:00Z'), // ~09:30 AM IST
  maxHoursPerStudent: 20,
  weights: SCORING_WEIGHTS,
  campusTimezone: CAMPUS_TIMEZONE,
};

function createRequest(overrides: Partial<BookingRequest> = {}): BookingRequest {
  return {
    id: 'req-1',
    studentId: 'student-1',
    equipmentId: 'equip-physics-1',
    timeRange: {
      start: new Date('2026-11-24T05:00:00Z'), // 10:30 IST
      end: new Date('2026-11-24T08:00:00Z'),   // 13:30 IST (3h)
    },
    projectTitle: 'Thin film analysis',
    projectDescription: 'XRD characterization for senior thesis',
    deadline: new Date('2026-11-28T18:30:00Z'), // 4 days away
    deadlineVerified: false,
    status: 'pending',
    createdAt: new Date('2026-11-22T04:00:00Z'), // 2 days ago
    requiredCategory: 'Crystallography',
    requiredSpecifications: { voltage: '40kV' },
    ...overrides,
  };
}

describe('Allocation Engine - Hard Constraints (H1-H7)', () => {
  it('H1 fails when equipment is not operational', () => {
    const nonOp = { ...mockEquipment, isOperational: false };
    const res = checkEquipmentOperational(nonOp);
    expect(res.pass).toBe(false);
    expect(res.constraint).toBe('H1');
  });

  it('H2 fails when slot overlaps with an existing confirmed booking', () => {
    const existing: Booking[] = [
      {
        id: 'book-1',
        requestId: 'req-other',
        studentId: 'student-other',
        equipmentId: 'equip-physics-1',
        timeRange: {
          start: new Date('2026-11-24T06:00:00Z'),
          end: new Date('2026-11-24T09:00:00Z'),
        },
        createdAt: new Date(),
      },
    ];
    const req = createRequest(); // 05:00 - 08:00 overlaps 06:00 - 09:00
    const res = checkSlotFree(req.timeRange, existing);
    expect(res.pass).toBe(false);
    expect(res.constraint).toBe('H2');
  });

  it('H3 fails when student lacks required qualification or qualification expired', () => {
    const reqs: AccessRequirement[] = [
      {
        id: 'ar-1',
        equipmentId: 'equip-physics-1',
        requirementType: 'training',
        description: 'Radiation Safety Training',
      },
    ];
    // Student has no qualifications
    const resNoQual = checkAccessEligible(reqs, [], defaultContext.now);
    expect(resNoQual.pass).toBe(false);

    // Student has expired qualification
    const expiredQual: UserQualification[] = [
      {
        userId: 'student-1',
        qualificationType: 'training',
        qualificationName: 'Radiation Safety Training',
        verifiedAt: new Date('2025-01-01T00:00:00Z'),
        expiresAt: new Date('2026-01-01T00:00:00Z'), // Expired relative to 2026-11-24
      },
    ];
    const resExpired = checkAccessEligible(reqs, expiredQual, defaultContext.now);
    expect(resExpired.pass).toBe(false);

    // Student has valid qualification
    const validQual: UserQualification[] = [
      {
        userId: 'student-1',
        qualificationType: 'training',
        qualificationName: 'Radiation Safety Training',
        verifiedAt: new Date('2026-01-01T00:00:00Z'),
        expiresAt: null,
      },
    ];
    const resValid = checkAccessEligible(reqs, validQual, defaultContext.now);
    expect(resValid.pass).toBe(true);
  });

  it('H4 fails when slot is outside lab hours or spans across days', () => {
    // 02:00 UTC = 07:30 IST (before 09:00 IST open)
    const earlyRange = {
      start: new Date('2026-11-24T02:00:00Z'),
      end: new Date('2026-11-24T04:00:00Z'),
    };
    const res = checkWithinLabHours(earlyRange, mockEquipment, CAMPUS_TIMEZONE);
    expect(res.pass).toBe(false);
    expect(res.constraint).toBe('H4');
  });

  it('H5 fails when booking duration exceeds maxBookingHours', () => {
    // 5 hours exceeds maxBookingHours of 4
    const longRange = {
      start: new Date('2026-11-24T04:00:00Z'),
      end: new Date('2026-11-24T09:00:00Z'),
    };
    const res = checkFitsMaxDuration(longRange, mockEquipment);
    expect(res.pass).toBe(false);
    expect(res.constraint).toBe('H5');
  });

  it('H6 fails when slot start is after request deadline', () => {
    const req = createRequest({
      deadline: new Date('2026-11-24T04:00:00Z'),
      timeRange: {
        start: new Date('2026-11-24T05:00:00Z'),
        end: new Date('2026-11-24T07:00:00Z'),
      },
    });
    const res = checkFeasibleBeforeDeadline(req);
    expect(res.pass).toBe(false);
    expect(res.constraint).toBe('H6');
  });

  it('H7 fails when category or specifications mismatch', () => {
    const reqCategoryMismatch = createRequest({ requiredCategory: 'Nuclear Magnetic' });
    const resCat = checkCategoryAndSpecMatch(reqCategoryMismatch, mockEquipment);
    expect(resCat.pass).toBe(false);
    expect(resCat.constraint).toBe('H7');

    const reqSpecMismatch = createRequest({ requiredSpecifications: { voltage: '100kV' } });
    const resSpec = checkCategoryAndSpecMatch(reqSpecMismatch, mockEquipment);
    expect(resSpec.pass).toBe(false);
  });

  it('Passes when all H1-H7 constraints pass', () => {
    const req = createRequest();
    const validQual: UserQualification[] = [
      {
        userId: 'student-1',
        qualificationType: 'training',
        qualificationName: 'Standard Oper',
        verifiedAt: new Date('2026-01-01'),
        expiresAt: null,
      },
    ];
    const results = runHardConstraints({
      request: req,
      equipment: mockEquipment,
      accessRequirements: [],
      existingBookings: [],
      userQualifications: validQual,
      ctx: defaultContext,
    });

    expect(results.every((r) => r.pass)).toBe(true);
  });
});

describe('Allocation Engine - Scoring, Weights and Boundaries', () => {
  it('weights sum to exactly 1.0', () => {
    const sum = SCORING_WEIGHTS.urgency + SCORING_WEIGHTS.wait + SCORING_WEIGHTS.fairness;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('urgency rises as the deadline nears', () => {
    const now = new Date('2026-11-24T00:00:00Z');
    const ctx = { ...defaultContext, now };

    const reqFar = createRequest({ deadline: new Date('2026-12-08T00:00:00Z') }); // 14 days away
    const reqNear = createRequest({ deadline: new Date('2026-11-26T00:00:00Z') }); // 2 days away

    const scoreFar = computeScore(reqFar, 5, ctx);
    const scoreNear = computeScore(reqNear, 5, ctx);

    expect(scoreNear.urgency).toBeGreaterThan(scoreFar.urgency);
    expect(scoreNear.finalScore).toBeGreaterThan(scoreFar.finalScore);
  });

  it('wait-time and fairness scores behave correctly at their boundaries', () => {
    const now = new Date('2026-11-24T00:00:00Z');
    const ctx = { ...defaultContext, now, maxHoursPerStudent: 20 };

    // Submission just now (0 days wait) -> wait = 0
    const reqZeroWait = createRequest({ createdAt: now });
    const resZeroWait = computeScore(reqZeroWait, 0, ctx);
    expect(resZeroWait.wait).toBe(0);

    // Submission 10 days ago (>= 7 days cap) -> wait = 1.0
    const reqMaxWait = createRequest({ createdAt: new Date('2026-11-14T00:00:00Z') });
    const resMaxWait = computeScore(reqMaxWait, 0, ctx);
    expect(resMaxWait.wait).toBe(1.0);

    // 0 past hours -> fairness = 1.0
    const resZeroHours = computeScore(reqZeroWait, 0, ctx);
    expect(resZeroHours.fairness).toBe(1.0);

    // 20 past hours (max) -> fairness = 0.0
    const resMaxHours = computeScore(reqZeroWait, 20, ctx);
    expect(resMaxHours.fairness).toBe(0.0);

    // 30 past hours (> max) clamped to fairness = 0.0
    const resOverHours = computeScore(reqZeroWait, 30, ctx);
    expect(resOverHours.fairness).toBe(0.0);
  });
});

describe('Explanation Builder', () => {
  it('unverified deadlines are flagged as claimed in the explanation', () => {
    const req = createRequest({ deadlineVerified: false });
    const breakdown = computeScore(req, 2, defaultContext);
    const explanation = buildExplanation(req, breakdown);

    expect(explanation).toContain('claimed deadline');
    expect(explanation).not.toContain('verified deadline');
  });

  it('verified deadlines are explicitly stated in the explanation', () => {
    const req = createRequest({ deadlineVerified: true });
    const breakdown = computeScore(req, 2, defaultContext);
    const explanation = buildExplanation(req, breakdown);

    expect(explanation).toContain('faculty-verified deadline');
  });

  it('numbers in explanation text match the computed score', () => {
    const req = createRequest({
      createdAt: new Date('2026-11-21T04:00:00Z'), // 3 days wait
      deadline: new Date('2026-11-26T04:00:00Z'),  // 2 days urgency
    });
    const breakdown = computeScore(req, 2, defaultContext); // 2 hours used
    const explanation = buildExplanation(req, breakdown);

    const scorePct = (breakdown.finalScore * 100).toFixed(1);
    expect(explanation).toContain(`Score: ${scorePct}%`);
  });
});

describe('Deterministic Evaluation and Idempotency', () => {
  it('same input and same injected now always give the same result', () => {
    const req = createRequest();
    const res1 = evaluateRequest({
      request: req,
      equipment: mockEquipment,
      accessRequirements: [],
      existingBookings: [],
      userQualifications: [],
      studentHoursThisMonth: 4,
      ctx: defaultContext,
    });

    const res2 = evaluateRequest({
      request: req,
      equipment: mockEquipment,
      accessRequirements: [],
      existingBookings: [],
      userQualifications: [],
      studentHoursThisMonth: 4,
      ctx: defaultContext,
    });

    expect(res1).toEqual(res2);
  });
});

describe('Conflict Resolution & Ranking (rankCompetingRequests)', () => {
  it('three competing requests rank correctly and ties break deterministically', () => {
    const now = new Date('2026-11-24T04:00:00Z');
    const ctx = { ...defaultContext, now };

    // Request A: urgent, waited 3 days, low past usage
    const reqA = createRequest({
      id: 'req-A',
      studentId: 'student-A',
      createdAt: new Date('2026-11-21T04:00:00Z'),
      deadline: new Date('2026-11-26T04:00:00Z'),
    });

    // Request B: less urgent, 1 day wait, moderate past usage
    const reqB = createRequest({
      id: 'req-B',
      studentId: 'student-B',
      createdAt: new Date('2026-11-23T04:00:00Z'),
      deadline: new Date('2026-12-04T04:00:00Z'),
    });

    // Request C: exactly identical score parameters to A, but submitted 1 hour later
    const reqC = createRequest({
      id: 'req-C',
      studentId: 'student-C',
      createdAt: new Date('2026-11-21T05:00:00Z'), // later than reqA
      deadline: new Date('2026-11-26T04:00:00Z'),
    });

    const studentHoursMap = new Map([
      ['student-A', 2],
      ['student-B', 12],
      ['student-C', 2],
    ]);

    const result = rankCompetingRequests({
      requests: [reqB, reqA, reqC], // out of order input
      equipment: mockEquipment,
      qualificationsByStudent: new Map(),
      existingBookings: [],
      studentHoursMap,
      ctx,
    });

    // Winner should be reqA (earlier submission tie-break over C, much higher score than B)
    expect(result.winner?.request.id).toBe('req-A');
    expect(result.rankedQueue[0].request.id).toBe('req-A');
    expect(result.rankedQueue[1].request.id).toBe('req-C');
    expect(result.rankedQueue[2].request.id).toBe('req-B');
  });

  it('ties on both score and submission time break deterministically by alphanumeric id', () => {
    const now = new Date('2026-11-24T04:00:00Z');
    const ctx = { ...defaultContext, now };
    const exactCreated = new Date('2026-11-21T04:00:00Z');
    const exactDeadline = new Date('2026-11-26T04:00:00Z');

    const reqZ = createRequest({
      id: 'req-zzz',
      studentId: 'student-z',
      createdAt: exactCreated,
      deadline: exactDeadline,
    });

    const reqA = createRequest({
      id: 'req-aaa',
      studentId: 'student-a',
      createdAt: exactCreated,
      deadline: exactDeadline,
    });

    const studentHoursMap = new Map([
      ['student-z', 0],
      ['student-a', 0],
    ]);

    const result = rankCompetingRequests({
      requests: [reqZ, reqA],
      equipment: mockEquipment,
      qualificationsByStudent: new Map(),
      existingBookings: [],
      studentHoursMap,
      ctx,
    });

    // req-aaa should be sorted before req-zzz due to id tie-breaker
    expect(result.winner?.request.id).toBe('req-aaa');
  });
});

describe('Alternatives Finder', () => {
  it('no feasible slot returns failed reasons plus alternatives inside lab hours', () => {
    // Book out the entire requested slot
    const existing: Booking[] = [
      {
        id: 'book-1',
        requestId: 'req-busy',
        studentId: 'student-other',
        equipmentId: 'equip-physics-1',
        timeRange: {
          start: new Date('2026-11-24T05:00:00Z'),
          end: new Date('2026-11-24T08:00:00Z'),
        },
        createdAt: new Date(),
      },
    ];

    const req = createRequest();
    const evalResult = evaluateRequest({
      request: req,
      equipment: mockEquipment,
      accessRequirements: [],
      existingBookings: existing,
      userQualifications: [],
      studentHoursThisMonth: 0,
      ctx: defaultContext,
    });

    expect(evalResult.feasible).toBe(false);
    expect(evalResult.failedConstraints?.some((c) => c.constraint === 'H2')).toBe(true);
    expect(evalResult.alternativeSlots).toBeDefined();
    expect(evalResult.alternativeSlots!.length).toBeGreaterThan(0);

    // Verify all returned alternative slots do not overlap with existing booking
    for (const alt of evalResult.alternativeSlots!) {
      expect(
        alt.start.getTime() >= existing[0].timeRange.end.getTime() ||
        alt.end.getTime() <= existing[0].timeRange.start.getTime()
      ).toBe(true);
    }
  });

  it('alternative equipment from another department is suggested when requested one is busy', () => {
    // Completely book out mockEquipment for the next 7 days
    const busyBookings: Booking[] = [
      {
        id: 'b-full',
        requestId: 'r-full',
        studentId: 's-other',
        equipmentId: 'equip-physics-1',
        timeRange: {
          start: new Date('2026-11-24T03:30:00Z'),
          end: new Date('2026-11-24T12:30:00Z'), // Full lab day
        },
        createdAt: new Date(),
      },
    ];

    // Equivalent equipment in Chemistry department
    const chemEquipment: Equipment = {
      id: 'equip-chem-diffractometer',
      name: 'Benchtop XRD',
      description: 'Crystallography system in Chemistry',
      departmentId: 'dept-chemistry',
      category: 'Crystallography',
      specifications: { voltage: '40kV', source: 'Cu-Ka' },
      isOperational: true,
      requiresTraining: false,
      maxBookingHours: 4,
      labOpen: '09:00',
      labClose: '18:00',
    };

    const bmeEquipment: Equipment = {
      id: 'equip-bme-diffractometer',
      name: 'Bio XRD',
      description: 'Crystallography system in BME',
      departmentId: 'dept-bme',
      category: 'Crystallography',
      specifications: { voltage: '40kV', source: 'Cu-Ka' },
      isOperational: true,
      requiresTraining: false,
      maxBookingHours: 4,
      labOpen: '10:00',
      labClose: '18:00',
    };

    const allEquipment = [mockEquipment, chemEquipment, bmeEquipment];
    const req = createRequest();

    const alts = findAlternativeEquipment({
      targetEquipment: mockEquipment,
      allEquipment,
      allBookings: busyBookings,
      request: req,
      userQualifications: [],
      ctx: defaultContext,
    });

    expect(alts.length).toBe(2);
    expect(alts[0].equipment.departmentId).toBe('dept-chemistry');
    expect(alts[1].equipment.departmentId).toBe('dept-bme');
  });

  it('handles alternatives when window exhausts or candidate equipment has no free slots', () => {
    // Equipment with tight deadline where only 1 slot fits before deadline
    const tightDeadlineReq = createRequest({
      deadline: new Date('2026-11-24T08:30:00Z'), // Ends early on day 1
    });

    const busyEquip: Equipment = {
      ...mockEquipment,
      id: 'equip-busy-chem',
      departmentId: 'dept-chem-busy',
    };

    // Fully booked equipment for next 14 days
    const fullBookings: Booking[] = [
      {
        id: 'b-blocked',
        requestId: 'r-blocked',
        studentId: 's-other',
        equipmentId: 'equip-busy-chem',
        timeRange: {
          start: new Date('2026-11-24T03:30:00Z'),
          end: new Date('2026-12-05T12:30:00Z'),
        },
        createdAt: new Date(),
      },
    ];

    const alts = findAlternativeEquipment({
      targetEquipment: mockEquipment,
      allEquipment: [mockEquipment, busyEquip],
      allBookings: fullBookings,
      request: tightDeadlineReq,
      userQualifications: [],
      ctx: defaultContext,
    });

    // Busy equipment had 0 free slots, so options list is empty
    expect(alts).toHaveLength(0);
  });
});

describe('Edge Cases for 100% Branch Coverage', () => {
  it('covers scoring fallback when maxHoursPerStudent is zero or negative', () => {
    const ctxZeroMax = { ...defaultContext, maxHoursPerStudent: 0 };
    const req = createRequest();
    const score = computeScore(req, 10, ctxZeroMax);
    // Should fallback to default 20 hours: fairness = 1 - 10/20 = 0.5
    expect(score.fairness).toBe(0.5);
  });

  it('covers constraints when equipment specifications missing key or specifications undefined', () => {
    const reqMissingSpec = createRequest({
      requiredSpecifications: { nonExistentKey: 'value123' },
    });
    const res = checkCategoryAndSpecMatch(reqMissingSpec, mockEquipment);
    expect(res.pass).toBe(false);
    expect(res.reason).toContain("specification 'nonExistentKey' (none) does not satisfy");

    const reqNoSpecs = createRequest({
      requiredCategory: 'Crystallography',
      requiredSpecifications: undefined,
    });
    const resNoSpecs = checkCategoryAndSpecMatch(reqNoSpecs, mockEquipment);
    expect(resNoSpecs.pass).toBe(true);
  });

  it('covers ranking edge cases: empty list, single request, non-overlapping requests', () => {
    // Empty list
    const emptyRes = rankCompetingRequests({
      requests: [],
      equipment: mockEquipment,
      qualificationsByStudent: new Map(),
      existingBookings: [],
      studentHoursMap: new Map(),
      ctx: defaultContext,
    });
    expect(emptyRes.winner).toBeNull();
    expect(emptyRes.rankedQueue).toHaveLength(0);

    // Single request
    const singleReq = createRequest({ id: 'single-1' });
    const singleRes = rankCompetingRequests({
      requests: [singleReq],
      equipment: mockEquipment,
      qualificationsByStudent: new Map(),
      existingBookings: [],
      studentHoursMap: new Map(),
      ctx: defaultContext,
    });
    expect(singleRes.winner?.request.id).toBe('single-1');
    expect(singleRes.fallbacksWithAlternatives).toHaveLength(0);

    // Non-overlapping requests: both are feasible at different times
    const req1 = createRequest({
      id: 'req-morning',
      timeRange: {
        start: new Date('2026-11-24T04:00:00Z'),
        end: new Date('2026-11-24T06:00:00Z'),
      },
    });
    const req2 = createRequest({
      id: 'req-afternoon',
      timeRange: {
        start: new Date('2026-11-24T07:00:00Z'),
        end: new Date('2026-11-24T09:00:00Z'),
      },
    });
    const nonOverlapRes = rankCompetingRequests({
      requests: [req1, req2],
      equipment: mockEquipment,
      qualificationsByStudent: new Map(),
      existingBookings: [],
      studentHoursMap: new Map(),
      ctx: defaultContext,
    });
    expect(nonOverlapRes.winner).not.toBeNull();
    expect(nonOverlapRes.rankedQueue).toHaveLength(2);

    // Ranking where one request is infeasible (feasible comes before infeasible)
    const infeasibleReq = createRequest({
      id: 'req-infeasible',
      timeRange: {
        start: new Date('2026-11-24T01:00:00Z'), // Outside lab hours
        end: new Date('2026-11-24T03:00:00Z'),
      },
    });
    const mixedRes = rankCompetingRequests({
      requests: [infeasibleReq, req1],
      equipment: mockEquipment,
      qualificationsByStudent: new Map(),
      existingBookings: [],
      studentHoursMap: new Map(),
      ctx: defaultContext,
    });
    expect(mixedRes.winner?.request.id).toBe('req-morning');
    expect(mixedRes.rankedQueue[0].feasible).toBe(true);
    expect(mixedRes.rankedQueue[1].feasible).toBe(false);

    // Ranking where all requests are infeasible (winner is null)
    const allInfeasibleRes = rankCompetingRequests({
      requests: [infeasibleReq],
      equipment: mockEquipment,
      qualificationsByStudent: new Map(),
      existingBookings: [],
      studentHoursMap: new Map(),
      ctx: defaultContext,
    });
    expect(allInfeasibleRes.winner).toBeNull();
  });
});

describe('Pitch Scenario Verification (Arjun vs Meera - Section 12)', () => {
  it('runs the exact pitch scenario and matches Section 12 mathematical numbers', () => {
    // Common slot: next Tuesday 14:00 to 17:00 IST (08:30 to 11:30 UTC, 3h duration)
    const slotTimeRange = {
      start: new Date('2026-11-24T08:30:00Z'),
      end: new Date('2026-11-24T11:30:00Z'),
    };

    const now = new Date('2026-11-24T04:00:00Z'); // 09:30 AM IST on Tuesday
    const ctx: AllocationContext = {
      now,
      maxHoursPerStudent: 20,
      weights: { urgency: 0.35, wait: 0.35, fairness: 0.30 },
      campusTimezone: CAMPUS_TIMEZONE,
    };

    // Student 1: Arjun Patel
    // Claimed deadline in 2 days (2026-11-26T04:00:00Z)
    // Submitted 3 days ago (2026-11-21T04:00:00Z)
    // Past usage: 2 hours this month
    const reqArjun: BookingRequest = {
      id: 'req-arjun',
      studentId: 'student1@lablink.demo',
      equipmentId: mockEquipment.id,
      timeRange: slotTimeRange,
      projectTitle: 'Thin-film analysis',
      projectDescription: 'XRD characterization for senior thesis project',
      deadline: new Date('2026-11-26T04:00:00Z'),
      deadlineVerified: false,
      status: 'pending',
      createdAt: new Date('2026-11-21T04:00:00Z'),
      requiredCategory: 'Crystallography',
      requiredSpecifications: { voltage: '40kV' },
    };

    // Student 2: Meera Nair
    // Claimed deadline in 10 days (2026-12-04T04:00:00Z)
    // Submitted 1 day ago (2026-11-23T04:00:00Z)
    // Past usage: 12 hours this month
    const reqMeera: BookingRequest = {
      id: 'req-meera',
      studentId: 'student2@lablink.demo',
      equipmentId: mockEquipment.id,
      timeRange: slotTimeRange,
      projectTitle: 'Nanocrystal synthesis analysis',
      projectDescription: 'Phase purity analysis for materials project',
      deadline: new Date('2026-12-04T04:00:00Z'),
      deadlineVerified: false,
      status: 'pending',
      createdAt: new Date('2026-11-23T04:00:00Z'),
      requiredCategory: 'Crystallography',
      requiredSpecifications: { voltage: '40kV' },
    };

    const studentHoursMap = new Map([
      ['student1@lablink.demo', 2],
      ['student2@lablink.demo', 12],
    ]);

    // Compute standalone scores
    const arjunScore = computeScore(reqArjun, 2, ctx);
    const meeraScore = computeScore(reqMeera, 12, ctx);

    // Verify Arjun individual scores:
    // Urgency = 1 - 2/14 = 0.85714...
    expect(arjunScore.urgency).toBeCloseTo(0.857, 3);
    // Wait = 3/7 = 0.42857...
    expect(arjunScore.wait).toBeCloseTo(0.429, 3);
    // Fairness = 1 - 2/20 = 0.900
    expect(arjunScore.fairness).toBeCloseTo(0.900, 3);
    // Weighted final score = (0.35 * 0.85714) + (0.35 * 0.42857) + (0.30 * 0.900) = 0.720
    expect(arjunScore.finalScore).toBe(0.720);

    // Verify Meera individual scores:
    // Urgency = 1 - 10/14 = 0.28571...
    expect(meeraScore.urgency).toBeCloseTo(0.286, 3);
    // Wait = 1/7 = 0.14285...
    expect(meeraScore.wait).toBeCloseTo(0.143, 3);
    // Fairness = 1 - 12/20 = 0.400
    expect(meeraScore.fairness).toBeCloseTo(0.400, 3);
    // Weighted final score = (0.35 * 0.28571) + (0.35 * 0.14285) + (0.30 * 0.400) = 0.270
    expect(meeraScore.finalScore).toBe(0.270);

    // Run ranking through the engine
    const rankingResult = rankCompetingRequests({
      requests: [reqMeera, reqArjun], // input order should not affect winner
      equipment: mockEquipment,
      qualificationsByStudent: new Map(),
      existingBookings: [],
      studentHoursMap,
      ctx,
    });

    // Arjun is declared winner
    expect(rankingResult.winner?.request.id).toBe('req-arjun');
    expect(rankingResult.winner?.scoreBreakdown?.finalScore).toBe(0.720);

    // Meera is in fallbacks with calculated alternatives
    expect(rankingResult.fallbacksWithAlternatives).toHaveLength(1);
    expect(rankingResult.fallbacksWithAlternatives[0].request.id).toBe('req-meera');
    expect(rankingResult.fallbacksWithAlternatives[0].scoreBreakdown?.finalScore).toBe(0.270);
    expect(rankingResult.fallbacksWithAlternatives[0].alternativeSlots!.length).toBeGreaterThan(0);
  });
});
