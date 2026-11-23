import React from 'react';

export type BadgeStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'operational' | 'maintenance' | 'default';

export interface BadgeProps {
  status?: BadgeStatus;
  label?: string;
  className?: string;
}

export function Badge({ status = 'default', label, className = '' }: BadgeProps) {
  const configs: Record<BadgeStatus, { text: string; bg: string; border: string; color: string; icon: string }> = {
    pending: {
      text: label || 'Pending',
      bg: 'bg-[#2E2005]',
      border: 'border-[#FBBF24]/30',
      color: 'text-[#FBBF24]',
      icon: '⏳',
    },
    approved: {
      text: label || 'Approved',
      bg: 'bg-[#0E2916]',
      border: 'border-[#4ADE80]/30',
      color: 'text-[#4ADE80]',
      icon: '✓',
    },
    rejected: {
      text: label || 'Rejected',
      bg: 'bg-[#2D1111]',
      border: 'border-[#F87171]/30',
      color: 'text-[#F87171]',
      icon: '✕',
    },
    cancelled: {
      text: label || 'Cancelled',
      bg: 'bg-[#17171A]',
      border: 'border-[#26262B]',
      color: 'text-[#A1A1AA]',
      icon: '⊘',
    },
    operational: {
      text: label || 'Operational',
      bg: 'bg-[#0E2916]',
      border: 'border-[#4ADE80]/30',
      color: 'text-[#4ADE80]',
      icon: '●',
    },
    maintenance: {
      text: label || 'Maintenance',
      bg: 'bg-[#2D1111]',
      border: 'border-[#F87171]/30',
      color: 'text-[#F87171]',
      icon: '■',
    },
    default: {
      text: label || 'Active',
      bg: 'bg-[#17171A]',
      border: 'border-[#26262B]',
      color: 'text-[#F5F5F5]',
      icon: '◆',
    },
  };

  const c = configs[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.bg} ${c.border} ${c.color} ${className}`}
    >
      <span aria-hidden="true" className="text-[10px] leading-none">{c.icon}</span>
      <span>{c.text}</span>
    </span>
  );
}
