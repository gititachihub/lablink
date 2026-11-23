import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/queries/profile.queries';
import { getFacultyQueue } from '@/queries/booking.queries';
import { FacultyReviewActions } from '@/components/faculty-review-actions';

export default async function FacultyQueuePage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login');
  }

  if (profile.role !== 'faculty' && profile.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <h1 className="text-xl font-bold text-rose-400">Restricted Access</h1>
        <p className="text-zinc-400 text-xs">
          The Department Review Queue is restricted to faculty members and laboratory administrators.
        </p>
      </div>
    );
  }

  const queueItems = await getFacultyQueue(profile.role === 'admin' ? undefined : profile.departmentId);

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 text-xs font-semibold mb-2">
            <span>Dynamic View-Time Scoring</span> • <span>Injected Clock</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Department Review Queue</h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Review and resolve conflicting booking requests using mathematically fair allocation scoring.
          </p>
        </div>
        <div className="text-xs bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg text-zinc-400 space-y-1">
          <div><span className="text-yellow-400 font-bold">Urgency (35%)</span>: Days to deadline</div>
          <div><span className="text-yellow-400 font-bold">Wait Time (35%)</span>: Days in queue</div>
          <div><span className="text-yellow-400 font-bold">Fairness (30%)</span>: Monthly hours used</div>
        </div>
      </div>

      {queueItems.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/30 rounded-2xl border border-zinc-800 text-zinc-400 space-y-2">
          <p className="text-lg font-bold text-zinc-300">No Pending Requests</p>
          <p className="text-xs text-zinc-500">All equipment requests in your department have been reviewed.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {queueItems.map((item) => (
            <div key={item.equipment.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-zinc-800">
                <div>
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                    {item.equipment.category}
                  </span>
                  <h2 className="text-xl font-bold text-white mt-1">{item.equipment.name}</h2>
                </div>
                <div className="text-xs text-zinc-400 font-mono">
                  {item.rankedResult.rankedQueue.length} Conflicting Requests
                </div>
              </div>

              {/* Pitch flow & ranked cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {item.rankedResult.rankedQueue.map((scored, index) => {
                  const raw = item.rawRequests.find((r) => r.id === scored.request.id);
                  const isWinner = item.rankedResult.winner?.request.id === scored.request.id;

                  return (
                    <div
                      key={scored.request.id}
                      className={`rounded-xl p-5 border flex flex-col justify-between space-y-4 transition-all ${
                        isWinner
                          ? 'bg-zinc-950/90 border-yellow-400/80 shadow-[0_0_15px_rgba(250,204,21,0.07)]'
                          : 'bg-zinc-950/50 border-zinc-800'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            isWinner ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            {isWinner ? '★ Rank 1 (Recommended)' : `Rank #${index + 1}`}
                          </span>
                          <span className="text-xs font-mono font-bold text-yellow-400">
                            Score: {scored.scoreBreakdown ? (scored.scoreBreakdown.finalScore * 100).toFixed(1) : '0.0'}%
                          </span>
                        </div>

                        <div>
                          <h3 className="font-bold text-white text-base">{scored.request.projectTitle}</h3>
                          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                            {scored.request.projectDescription}
                          </p>
                        </div>

                        {/* Student Info */}
                        <div className="text-xs text-zinc-500 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80 space-y-1">
                          <div className="flex justify-between">
                            <span>Student:</span>
                            <span className="text-zinc-300 font-medium">{raw?.profiles?.full_name || 'Student'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Email:</span>
                            <span className="text-zinc-400 font-mono text-[11px]">{raw?.profiles?.email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Slot Requested:</span>
                            <span className="text-zinc-300 font-mono text-[11px]">{raw?.time_range}</span>
                          </div>
                        </div>

                        {/* Explanation & Breakdown */}
                        <div className="text-xs space-y-2">
                          <div className="bg-yellow-400/5 p-3 rounded-lg border border-yellow-400/20 text-zinc-300 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-yellow-400 tracking-wider block">
                              Allocation Engine Breakdown
                            </span>
                            <p className="text-xs leading-relaxed">{scored.explanation}</p>
                          </div>

                          {scored.scoreBreakdown && (
                            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono">
                              <div className="p-1.5 rounded bg-zinc-900 border border-zinc-800">
                                <span className="text-zinc-500 block">Urgency (0.35)</span>
                                <span className="text-yellow-400 font-bold">{(scored.scoreBreakdown.urgency * 100).toFixed(0)}%</span>
                              </div>
                              <div className="p-1.5 rounded bg-zinc-900 border border-zinc-800">
                                <span className="text-zinc-500 block">Wait (0.35)</span>
                                <span className="text-yellow-400 font-bold">{(scored.scoreBreakdown.wait * 100).toFixed(0)}%</span>
                              </div>
                              <div className="p-1.5 rounded bg-zinc-900 border border-zinc-800">
                                <span className="text-zinc-500 block">Fairness (0.30)</span>
                                <span className="text-yellow-400 font-bold">{(scored.scoreBreakdown.fairness * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Alternative Slots (For Fallbacks) */}
                        {scored.alternativeSlots && scored.alternativeSlots.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] space-y-1">
                            <span className="text-zinc-400 font-semibold block">Suggested Next Open Slots:</span>
                            <ul className="text-zinc-400 font-mono space-y-0.5">
                              {scored.alternativeSlots.slice(0, 2).map((slot, sIdx) => (
                                <li key={sIdx} className="text-yellow-400/80">
                                  → {slot.start.toISOString().slice(0, 16).replace('T', ' ')} UTC
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <FacultyReviewActions
                        requestId={scored.request.id}
                        isWinner={isWinner}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
