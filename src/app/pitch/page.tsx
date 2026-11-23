'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScoreBar } from '@/components/ui/score-bar';

export default function PitchDemoPage() {
  const [arjunStatus, setArjunStatus] = useState<'pending' | 'approved'>('pending');
  const [meeraStatus, setMeeraStatus] = useState<'pending' | 'conflict'>('pending');

  const handleApproveArjun = () => {
    setArjunStatus('approved');
  };

  const handleTryApproveMeera = () => {
    if (arjunStatus === 'approved') {
      setMeeraStatus('conflict');
    } else {
      alert('In this scenario, Arjun is ranked #1. Approve Arjun first to witness the exclusion constraint!');
    }
  };

  const handleReset = () => {
    setArjunStatus('pending');
    setMeeraStatus('pending');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <PageHeader
        badge="90-Second Pitch Interactive Demo"
        title="Live Conflict & Exclusion Simulator"
        description="Witness the exact 90-second pitch scenario evaluated in real time: two students, one slot, transparent mathematical ranking, and Postgres kernel double-booking exclusion."
        action={
          <Button variant="secondary" size="sm" onClick={handleReset}>
            Reset Simulation
          </Button>
        }
      />

      {/* Pitch Scenario Header */}
      <Card className="space-y-4 border-[#FFD60A]/40 bg-[#0F0F10]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-[#26262B]">
          <div>
            <span className="text-xs font-mono text-[#A1A1AA]">Physics Department Lab</span>
            <h2 className="text-xl font-bold text-[#F5F5F5]">X-Ray Diffractometer (XRD)</h2>
          </div>
          <Badge status="pending" label="Target Slot: Next Tuesday 14:00 - 17:00 IST" />
        </div>

        <p className="text-xs text-[#A1A1AA] leading-relaxed">
          Both students requested the identical 3-hour physical slot. The pure allocation engine evaluates:
          <span className="text-[#FFD60A] font-semibold"> 0.35 × Urgency + 0.35 × Wait Time + 0.30 × Usage Fairness</span>.
        </p>

        {/* Competing Requests Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Arjun Patel */}
          <div className={`p-5 rounded-xl border flex flex-col justify-between space-y-4 transition-all ${
            arjunStatus === 'approved' ? 'bg-[#0E2916]/40 border-[#4ADE80]' : 'bg-[#17171A] border-[#FFD60A] shadow-[0_0_15px_rgba(255,214,10,0.1)]'
          }`}>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#FFD60A] text-[#0A0A0A]">
                  ★ Rank #1 Winner (72.0%)
                </span>
                <Badge status={arjunStatus === 'approved' ? 'approved' : 'pending'} />
              </div>

              <div>
                <h3 className="font-bold text-base text-[#F5F5F5]">Arjun Patel</h3>
                <span className="text-[11px] text-[#A1A1AA] block font-mono">student1@lablink.demo • Physics</span>
                <p className="text-xs text-[#F5F5F5] font-medium mt-1">
                  Thin-film Epitaxial Layer XRD Analysis
                </p>
              </div>

              <div className="bg-[#050505] p-3 rounded-lg border border-[#26262B] text-xs space-y-1 font-mono text-[#A1A1AA]">
                <div className="flex justify-between">
                  <span>Claimed Deadline:</span>
                  <span className="text-[#FBBF24] font-bold">2 days away (Urgency: 85.7%)</span>
                </div>
                <div className="flex justify-between">
                  <span>Queue Waiting:</span>
                  <span className="text-[#F5F5F5]">Submitted 3d ago (Wait: 42.9%)</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Usage:</span>
                  <span className="text-[#4ADE80]">2 hours prior (Fairness: 90.0%)</span>
                </div>
              </div>

              <ScoreBar score={0.72} label="Composite Engine Score (72.0%)" />

              <div className="p-2.5 rounded-lg bg-[#FFD60A]/5 border border-[#FFD60A]/20 text-[11px] text-[#A1A1AA] leading-relaxed">
                <span className="text-[#FFD60A] font-bold block mb-0.5">Engine Explanation:</span>
                Urgent thesis deadline in 2 days and low prior equipment usage (2.0 hrs) justifies top priority ranking.
              </div>
            </div>

            <Button
              type="button"
              variant={arjunStatus === 'approved' ? 'secondary' : 'primary'}
              size="sm"
              disabled={arjunStatus === 'approved'}
              onClick={handleApproveArjun}
              className="w-full"
            >
              {arjunStatus === 'approved' ? '✓ Approved & Booking Confirmed' : '1. Approve Arjun (Winner)'}
            </Button>
          </div>

          {/* Meera Nair */}
          <div className={`p-5 rounded-xl border flex flex-col justify-between space-y-4 transition-all ${
            meeraStatus === 'conflict' ? 'bg-[#2D1111]/40 border-[#F87171]' : 'bg-[#0F0F10] border-[#26262B]'
          }`}>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#17171A] text-[#A1A1AA] border border-[#26262B]">
                  Rank #2 Fallback (27.0%)
                </span>
                <Badge status={meeraStatus === 'conflict' ? 'rejected' : 'pending'} label={meeraStatus === 'conflict' ? '23P01 Blocked' : 'Pending'} />
              </div>

              <div>
                <h3 className="font-bold text-base text-[#F5F5F5]">Meera Nair</h3>
                <span className="text-[11px] text-[#A1A1AA] block font-mono">student2@lablink.demo • Physics</span>
                <p className="text-xs text-[#F5F5F5] font-medium mt-1">
                  Polycrystalline Alloy Phase Identification
                </p>
              </div>

              <div className="bg-[#050505] p-3 rounded-lg border border-[#26262B] text-xs space-y-1 font-mono text-[#A1A1AA]">
                <div className="flex justify-between">
                  <span>Claimed Deadline:</span>
                  <span className="text-[#A1A1AA]">10 days away (Urgency: 28.6%)</span>
                </div>
                <div className="flex justify-between">
                  <span>Queue Waiting:</span>
                  <span className="text-[#A1A1AA]">Submitted 1d ago (Wait: 14.3%)</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Usage:</span>
                  <span className="text-[#F87171]">12 hours prior (Fairness: 40.0%)</span>
                </div>
              </div>

              <ScoreBar score={0.27} label="Composite Engine Score (27.0%)" />

              {meeraStatus === 'conflict' ? (
                <div className="p-3 rounded-lg bg-[#2D1111] border border-[#F87171]/40 text-xs text-[#F87171] space-y-1 animate-fade-up">
                  <span className="font-bold block">PostgreSQL Kernel Exclusion Safety (SQLSTATE 23P01):</span>
                  <p className="text-[11px] leading-relaxed text-[#F5F5F5]">
                    Double-booking was blocked at the database kernel level by `EXCLUDE USING GIST`.
                  </p>
                  <p className="text-[11px] text-[#FFD60A] font-semibold pt-1">
                    Earliest Recommended Alternative Slot: Next Wednesday 09:00 - 12:00 IST
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-[#17171A] border border-[#26262B] text-[11px] text-[#A1A1AA] leading-relaxed">
                  <span className="text-[#F5F5F5] font-semibold block mb-0.5">Engine Explanation:</span>
                  Distant deadline (10 days) and high monthly usage (12.0 hrs) yields lower queue ranking.
                </div>
              )}
            </div>

            <Button
              type="button"
              variant={meeraStatus === 'conflict' ? 'secondary' : 'danger'}
              size="sm"
              disabled={meeraStatus === 'conflict'}
              onClick={handleTryApproveMeera}
              className="w-full"
            >
              {meeraStatus === 'conflict' ? '✓ Overlap Blocked & Alternative Given' : '2. Simulate Double-Booking (Meera)'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
