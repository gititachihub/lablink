import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto text-center py-20 space-y-4">
      <div className="w-12 h-12 rounded-xl bg-[#17171A] border border-[#26262B] flex items-center justify-center text-xl mx-auto text-[#FFD60A]">
        404
      </div>
      <h1 className="text-xl font-bold text-[#F5F5F5]">Page Not Found</h1>
      <p className="text-xs text-[#A1A1AA] leading-relaxed">
        The requested lab instrument, page, or allocation queue could not be located on campus.
      </p>
      <Link href="/">
        <Button variant="primary" size="sm">
          Return to Catalogue
        </Button>
      </Link>
    </div>
  );
}
