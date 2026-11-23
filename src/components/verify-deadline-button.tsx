'use client';

import { useState } from 'react';

export function VerifyDeadlineButton({ initialVerified }: { initialVerified: boolean }) {
  const [verified, setVerified] = useState(initialVerified);

  return (
    <button
      type="button"
      onClick={() => setVerified(!verified)}
      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer border ${
        verified
          ? 'bg-[#0E2916] text-[#4ADE80] border-[#4ADE80]/40'
          : 'bg-[#17171A] text-[#A1A1AA] border-[#26262B] hover:text-[#F5F5F5]'
      }`}
    >
      {verified ? '✓ Deadline Verified' : 'Verify Deadline'}
    </button>
  );
}
