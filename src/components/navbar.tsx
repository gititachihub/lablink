'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signOutAction } from '@/actions/auth.actions';
import type { UserProfile } from '@/queries/profile.queries';

export function NavigationBar({ profile }: { profile: UserProfile | null }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b border-[#26262B] bg-[#050505]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Wordmark */}
        <div className="flex items-center space-x-8">
          <Link
            href="/"
            className="flex items-center space-x-2.5 text-lg font-black tracking-tight text-[#F5F5F5] hover:text-[#FFD60A] transition-colors"
          >
            <span className="w-7 h-7 rounded-lg bg-[#FFD60A] text-[#0A0A0A] flex items-center justify-center font-black text-xs shadow-sm">
              LL
            </span>
            <span>
              Lab<span className="text-[#FFD60A]">Link</span>
            </span>
          </Link>

          {/* Desktop Nav by Role */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center space-x-1 text-xs font-semibold">
            <Link
              href="/equipment"
              className="text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#17171A] px-3 py-1.5 rounded-lg transition-colors"
            >
              Equipment
            </Link>
            {profile && (
              <Link
                href="/dashboard/requests"
                className="text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#17171A] px-3 py-1.5 rounded-lg transition-colors"
              >
                My Requests
              </Link>
            )}
            {profile && (profile.role === 'faculty' || profile.role === 'admin') && (
              <Link
                href="/dashboard/queue"
                className="text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#17171A] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span>Faculty Queue</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFD60A]" />
              </Link>
            )}
          </nav>
        </div>

        {/* User / Sign In actions */}
        <div className="hidden md:flex items-center space-x-3 text-xs">
          {profile ? (
            <div className="flex items-center space-x-3">
              <span className="text-[#A1A1AA]">
                {profile.fullName}{' '}
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#17171A] text-[#FFD60A] border border-[#26262B]">
                  {profile.role}
                </span>
              </span>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#17171A] hover:bg-[#202024] text-[#F5F5F5] border border-[#26262B] transition-colors cursor-pointer"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg text-[#F5F5F5] hover:bg-[#17171A] transition-colors font-medium"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="px-3 py-1.5 rounded-lg bg-[#FFD60A] text-[#0A0A0A] font-bold hover:bg-[#ffe033] transition-colors shadow-sm"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation menu"
            className="p-2 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] bg-[#17171A] border border-[#26262B]"
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#26262B] bg-[#0F0F10] p-4 space-y-3">
          <nav aria-label="Mobile Navigation" className="flex flex-col space-y-2 text-sm">
            <Link
              href="/equipment"
              onClick={() => setMobileOpen(false)}
              className="text-[#A1A1AA] hover:text-[#F5F5F5] py-1.5"
            >
              Equipment Catalogue
            </Link>
            {profile && (
              <Link
                href="/dashboard/requests"
                onClick={() => setMobileOpen(false)}
                className="text-[#A1A1AA] hover:text-[#F5F5F5] py-1.5"
              >
                My Requests
              </Link>
            )}
            {profile && (profile.role === 'faculty' || profile.role === 'admin') && (
              <Link
                href="/dashboard/queue"
                onClick={() => setMobileOpen(false)}
                className="text-[#FFD60A] py-1.5 font-bold"
              >
                Faculty Review Queue
              </Link>
            )}
            <div className="pt-2 border-t border-[#26262B] flex flex-col gap-2">
              {profile ? (
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="w-full text-left py-1.5 text-xs text-[#F87171]"
                  >
                    Sign out ({profile.email})
                  </button>
                </form>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="text-[#A1A1AA] py-1">
                    Sign in
                  </Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)} className="text-[#FFD60A] font-bold py-1">
                    Register
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
