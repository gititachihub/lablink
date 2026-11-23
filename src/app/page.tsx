import Link from 'next/link';
import { getEquipmentList, getDepartments } from '@/queries/equipment.queries';

export default async function HomePage(props: {
  searchParams: Promise<{ q?: string; dept?: string; cat?: string }>;
}) {
  const searchParams = await props.searchParams;
  const departments = await getDepartments();
  const equipment = await getEquipmentList({
    query: searchParams.q,
    departmentId: searchParams.dept,
    category: searchParams.cat,
  });

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-8 sm:p-12 relative overflow-hidden">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-semibold">
            <span>Deterministic Conflict Resolution</span> • <span>Postgres GIST Kernel Safety</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Discover & Book Campus <span className="text-yellow-400">Specialized Labs</span>
          </h1>
          <p className="text-zinc-400 text-base sm:text-lg">
            Fair, transparent access to high-value research instruments across Physics, Chemistry, and Biomedical Engineering with zero double-booking risk.
          </p>
        </div>
      </section>

      {/* Filter Bar */}
      <section aria-label="Filters" className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
        <form method="GET" className="flex flex-1 gap-2">
          <input
            type="text"
            name="q"
            defaultValue={searchParams.q || ''}
            placeholder="Search equipment by name..."
            aria-label="Search equipment by name"
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-500 focus-visible:border-yellow-400"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded-lg text-sm hover:bg-yellow-300 transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-lg border transition-colors ${
              !searchParams.dept ? 'bg-yellow-400 text-black border-yellow-400 font-bold' : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-500'
            }`}
          >
            All Depts
          </Link>
          {departments.map((d) => (
            <Link
              key={d.id}
              href={`/?dept=${d.id}`}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${
                searchParams.dept === d.id ? 'bg-yellow-400 text-black border-yellow-400 font-bold' : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-500'
              }`}
            >
              {d.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Equipment Grid */}
      <section aria-label="Equipment Catalogue">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Available Instruments ({equipment.length})</h2>
          <span className="text-xs text-zinc-500">All times stored UTC, scheduled in Asia/Kolkata</span>
        </div>

        {equipment.length === 0 ? (
          <div className="text-center py-12 bg-zinc-900/30 rounded-xl border border-zinc-800 text-zinc-400">
            No equipment found matching your criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {equipment.map((item) => (
              <div
                key={item.id}
                className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-700 transition-all space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium">
                      {item.category}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                      item.isOperational ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}>
                      {item.isOperational ? 'Operational' : 'Maintenance'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white hover:text-yellow-400 transition-colors">
                    <Link href={`/equipment/${item.id}`}>{item.name}</Link>
                  </h3>
                  <p className="text-zinc-400 text-xs line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800 text-xs space-y-1.5 text-zinc-400">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Operating Hours:</span>
                      <span className="text-zinc-300 font-mono">{item.labOpen} - {item.labClose} IST</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Max Duration:</span>
                      <span className="text-zinc-300 font-mono">{item.maxBookingHours} hrs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Prerequisite:</span>
                      <span className={item.requiresTraining ? 'text-amber-400 font-medium' : 'text-zinc-400'}>
                        {item.requiresTraining ? 'Training Required' : 'Open Access'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <Link
                    href={`/equipment/${item.id}`}
                    className="flex-1 py-2 px-3 text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-700 transition-colors"
                  >
                    View Specs
                  </Link>
                  <Link
                    href={`/dashboard/bookings?equipmentId=${item.id}`}
                    className="flex-1 py-2 px-3 text-center bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold rounded-lg transition-colors shadow-sm"
                  >
                    Book Slot
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
