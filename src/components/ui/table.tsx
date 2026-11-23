import React from 'react';

export interface TableProps {
  caption: string;
  headers: string[];
  children: React.ReactNode;
  className?: string;
}

export function Table({ caption, headers, children, className = '' }: TableProps) {
  return (
    <div className={`w-full overflow-x-auto border border-[#26262B] rounded-xl bg-[#0F0F10] ${className}`}>
      <table className="w-full text-left text-sm text-[#F5F5F5] border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-[#17171A] text-xs uppercase font-mono tracking-wider text-[#A1A1AA] border-b border-[#26262B]">
          <tr>
            {headers.map((h, i) => (
              <th key={i} scope="col" className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#26262B] text-xs">{children}</tbody>
      </table>
    </div>
  );
}
