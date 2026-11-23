import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/queries/profile.queries';
import { getFacultyQueue } from '@/queries/booking.queries';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScoreBar } from '@/components/ui/score-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { FacultyReviewActions } from '@/components/faculty-review-actions';
import { VerifyDeadlineButton } from '@/components/verify-deadline-button';

export default async function FacultyQueuePage() {
  const profile = await getCurrentProfile().catch(() => null);
  if (!profile) {
    redirect('/login');
  }

  if (profile.role !== 'faculty' && profile.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <h1 className="text-xl font-bold text-[#F87171]">Restricted Access</h1>
        <p className="text-xs text-[#A1A1AA]">
          The Department Review Queue is accessible strictly to faculty members and lab admins.
        </p>
      </div>
    );
  }

  const queueItems = await getFacultyQueue(
    profile.role === 'admin' ? undefined : profile.departmentId
  ).catch(() => []);

  return (
    <div className="space-y-10">
      <PageHeader
        badge="Pure View-Time Dynamic Scoring"
        title="Department Review Queue"
        description="Review and resolve competing instrument requests. The pure allocation engine evaluates urgency (35%), waiting time (35%), and prior usage fairness (30%) deterministically."
      />

      {queueItems.length === 0 ? (
        <EmptyState
          title="Review queue is clear"
          description="There are currently no competing pending requests awaiting faculty adjudication in your department."
          icon="✓"
        />
      ) : (
        <div className="space-y-12">
          {queueItems.map((item) => (
            <Card key={item.equipment.id} className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-[#26262B]">
                <div className="space-y-1">
                  <span className="text-xs font-mono text-[#A1A1AA]">{item.equipment.category}</span>
                  <h2 className="text-xl font-bold text-[#F5F5F5]">{item.equipment.name}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status="pending" label={`${item.rankedResult.rankedQueue.length} Competing Requests`} />
                </div>
              </div>

              {/* Competing requests grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {item.rankedResult.rankedQueue.map((scored, index) => {
                  const raw = item.rawRequests.find((r) => r.id === scored.request.id);
                  const isWinner = item.rankedResult.winner?.request.id === scored.request.id;

                  return (
                    <div
                      key={scored.request.id}
                      className={`rounded-xl p-5 border flex flex-col justify-between space-y-4 transition-all ${
                        isWinner
                          ? 'bg-[#17171A] border-[#FFD60A] shadow-[0_0_20px_rgba(255,214,10,0.12)]'
                          : 'bg-[#0F0F10] border-[#26262B]'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Header badge & rank */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              isWinner
                                ? 'bg-[#FFD60A] text-[#0A0A0A]'
                                : 'bg-[#17171A] text-[#A1A1AA] border border-[#26262B]'
                            }`}
                          >
                            {isWinner ? '★ Rank 1 (Engine Winner)' : `Rank #${index + 1}`}
                          </span>
                          <span className="text-xs font-mono font-bold text-[#FFD60A]">
                            Score: {scored.scoreBreakdown ? (scored.scoreBreakdown.finalScore * 100).toFixed(1) : '0.0'}%
                          </span>
                        </div>

                        {/* Project Info */}
                        <div>
                          <h3 className="font-bold text-[#F5F5F5] text-base">{scored.request.projectTitle}</h3>
                          <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
                            {scored.request.projectDescription}
                          </p>
                        </div>

                        {/* Student Details */}
                        <div className="bg-[#050505] p-3 rounded-lg border border-[#26262B] text-xs space-y-1.5 text-[#A1A1AA]">
                          <div className="flex justify-between items-center">
                            <span>Student:</span>
                            <span className="text-[#F5F5F5] font-semibold">{raw?.profiles?.full_name || 'Student'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Target Slot:</span>
                            <span className="text-[#FFD60A] font-mono text-[11px]">{raw?.time_range}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-[#26262B]">
                            <span>Claimed Deadline:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[#F5F5F5] font-mono text-[11px]">
                                {new Date(scored.request.deadline).toLocaleDateString()}
                              </span>
                              <VerifyDeadlineButton initialVerified={scored.request.deadlineVerified} />
                            </div>
                          </div>
                        </div>

                        {/* Animated Score Bar */}
                        <ScoreBar
                          score={scored.scoreBreakdown?.finalScore || 0}
                          label="Weighted Allocation Score"
                        />

                        {/* Human-readable justification */}
                        <div className="p-3 rounded-lg bg-[#FFD60A]/5 border border-[#FFD60A]/20 text-xs text-[#F5F5F5] space-y-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#FFD60A] block">
                            Engine Justification
                          </span>
                          <p className="leading-relaxed">{scored.explanation}</p>
                        </div>

                        {/* Suggested Alternatives (for Fallbacks) */}
                        {scored.alternativeSlots && scored.alternativeSlots.length > 0 && (
                          <div className="p-3 rounded-lg bg-[#050505] border border-[#26262B] text-xs space-y-1.5">
                            <span className="text-[11px] font-semibold text-[#A1A1AA] block">
                              Earliest Free Alternatives (if conflicted):
                            </span>
                            <ul className="text-[11px] font-mono text-[#FFD60A] space-y-1">
                              {scored.alternativeSlots.slice(0, 2).map((alt, aIdx) => (
                                <li key={aIdx}>
                                  → {alt.start.toISOString().slice(0, 16).replace('T', ' ')} IST
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Review Action Controls */}
                      <FacultyReviewActions requestId={scored.request.id} isWinner={isWinner} />
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
