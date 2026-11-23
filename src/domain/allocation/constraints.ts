/**
 * Hard Constraints (H1-H7) for LabLink Allocation.
 * Pure functions: all return ConstraintResult with explicit pass boolean and reason.
 */
import {
  Equipment,
  BookingRequest,
  Booking,
  AccessRequirement,
  UserQualification,
  TimeRange,
  ConstraintResult,
  AllocationContext,
} from '../types';
import { isWithinLabHours, diffInHours } from '../booking/time';

export function checkEquipmentOperational(equipment: Equipment): ConstraintResult {
  const pass = equipment.isOperational === true;
  return {
    constraint: 'H1',
    name: 'equipmentOperational',
    pass,
    reason: pass ? 'Equipment is operational.' : 'Equipment is currently non-operational or under maintenance.',
  };
}

export function checkSlotFree(range: TimeRange, existingBookings: Booking[]): ConstraintResult {
  const reqStart = range.start.getTime();
  const reqEnd = range.end.getTime();

  for (const b of existingBookings) {
    const bStart = b.timeRange.start.getTime();
    const bEnd = b.timeRange.end.getTime();
    // Overlap condition: start < bEnd && end > bStart
    if (reqStart < bEnd && reqEnd > bStart) {
      return {
        constraint: 'H2',
        name: 'slotFree',
        pass: false,
        reason: `Requested time range conflicts with an existing booking (${b.timeRange.start.toISOString()} - ${b.timeRange.end.toISOString()}).`,
      };
    }
  }

  return {
    constraint: 'H2',
    name: 'slotFree',
    pass: true,
    reason: 'Slot is completely free of confirmed bookings.',
  };
}

export function checkAccessEligible(
  requirements: AccessRequirement[],
  qualifications: UserQualification[],
  now: Date
): ConstraintResult {
  for (const req of requirements) {
    const matching = qualifications.find(
      (q) =>
        q.qualificationType === req.requirementType &&
        q.qualificationName.toLowerCase().includes(req.description.toLowerCase().split(' ')[0]) &&
        (!q.expiresAt || q.expiresAt.getTime() > now.getTime())
    );

    // If specific requirement requires training and user has any active qualification of matching type
    const hasAnyActive = qualifications.some(
      (q) => q.qualificationType === req.requirementType && (!q.expiresAt || q.expiresAt.getTime() > now.getTime())
    );

    if (!matching && !hasAnyActive) {
      return {
        constraint: 'H3',
        name: 'accessEligible',
        pass: false,
        reason: `Student does not satisfy required access qualification: ${req.description}.`,
      };
    }
  }

  return {
    constraint: 'H3',
    name: 'accessEligible',
    pass: true,
    reason: 'Student satisfies all required training and certifications.',
  };
}

export function checkWithinLabHours(
  range: TimeRange,
  equipment: Equipment,
  timezone: string
): ConstraintResult {
  const pass = isWithinLabHours(range.start, range.end, equipment.labOpen, equipment.labClose, timezone);
  return {
    constraint: 'H4',
    name: 'withinLabHours',
    pass,
    reason: pass
      ? `Slot is within lab operational hours (${equipment.labOpen} - ${equipment.labClose}).`
      : `Slot falls outside equipment lab operational hours (${equipment.labOpen} - ${equipment.labClose}) or spans multiple days.`,
  };
}

export function checkFitsMaxDuration(range: TimeRange, equipment: Equipment): ConstraintResult {
  const duration = diffInHours(range.start, range.end);
  const pass = duration > 0 && duration <= equipment.maxBookingHours;
  return {
    constraint: 'H5',
    name: 'fitsMaxDuration',
    pass,
    reason: pass
      ? `Booking duration (${duration}h) is within limit (${equipment.maxBookingHours}h).`
      : `Booking duration (${duration}h) exceeds the maximum allowed ${equipment.maxBookingHours}h.`,
  };
}

export function checkFeasibleBeforeDeadline(request: BookingRequest): ConstraintResult {
  const pass = request.timeRange.start.getTime() < request.deadline.getTime();
  return {
    constraint: 'H6',
    name: 'feasibleBeforeDeadline',
    pass,
    reason: pass
      ? 'Slot begins before the required project deadline.'
      : 'Slot start time is after the project deadline, making this allocation infeasible.',
  };
}

export function checkCategoryAndSpecMatch(request: BookingRequest, equipment: Equipment): ConstraintResult {
  if (request.requiredCategory && request.requiredCategory.toLowerCase() !== equipment.category.toLowerCase()) {
    return {
      constraint: 'H7',
      name: 'categoryAndSpecMatch',
      pass: false,
      reason: `Equipment category (${equipment.category}) does not match requested category (${request.requiredCategory}).`,
    };
  }

  if (request.requiredSpecifications) {
    for (const [key, val] of Object.entries(request.requiredSpecifications)) {
      const equipVal = equipment.specifications[key];
      if (equipVal === undefined || String(equipVal).toLowerCase() !== String(val).toLowerCase()) {
        return {
          constraint: 'H7',
          name: 'categoryAndSpecMatch',
          pass: false,
          reason: `Equipment specification '${key}' (${equipVal ?? 'none'}) does not satisfy required '${val}'.`,
        };
      }
    }
  }

  return {
    constraint: 'H7',
    name: 'categoryAndSpecMatch',
    pass: true,
    reason: 'Equipment category and all requested technical specifications match.',
  };
}

export interface HardConstraintInput {
  request: BookingRequest;
  equipment: Equipment;
  accessRequirements: AccessRequirement[];
  existingBookings: Booking[];
  userQualifications: UserQualification[];
  ctx: AllocationContext;
}

export function runHardConstraints(input: HardConstraintInput): ConstraintResult[] {
  return [
    checkEquipmentOperational(input.equipment),
    checkSlotFree(input.request.timeRange, input.existingBookings),
    checkAccessEligible(input.accessRequirements, input.userQualifications, input.ctx.now),
    checkWithinLabHours(input.request.timeRange, input.equipment, input.ctx.campusTimezone),
    checkFitsMaxDuration(input.request.timeRange, input.equipment),
    checkFeasibleBeforeDeadline(input.request),
    checkCategoryAndSpecMatch(input.request, input.equipment),
  ];
}
