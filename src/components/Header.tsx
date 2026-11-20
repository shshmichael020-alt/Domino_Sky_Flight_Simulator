import React from 'react';
import { Plane, Clock } from 'lucide-react';
import { DisruptionScenario } from '../types/network';
import { PresetBar } from './header/PresetBar';
import { DisruptionControls } from './header/DisruptionControls';

interface HeaderProps {
  scenario: DisruptionScenario;
  onUpdateScenario: (newScenario: Partial<DisruptionScenario>) => void;
  onApplyPreset: (presetName: 'MUMBAI_STORM' | 'DELHI_FOG' | 'BLR_GROUND_STOP' | 'RESET') => void;
  onSimulate: () => void;
  isDiffMode: boolean;
  onToggleDiffMode: (diff: boolean) => void;
  airports: Array<{ id: string; name: string; city: string }>;
  isSimulating?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  scenario,
  onUpdateScenario,
  onApplyPreset,
  onSimulate,
  isDiffMode,
  onToggleDiffMode,
  airports,
  isSimulating,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#080e1d]/95 backdrop-blur-md border-b border-[#242a3a] shadow-lg">
      {/* Top Brand & Preset Bar */}
      <div className="h-14 px-4 lg:px-6 flex items-center justify-between gap-4">
        {/* Brand Logo & Telemetry Tag */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#191f2f] border border-[#4cd7f6]/30 flex items-center justify-center text-[#4cd7f6]">
              <Plane className="w-4 h-4 transform -rotate-45" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-bold text-sm tracking-wider uppercase text-[#dde2f8]">
                DOMINO<span className="text-[#4cd7f6]">SKY</span>
              </h1>
              <span className="text-[9px] font-mono text-[#869397] tracking-widest uppercase -mt-0.5">
                OCC DISRUPTION SIMULATOR
              </span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-[#242a3a] hidden sm:block"></div>

          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded bg-[#151b2b] border border-[#242a3a] text-[#4cd7f6] text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-[#4cd7f6] animate-pulse"></span>
            <span>16 AIRPORTS • 70 FLIGHTS • IST (UTC+05:30)</span>
          </div>
        </div>

        {/* 1-Click Scenario Presets */}
        <PresetBar scenario={scenario} onApplyPreset={onApplyPreset} />

        {/* View Mode & System Time */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#0d1322] p-0.5 rounded border border-[#242a3a]">
            <button
              onClick={() => onToggleDiffMode(false)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                !isDiffMode
                  ? 'bg-[#1e293b] text-[#4cd7f6] shadow-sm'
                  : 'text-[#869397] hover:text-[#dde2f8]'
              }`}
            >
              DISRUPTED
            </button>
            <button
              onClick={() => onToggleDiffMode(true)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                isDiffMode
                  ? 'bg-[#06b6d4] text-[#003640] shadow-sm'
                  : 'text-[#869397] hover:text-[#dde2f8]'
              }`}
            >
              AFTER RECOVERY
            </button>
          </div>

          <div className="h-5 w-[1px] bg-[#242a3a]"></div>

          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#151b2b] border border-[#242a3a] text-[#ffb95f] font-mono text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>08:45 IST</span>
          </div>
        </div>
      </div>

      {/* Disruption Target & Scenario Control Bar */}
      <DisruptionControls
        scenario={scenario}
        onUpdateScenario={onUpdateScenario}
        onSimulate={onSimulate}
        airports={airports}
        isSimulating={isSimulating}
      />
    </header>
  );
};
