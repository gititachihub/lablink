/**
 * Pure evaluation engine orchestrator.
 */
import {
  Equipment,
  BookingRequest,
  Booking,
  AccessRequirement,
  UserQualification,
  ScoredRequest,
  AllocationContext,
} from '../types';
import { runHardConstraints } from './constraints';
import { computeScore } from './scoring';
import { buildExplanation } from './explain';
import { findAlternatives } from './alternatives';
import { diffInHours } from '../booking/time';

export interface EvaluateRequestInput {
  request: BookingRequest;
  equipment: Equipment;
  accessRequirements: AccessRequirement[];
  existingBookings: Booking[];
  userQualifications: UserQualification[];
  studentHoursThisMonth: number;
  ctx: AllocationContext;
}

export function evaluateRequest(input: EvaluateRequestInput): ScoredRequest {
  const constraintResults = runHardConstraints({
    request: input.request,
    equipment: input.equipment,
    accessRequirements: input.accessRequirements,
    existingBookings: input.existingBookings,
    userQualifications: input.userQualifications,
    ctx: input.ctx,
  });

  const failedConstraints = constraintResults.filter((c) => !c.pass);

  if (failedConstraints.length > 0) {
    const duration = diffInHours(input.request.timeRange.start, input.request.timeRange.end);
    const alternativeSlots = findAlternatives(
      input.equipment,
      input.existingBookings,
      duration,
      input.request.deadline,
      input.ctx
    );

    const failReasons = failedConstraints.map((f) => `[${f.constraint}] ${f.reason}`).join(' ');

    return {
      request: input.request,
      feasible: false,
      failedConstraints,
      explanation: `Infeasible: ${failReasons}`,
      alternativeSlots,
    };
  }

  const breakdown = computeScore(input.request, input.studentHoursThisMonth, input.ctx);
  const explanation = buildExplanation(input.request, breakdown);

  return {
    request: input.request,
    feasible: true,
    scoreBreakdown: breakdown,
    explanation,
  };
}
