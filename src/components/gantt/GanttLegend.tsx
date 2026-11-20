import React from 'react';

export const GanttLegend: React.FC = () => {
  return (
    <div className="p-3 bg-[#111827] border-t border-[#242a3a] flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-[#869397]">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[2px] bg-[#10b981]"></span>
          <span>On-Time (&lt;1m)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[2px] bg-[#f59e0b]"></span>
          <span>Direct Delay (&lt;45m)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[2px] bg-[#f97316]"></span>
          <span>Cascade Delay (&ge;45m)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[2px] bg-[#ef4444]"></span>
          <span>DGCA Crew Breach</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[2px] bg-[#06b6d4]"></span>
          <span>Spare Aircraft Swap</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[2px] bg-[#94a3b8] line-through"></span>
          <span>Cancelled</span>
        </div>
      </div>

      <div>
        <span>Click any block to inspect full causal cascade & telemetry</span>
      </div>
    </div>
  );
};
