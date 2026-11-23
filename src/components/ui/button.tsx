import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const variants = {
    primary:
      'bg-[#FFD60A] text-[#0A0A0A] hover:bg-[#ffe033] active:bg-[#e6c108] shadow-[0_1px_2px_rgba(0,0,0,0.5)]',
    secondary:
      'bg-[#17171A] text-[#F5F5F5] border border-[#26262B] hover:border-[#FFD60A]/40 hover:bg-[#202024] active:bg-[#141416]',
    ghost:
      'bg-transparent text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#17171A] active:bg-[#202024]',
    danger:
      'bg-[#2A1515] text-[#F87171] border border-[#F87171]/30 hover:bg-[#3D1A1A] hover:border-[#F87171]/50',
  };

  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
