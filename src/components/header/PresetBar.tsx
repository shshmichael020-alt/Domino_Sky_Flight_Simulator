import React from 'react';
import { RotateCcw } from 'lucide-react';
import { DisruptionScenario } from '../../types/network';

interface PresetBarProps {
  scenario: DisruptionScenario;
  onApplyPreset: (presetName: 'MUMBAI_STORM' | 'DELHI_FOG' | 'BLR_GROUND_STOP' | 'RESET') => void;
}

export const PresetBar: React.FC<PresetBarProps> = ({ scenario, onApplyPreset }) => {
  return (
    <div className="hidden xl:flex items-center gap-2">
      <span className="text-[10px] font-mono uppercase tracking-wider text-[#869397]">
        SCENARIO PRESETS:
      </span>
      <button
        onClick={() => onApplyPreset('MUMBAI_STORM')}
        className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${
          scenario.closedAirportId === 'BOM' && scenario.closureStartMin === 480
            ? 'bg-[#06b6d4] text-[#003640] shadow-[0_0_8px_rgba(6,182,212,0.4)]'
            : 'bg-[#1e293b] text-[#dde2f8] hover:bg-[#334155]'
        }`}
        title="BOM Closure 08:00 - 09:30 IST (Direct ground stop & hub cascade)"
      >
        BOM 90M STORM
      </button>
      <button
        onClick={() => onApplyPreset('DELHI_FOG')}
        className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${
          scenario.closedAirportId === 'DEL'
            ? 'bg-[#06b6d4] text-[#003640] shadow-[0_0_8px_rgba(6,182,212,0.4)]'
            : 'bg-[#1e293b] text-[#dde2f8] hover:bg-[#334155]'
        }`}
        title="DEL Closure 06:00 - 08:30 IST (Morning hub ground stop)"
      >
        DELHI FOG
      </button>
      <button
        onClick={() => onApplyPreset('BLR_GROUND_STOP')}
        className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${
          scenario.closedAirportId === 'BLR'
            ? 'bg-[#06b6d4] text-[#003640] shadow-[0_0_8px_rgba(6,182,212,0.4)]'
            : 'bg-[#1e293b] text-[#dde2f8] hover:bg-[#334155]'
        }`}
        title="BLR Closure 09:00 - 11:00 IST (Southern feeder network delay)"
      >
        BLR GROUND STOP
      </button>
      <button
        onClick={() => onApplyPreset('RESET')}
        className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono text-[#869397] hover:text-[#dde2f8] bg-[#151b2b] hover:bg-[#242a3a] transition-all"
        title="Reset to 100% On-Time Baseline"
      >
        <RotateCcw className="w-3 h-3" />
        <span>RESET</span>
      </button>
    </div>
  );
};
