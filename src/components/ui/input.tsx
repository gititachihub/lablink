import React from 'react';

export interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: (props: { id: string; 'aria-describedby'?: string; className: string }) => React.ReactNode;
}

export function FormField({ id, label, error, hint, children }: FormFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const inputClass =
    'w-full bg-[#050505] border border-[#26262B] rounded-lg px-3.5 py-2 text-sm text-[#F5F5F5] placeholder-[#71717A] transition-colors focus:border-[#FFD60A] focus:outline-none';

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-[#F5F5F5] tracking-wide">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, className: inputClass })}
      {hint && (
        <p id={hintId} className="text-[11px] text-[#A1A1AA]">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-[#F87171] font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
