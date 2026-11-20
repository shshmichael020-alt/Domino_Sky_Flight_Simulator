import React from 'react';
import { Plane, Search, Filter } from 'lucide-react';

export type GanttStatusFilter = 'ALL' | 'DELAYED' | 'BREACH' | 'SPARE';

interface GanttControlsProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  statusFilter: GanttStatusFilter;
  onStatusFilterChange: (val: GanttStatusFilter) => void;
}

export const GanttControls: React.FC<GanttControlsProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}) => {
  return (
    <div className="p-3 bg-[#111827] border-b border-[#242a3a] flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-mono text-[#dde2f8]">
          <Plane className="w-4 h-4 text-[#4cd7f6]" />
          <span className="font-bold">TACTICAL ROTATION TIMELINE</span>
          <span className="text-[#869397]">(16 ACTIVE TAILS + 2 RESERVES)</span>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#869397] absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search flight or tail..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-[#080e1d] text-[#dde2f8] font-mono text-xs pl-8 pr-3 py-1 rounded border border-[#334155] focus:outline-none focus:border-[#4cd7f6] w-44"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-[#869397]" />
        <button
          onClick={() => onStatusFilterChange('ALL')}
          className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors ${
            statusFilter === 'ALL'
              ? 'bg-[#1e293b] text-[#4cd7f6] border border-[#4cd7f6]/40'
              : 'text-[#869397] hover:text-[#dde2f8]'
          }`}
        >
          ALL (70)
        </button>
        <button
          onClick={() => onStatusFilterChange('DELAYED')}
          className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors ${
            statusFilter === 'DELAYED'
              ? 'bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/40'
              : 'text-[#869397] hover:text-[#dde2f8]'
          }`}
        >
          DELAYED ONLY
        </button>
        <button
          onClick={() => onStatusFilterChange('BREACH')}
          className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors ${
            statusFilter === 'BREACH'
              ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40'
              : 'text-[#869397] hover:text-[#dde2f8]'
          }`}
        >
          CREW BREACH
        </button>
      </div>
    </div>
  );
};
