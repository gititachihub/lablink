import Link from 'next/link';
import { getCurrentProfile } from '@/queries/profile.queries';
import { signOutAction } from '@/actions/auth.actions';

export async function Navbar() {
  const profile = await getCurrentProfile();

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2 text-xl font-bold tracking-tight text-white hover:text-yellow-400 focus-visible:text-yellow-400">
            <span className="w-8 h-8 rounded-lg bg-yellow-400 text-black flex items-center justify-center font-black text-sm">
              LL
            </span>
            <span>LabLink</span>
            <span className="text-xs px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 font-medium">
              Campus Share
            </span>
          </Link>
          <nav aria-label="Main Navigation" className="hidden md:flex items-center space-x-4 text-sm font-medium">
            <Link href="/" className="text-zinc-300 hover:text-yellow-400 px-3 py-1.5 rounded-md hover:bg-zinc-900 transition-colors">
              Catalogue
            </Link>
            {profile && (
              <Link href="/dashboard/bookings" className="text-zinc-300 hover:text-yellow-400 px-3 py-1.5 rounded-md hover:bg-zinc-900 transition-colors">
                My Bookings
              </Link>
            )}
            {profile && (profile.role === 'faculty' || profile.role === 'admin') && (
              <Link href="/dashboard/queue" className="text-zinc-300 hover:text-yellow-400 px-3 py-1.5 rounded-md hover:bg-zinc-900 transition-colors">
                Review Queue
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          {profile ? (
            <div className="flex items-center space-x-3 text-sm">
              <span className="text-zinc-400 hidden sm:inline">
                {profile.fullName} <span className="text-xs uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-yellow-400 font-semibold">{profile.role}</span>
              </span>
              <form action={signOutAction}>
                <button type="submit" className="px-3 py-1.5 rounded-md bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700 text-xs font-medium cursor-pointer">
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <div className="flex items-center space-x-3 text-sm">
              <Link href="/login" className="text-zinc-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-zinc-900 transition-colors">
                Sign in
              </Link>
              <Link href="/register" className="px-3 py-1.5 rounded-md bg-yellow-400 text-black hover:bg-yellow-300 font-semibold text-xs transition-colors shadow-sm">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
