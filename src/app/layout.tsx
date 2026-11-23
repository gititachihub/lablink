import type { Metadata } from 'next';
import './globals.css';
import { NavigationBar } from '@/components/navbar';
import { getCurrentProfile } from '@/queries/profile.queries';

export const metadata: Metadata = {
  title: 'LabLink | Campus Specialized Equipment Sharing Platform',
  description:
    'Every campus lab. One fair queue. Discover, book and fairly allocate shared research equipment with zero double-booking risk.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentProfile().catch(() => null);

  return (
    <html lang="en" className="dark">
      <body className="bg-[#050505] text-[#F5F5F5] antialiased min-h-screen flex flex-col">
        {/* Accessible Skip Link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#FFD60A] focus:text-[#0A0A0A] focus:font-bold focus:rounded-lg focus:shadow-lg"
        >
          Skip to main content
        </a>

        {/* Global Navigation Bar */}
        <NavigationBar profile={profile} />

        {/* Main Landmark */}
        <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-up">
          {children}
        </main>

        {/* Semantic Footer with Demo Data Notice */}
        <footer className="border-t border-[#26262B] bg-[#050505] py-6 text-center text-xs text-[#A1A1AA]">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#FFD60A]" aria-hidden="true" />
              <span>LabLink — Free Tier Campus Resource Sharing Platform.</span>
            </p>
            <p className="text-[11px] text-[#71717A]">
              Demo data notice: All equipment, departments, and user credentials are synthetic demo entries for evaluation.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
