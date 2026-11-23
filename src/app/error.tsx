'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto text-center py-20 space-y-4">
      <div className="w-12 h-12 rounded-xl bg-[#2D1111] border border-[#F87171]/40 flex items-center justify-center text-xl mx-auto text-[#F87171]">
        ⚠
      </div>
      <h1 className="text-xl font-bold text-[#F5F5F5]">Something went wrong</h1>
      <p className="text-xs text-[#A1A1AA] leading-relaxed">
        An unexpected error occurred while communicating with the service. Please try reloading the view.
      </p>
      <Button variant="primary" size="sm" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
