import React from 'react';
import Link from 'next/link';
import { Button } from './button';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  icon?: string;
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  icon = '🔬',
}: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-6 bg-[#0F0F10] border border-[#26262B] rounded-xl flex flex-col items-center justify-center space-y-4 max-w-xl mx-auto">
      <div className="w-12 h-12 rounded-xl bg-[#17171A] border border-[#26262B] flex items-center justify-center text-2xl" aria-hidden="true">
        {icon}
      </div>
      <div className="space-y-1.5 max-w-md">
        <h3 className="text-base font-bold text-[#F5F5F5]">{title}</h3>
        <p className="text-xs text-[#A1A1AA] leading-relaxed">{description}</p>
      </div>
      {actionHref && actionLabel && (
        <Link href={actionHref}>
          <Button variant="primary" size="sm">
            {actionLabel}
          </Button>
        </Link>
      )}
    </div>
  );
}
