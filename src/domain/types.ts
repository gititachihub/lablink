/**
 * Pure domain types for LabLink.
 * ZERO dependencies on Next.js, React, Supabase, or external I/O.
 */

export type Role = 'student' | 'faculty' | 'admin';

export interface Department {
  id: string;
  name: string;
  building: string;
  floor: number | null;
  contactEmail: string;
}

export interface Equipment {
  id: string;
  name: string;
  description: string;
  departmentId: string;
  category: string;
  specifications: Record<string, string | number | boolean>;
  isOperational: boolean;
  requiresTraining: boolean;
  maxBookingHours: number;
  labOpen: string;  // "HH:MM" e.g. "09:00"
  labClose: string; // "HH:MM" e.g. "18:00"
  imageUrl?: string;
}

export type RequirementType =
  | 'training'
  | 'certification'
  | 'faculty_approval'
  | 'department_membership';

export interface AccessRequirement {
  id: string;
  equipmentId: string;
  requirementType: RequirementType;
  description: string;
}

export interface UserQualification {
  id?: string;
  userId: string;
  qualificationType: 'training' | 'certification' | 'department_membership';
  qualificationName: string;
  verifiedAt: Date;
  expiresAt: Date | null;
}

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface BookingRequest {
  id: string;
  studentId: string;
  equipmentId: string;
  timeRange: TimeRange;
  projectTitle: string;
  projectDescription: string;
  deadline: Date;
  deadlineVerified: boolean;
  status: BookingStatus;
  createdAt: Date;
  requiredCategory?: string;
  requiredSpecifications?: Record<string, string | number | boolean>;
}

export interface Booking {
  id: string;
  requestId: string;
  studentId: string;
  equipmentId: string;
  timeRange: TimeRange;
  createdAt: Date;
}

export interface AllocationContext {
  now: Date;
  maxHoursPerStudent: number;
  weights: {
    urgency: number;
    wait: number;
    fairness: number;
  };
  campusTimezone: string;
}

export interface ConstraintResult {
  constraint: 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'H6' | 'H7';
  name: string;
  pass: boolean;
  reason: string;
}

export interface ScoreBreakdown {
  urgency: number;
  wait: number;
  fairness: number;
  finalScore: number;
  daysUntilDeadline: number;
  daysSinceSubmission: number;
  studentHoursThisMonth: number;
}

export interface ScoredRequest {
  request: BookingRequest;
  feasible: boolean;
  scoreBreakdown?: ScoreBreakdown;
  failedConstraints?: ConstraintResult[];
  explanation: string;
  alternativeSlots?: TimeRange[];
  alternativeEquipment?: AlternativeEquipmentOption[];
}

export interface AlternativeEquipmentOption {
  equipment: Equipment;
  earliestFreeSlot: TimeRange;
  matchingSpecs: string[];
}
