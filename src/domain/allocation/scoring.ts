/**
 * Pure scoring calculation for LabLink Allocation.
 */
import { BookingRequest, ScoreBreakdown, AllocationContext } from '../types';
import { diffInDays } from '../booking/time';

export function computeScore(
  request: BookingRequest,
  studentHoursThisMonth: number,
  ctx: AllocationContext
): ScoreBreakdown {
  const daysUntilDeadline = Math.max(0, diffInDays(ctx.now, request.deadline));
  const daysSinceSubmission = Math.max(0, diffInDays(request.createdAt, ctx.now));

  // Urgency: [0, 1] - closer to deadline = higher urgency
  const urgency = 1 - Math.min(daysUntilDeadline, 14) / 14;

  // Waiting time: [0, 1] - longer wait = higher priority (capped at 7 days)
  const wait = Math.min(daysSinceSubmission, 7) / 7;

  // Fairness: [0, 1] - fewer hours used this month = higher score
  const maxHours = ctx.maxHoursPerStudent > 0 ? ctx.maxHoursPerStudent : 20;
  const clampedHours = Math.max(0, Math.min(studentHoursThisMonth, maxHours));
  const fairness = 1 - clampedHours / maxHours;

  const finalScore =
    ctx.weights.urgency * urgency +
    ctx.weights.wait * wait +
    ctx.weights.fairness * fairness;

  return {
    urgency,
    wait,
    fairness,
    finalScore: Math.round(finalScore * 1000) / 1000,
    daysUntilDeadline,
    daysSinceSubmission,
    studentHoursThisMonth,
  };
}
