import React from 'react';

export const MapLegend: React.FC = () => {
  return (
    <div className="absolute bottom-3 left-3 bg-[#080e1d]/90 p-2.5 rounded border border-[#242a3a] text-[10px] font-mono text-[#869397] flex flex-wrap gap-3 backdrop-blur-sm">
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
        <span>On-Time</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
        <span>Direct Delayed (&lt;45m)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]"></span>
        <span>Cascade Delayed (&ge;45m)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span>
        <span>Closed / Breach</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]"></span>
        <span>Recovered / Spare</span>
      </div>
    </div>
  );
};
