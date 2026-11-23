/**
 * Multi-request conflict ranking and deterministic tie-breaking.
 */
import {
  Equipment,
  BookingRequest,
  Booking,
  UserQualification,
  ScoredRequest,
  AllocationContext,
} from '../types';
import { evaluateRequest } from './engine';
import { findAlternatives } from './alternatives';
import { diffInHours } from '../booking/time';

export interface RankCompetingInput {
  requests: BookingRequest[];
  equipment: Equipment;
  qualificationsByStudent: Map<string, UserQualification[]>;
  existingBookings: Booking[];
  studentHoursMap: Map<string, number>;
  ctx: AllocationContext;
}

export interface RankCompetingResult {
  winner: ScoredRequest | null;
  rankedQueue: ScoredRequest[];
  fallbacksWithAlternatives: ScoredRequest[];
}

export function rankCompetingRequests(input: RankCompetingInput): RankCompetingResult {
  if (input.requests.length === 0) {
    return { winner: null, rankedQueue: [], fallbacksWithAlternatives: [] };
  }

  // 1. Evaluate each candidate dynamically using view-time clock (ctx.now)
  const scoredRequests: ScoredRequest[] = input.requests.map((req) => {
    const quals = input.qualificationsByStudent.get(req.studentId) ?? [];
    const hours = input.studentHoursMap.get(req.studentId) ?? 0;

    return evaluateRequest({
      request: req,
      equipment: input.equipment,
      accessRequirements: [],
      existingBookings: input.existingBookings,
      userQualifications: quals,
      studentHoursThisMonth: hours,
      ctx: input.ctx,
    });
  });

  // 2. Sort by deterministic ranking criteria:
  //    Primary: Feasibility (feasible first)
  //    Secondary: Final Score descending
  //    Tertiary (tie-breaker 1): Earlier submission time (created_at ascending)
  //    Quaternary (tie-breaker 2): Alphanumeric request ID ascending
  const sorted = [...scoredRequests].sort((a, b) => {
    if (a.feasible !== b.feasible) {
      return a.feasible ? -1 : 1;
    }

    const scoreA = a.scoreBreakdown?.finalScore ?? -1;
    const scoreB = b.scoreBreakdown?.finalScore ?? -1;
    if (Math.abs(scoreA - scoreB) > 0.0001) {
      return scoreB - scoreA;
    }

    const createdDiff = a.request.createdAt.getTime() - b.request.createdAt.getTime();
    if (createdDiff !== 0) {
      return createdDiff;
    }

    return a.request.id.localeCompare(b.request.id);
  });

  const winner = sorted.length > 0 && sorted[0].feasible ? sorted[0] : null;

  // 3. For any losing request that overlaps with the winner's time range, populate alternative slots
  const fallbacksWithAlternatives: ScoredRequest[] = [];

  if (winner) {
    const simulatedBookingsWithWinner: Booking[] = [
      ...input.existingBookings,
      {
        id: 'simulated-winner',
        requestId: winner.request.id,
        studentId: winner.request.studentId,
        equipmentId: input.equipment.id,
        timeRange: winner.request.timeRange,
        createdAt: input.ctx.now,
      },
    ];

    for (let i = 1; i < sorted.length; i++) {
      const losing = sorted[i];
      const duration = diffInHours(losing.request.timeRange.start, losing.request.timeRange.end);
      const alternatives = findAlternatives(
        input.equipment,
        simulatedBookingsWithWinner,
        duration,
        losing.request.deadline,
        input.ctx
      );

      fallbacksWithAlternatives.push({
        ...losing,
        alternativeSlots: alternatives,
      });
    }
  }

  return {
    winner,
    rankedQueue: sorted,
    fallbacksWithAlternatives,
  };
}
