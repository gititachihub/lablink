/**
 * Alternative slots and cross-department alternative equipment discovery.
 * Pure logic using Intl and pure date arithmetic.
 */
import {
  Equipment,
  BookingRequest,
  Booking,
  UserQualification,
  TimeRange,
  AlternativeEquipmentOption,
  AllocationContext,
} from '../types';
import { diffInHours, formatCampusDate } from '../booking/time';
import { checkSlotFree, checkCategoryAndSpecMatch } from './constraints';

/**
 * Generate candidate alternative slots on the target equipment.
 */
export function findAlternatives(
  equipment: Equipment,
  existingBookings: Booking[],
  targetDurationHours: number,
  deadline: Date,
  ctx: AllocationContext,
  windowDays: number = 7
): TimeRange[] {
  const alternatives: TimeRange[] = [];
  const duration = Math.min(targetDurationHours, equipment.maxBookingHours);

  // Parse lab open/close hours
  const [openHour, openMin] = equipment.labOpen.split(':').map(Number);
  const [closeHour, closeMin] = equipment.labClose.split(':').map(Number);

  // Generate day-by-day candidate slots
  for (let d = 0; d < windowDays; d++) {
    // Current day date in campus time
    const dayAnchor = new Date(ctx.now.getTime() + d * 24 * 60 * 60 * 1000);
    const dayStr = formatCampusDate(dayAnchor, ctx.campusTimezone);
    const [year, month, day] = dayStr.split('-').map(Number);

    // Build day start and end in UTC matching campus hours (IST = UTC+5:30)
    // Campus time has fixed offset for Asia/Kolkata (+05:30)
    // Local hour to UTC: UTC_Hour = Local_Hour - 5h 30m
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

    const dayStartLocalMs = Date.UTC(year, month - 1, day, openHour, openMin);
    const dayEndLocalMs = Date.UTC(year, month - 1, day, closeHour, closeMin);

    const dayStartUtc = new Date(dayStartLocalMs - IST_OFFSET_MS);
    const dayEndUtc = new Date(dayEndLocalMs - IST_OFFSET_MS);

    let candidateStart = new Date(dayStartUtc.getTime());

    while (candidateStart.getTime() + duration * 60 * 60 * 1000 <= dayEndUtc.getTime()) {
      const candidateEnd = new Date(candidateStart.getTime() + duration * 60 * 60 * 1000);

      // Must be after ctx.now and strictly before project deadline
      if (candidateStart.getTime() > ctx.now.getTime() && candidateEnd.getTime() <= deadline.getTime()) {
        const slotCheck = checkSlotFree({ start: candidateStart, end: candidateEnd }, existingBookings);
        if (slotCheck.pass) {
          alternatives.push({ start: candidateStart, end: candidateEnd });
          if (alternatives.length >= 5) {
            return alternatives;
          }
        }
      }

      // Step by 1 hour increments
      candidateStart = new Date(candidateStart.getTime() + 60 * 60 * 1000);
    }
  }

  return alternatives;
}

export interface AlternativeEquipmentInput {
  targetEquipment: Equipment;
  allEquipment: Equipment[];
  allBookings: Booking[];
  request: BookingRequest;
  userQualifications: UserQualification[];
  ctx: AllocationContext;
  windowDays?: number;
}

/**
 * Discover alternative equipment across other departments satisfying H7 with earliest free slot.
 */
export function findAlternativeEquipment(input: AlternativeEquipmentInput): AlternativeEquipmentOption[] {
  const options: AlternativeEquipmentOption[] = [];
  const duration = diffInHours(input.request.timeRange.start, input.request.timeRange.end);

  for (const eq of input.allEquipment) {
    // Only check other equipment (often in other departments)
    if (eq.id === input.targetEquipment.id) continue;
    if (!eq.isOperational) continue;

    // Check H7: category and specification match
    const h7 = checkCategoryAndSpecMatch(input.request, eq);
    if (!h7.pass) continue;

    const eqBookings = input.allBookings.filter((b) => b.equipmentId === eq.id);
    const slots = findAlternatives(
      eq,
      eqBookings,
      duration,
      input.request.deadline,
      input.ctx,
      input.windowDays ?? 7
    );

    if (slots.length > 0) {
      options.push({
        equipment: eq,
        earliestFreeSlot: slots[0],
        matchingSpecs: Object.keys(input.request.requiredSpecifications ?? {}),
      });
    }
  }

  // Sort by earliest available slot
  return options.sort(
    (a, b) => a.earliestFreeSlot.start.getTime() - b.earliestFreeSlot.start.getTime()
  );
}
