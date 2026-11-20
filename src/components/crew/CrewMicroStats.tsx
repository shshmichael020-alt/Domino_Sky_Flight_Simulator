import React from 'react';

interface CrewMicroStatsProps {
  totalCount: number;
  tightCount: number;
  breachedCount: number;
}

export const CrewMicroStats: React.FC<CrewMicroStatsProps> = ({
  totalCount,
  tightCount,
  breachedCount,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="bg-[#0d1322] p-2.5 rounded border border-[#242a3a] flex items-center justify-between">
        <span className="text-[10px] font-mono text-[#869397] uppercase">
          Total Active Crew Pairings
        </span>
        <span className="font-mono text-sm font-bold text-[#dde2f8]">{totalCount}</span>
      </div>

      <div className="bg-[#0d1322] p-2.5 rounded border border-[#242a3a] flex items-center justify-between">
        <span className="text-[10px] font-mono text-[#ffb95f] uppercase">
          Impending Duty Cutoff (&lt;60m)
        </span>
        <span className="font-mono text-sm font-bold text-[#ffb95f]">
          {tightCount.toString().padStart(2, '0')} CREWS
        </span>
      </div>

      <div
        className={`p-2.5 rounded border flex items-center justify-between ${
          breachedCount > 0
            ? 'bg-[#93000a]/30 border-[#ffb4ab] text-[#ffdad6]'
            : 'bg-[#0d1322] border-[#242a3a] text-[#10b981]'
        }`}
      >
        <span className="text-[10px] font-mono uppercase font-bold">
          Hard DGCA FDP Breaches
        </span>
        <span className="font-mono text-sm font-bold">
          {breachedCount.toString().padStart(2, '0')} ILLEGAL DISPATCH
        </span>
      </div>
    </div>
  );
};
