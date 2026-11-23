/**
 * Pure explanation builder for allocation decisions.
 */
import { BookingRequest, ScoreBreakdown } from '../types';

export function buildExplanation(
  request: BookingRequest,
  breakdown: ScoreBreakdown
): string {
  const deadlineType = request.deadlineVerified ? 'faculty-verified deadline' : 'claimed deadline';
  const urgencyPct = (breakdown.urgency * 100).toFixed(0);
  const waitPct = (breakdown.wait * 100).toFixed(0);
  const fairnessPct = (breakdown.fairness * 100).toFixed(0);
  const scorePct = (breakdown.finalScore * 100).toFixed(1);

  const daysUntil = breakdown.daysUntilDeadline.toFixed(1);
  const daysSince = breakdown.daysSinceSubmission.toFixed(1);

  return (
    `Score: ${scorePct}% | ` +
    `Urgency (${urgencyPct}%, ${deadlineType} in ${daysUntil}d) + ` +
    `Queue Wait (${waitPct}%, in queue ${daysSince}d) + ` +
    `Fairness (${fairnessPct}%, ${breakdown.studentHoursThisMonth}h used this month).`
  );
}
