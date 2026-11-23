import Link from 'next/link';
import { getEquipmentList, getDepartments } from '@/queries/equipment.queries';
import { createClient } from '@/data/supabase/server';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function LandingPage() {
  const departments = await getDepartments().catch(() => []);
  const allEquipment = await getEquipmentList().catch(() => []);
  const featured = allEquipment.slice(0, 6);

  // Live stats from database with zero-state fallback (never faked)
  let requestsCount = 0;
  try {
    const supabase = await createClient();
    const { count } = await supabase.from('booking_requests').select('*', { count: 'exact', head: true });
    requestsCount = count || 0;
  } catch {
    requestsCount = 0;
  }

  return (
    <div className="space-y-16 py-4">
      {/* Hero Section */}
      <section className="relative rounded-2xl border border-[#26262B] bg-gradient-to-b from-[#0F0F10] via-[#050505] to-[#050505] p-8 sm:p-14 overflow-hidden text-center space-y-6">
        <div className="absolute inset-0 bg-[radial-gradient(#FFD60A_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#17171A] border border-[#26262B] text-xs font-semibold text-[#FFD60A]">
          <span className="w-2 h-2 rounded-full bg-[#FFD60A] animate-pulse" />
          <span>GenAI Campus Resource Sharing Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-[#F5F5F5] tracking-tight max-w-4xl mx-auto leading-tight">
          Every campus lab. <br className="hidden sm:inline" />
          <span className="text-[#FFD60A]">One fair queue.</span>
        </h1>

        <p className="text-[#A1A1AA] text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Discover specialized research equipment across faculties, book time slots in campus hours, and eliminate double-booking through deterministic, multi-factor fair allocation.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/equipment">
            <Button variant="primary" size="lg">
              Browse equipment →
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg">
              Sign in
            </Button>
          </Link>
        </div>
      </section>

      {/* Live Stats Strip */}
      <section aria-label="Campus Lab Statistics" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0F0F10] border border-[#26262B] rounded-xl p-5 text-center space-y-1">
          <span className="text-3xl font-black font-mono text-[#FFD60A]">{allEquipment.length}</span>
          <span className="block text-xs uppercase tracking-wider text-[#A1A1AA] font-semibold">Instruments Catalogued</span>
        </div>
        <div className="bg-[#0F0F10] border border-[#26262B] rounded-xl p-5 text-center space-y-1">
          <span className="text-3xl font-black font-mono text-[#F5F5F5]">{departments.length}</span>
          <span className="block text-xs uppercase tracking-wider text-[#A1A1AA] font-semibold">Participating Departments</span>
        </div>
        <div className="bg-[#0F0F10] border border-[#26262B] rounded-xl p-5 text-center space-y-1">
          <span className="text-3xl font-black font-mono text-[#4ADE80]">{requestsCount}</span>
          <span className="block text-xs uppercase tracking-wider text-[#A1A1AA] font-semibold">Allocations Processed</span>
        </div>
      </section>

      {/* How It Works (3 Steps) */}
      <section aria-labelledby="how-it-works-heading" className="space-y-6">
        <div className="text-center space-y-1.5">
          <h2 id="how-it-works-heading" className="text-2xl font-bold text-[#F5F5F5]">How It Works</h2>
          <p className="text-xs text-[#A1A1AA]">A transparent three-step cycle for students and faculty.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card hoverLift className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#17171A] border border-[#26262B] flex items-center justify-center text-[#FFD60A] font-bold text-sm">
              01
            </div>
            <h3 className="text-base font-bold text-[#F5F5F5]">Discover</h3>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Explore specialized instruments across Physics, Chemistry, and Engineering. Check technical parameters and live availability timelines.
            </p>
          </Card>

          <Card hoverLift className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#17171A] border border-[#26262B] flex items-center justify-center text-[#FFD60A] font-bold text-sm">
              02
            </div>
            <h3 className="text-base font-bold text-[#F5F5F5]">Request</h3>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Submit your project objectives, target campus slot, and thesis deadline. Up to 3 active pending requests per student are permitted simultaneously.
            </p>
          </Card>

          <Card hoverLift className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#17171A] border border-[#26262B] flex items-center justify-center text-[#FFD60A] font-bold text-sm">
              03
            </div>
            <h3 className="text-base font-bold text-[#F5F5F5]">Fair Allocation</h3>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              When requests conflict for the same slot, the engine ranks applicants using pure deterministic math. Confirmed bookings are sealed at the DB kernel.
            </p>
          </Card>
        </div>
      </section>

      {/* Featured Equipment Grid */}
      <section aria-labelledby="featured-heading" className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 id="featured-heading" className="text-2xl font-bold text-[#F5F5F5]">Featured Instruments</h2>
            <p className="text-xs text-[#A1A1AA]">High-demand specialized apparatus on campus.</p>
          </div>
          <Link href="/equipment" className="text-xs font-semibold text-[#FFD60A] hover:underline">
            View all ({allEquipment.length}) →
          </Link>
        </div>

        {featured.length === 0 ? (
          <div className="text-center py-12 bg-[#0F0F10] border border-[#26262B] rounded-xl text-xs text-[#A1A1AA]">
            No equipment listed in the catalogue yet. Connect database to view active entries.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((item) => (
              <Card key={item.id} hoverLift className="flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-[#17171A] text-[#A1A1AA] font-mono border border-[#26262B]">
                      {item.category}
                    </span>
                    <Badge status={item.isOperational ? 'operational' : 'maintenance'} />
                  </div>
                  <h3 className="text-base font-bold text-[#F5F5F5]">
                    <Link href={`/equipment/${item.id}`} className="hover:text-[#FFD60A] transition-colors">
                      {item.name}
                    </Link>
                  </h3>
                  <p className="text-xs text-[#A1A1AA] line-clamp-2 leading-relaxed">{item.description}</p>
                </div>

                <div className="pt-2 border-t border-[#26262B] flex items-center justify-between">
                  <span className="text-[11px] text-[#A1A1AA]">
                    {item.labOpen} - {item.labClose} IST
                  </span>
                  <Link href={`/equipment/${item.id}`}>
                    <Button variant="secondary" size="sm">
                      Inspect & Book
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Why It Is Fair */}
      <section aria-labelledby="fairness-heading" className="bg-[#0F0F10] border border-[#26262B] rounded-2xl p-8 space-y-6">
        <div className="space-y-1">
          <h2 id="fairness-heading" className="text-2xl font-bold text-[#F5F5F5]">Why It Is Fair</h2>
          <p className="text-xs text-[#A1A1AA]">
            Every slot conflict is resolved transparently by our pure allocation formula: (0.35 × Urgency + 0.35 × Wait + 0.30 × Past Fairness).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-[#17171A] p-4 rounded-xl border border-[#26262B] space-y-2">
            <span className="font-bold text-[#FFD60A] block">1. Deadline Urgency (35%)</span>
            <p className="text-[#A1A1AA] leading-relaxed">
              Students facing imminent paper or thesis deadlines receive higher priority to prevent academic delays.
            </p>
          </div>
          <div className="bg-[#17171A] p-4 rounded-xl border border-[#26262B] space-y-2">
            <span className="font-bold text-[#FFD60A] block">2. Waiting Time (35%)</span>
            <p className="text-[#A1A1AA] leading-relaxed">
              Requests that have waited longer in the queue gain compounding credit so patience is always rewarded.
            </p>
          </div>
          <div className="bg-[#17171A] p-4 rounded-xl border border-[#26262B] space-y-2">
            <span className="font-bold text-[#FFD60A] block">3. Past Usage Fairness (30%)</span>
            <p className="text-[#A1A1AA] leading-relaxed">
              First-time and infrequent lab users are protected from queue starvation caused by heavy instrument users.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
