import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverLift?: boolean;
  children: React.ReactNode;
}

export function Card({ hoverLift = false, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-[#0F0F10] border border-[#26262B] rounded-xl p-6 ${
        hoverLift ? 'card-hover' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
