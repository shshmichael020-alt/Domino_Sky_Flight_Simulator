import React from 'react';
import {
  Plane,
  RotateCcw,
  Clock,
  Zap,
  Radio,
} from 'lucide-react';
import { DisruptionScenario } from '../types/network';
import { formatMinutesToTime } from '../engine/time';

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
  const duration = scenario.closureEndMin - scenario.closureStartMin;

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

        {/* 1-Click Presets */}
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

        {/* View Mode & System Time */}
        <div className="flex items-center gap-3">
          {/* Disrupted vs After-Recovery Diff Toggle */}
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
      <div className="h-12 px-4 lg:px-6 bg-[#151b2b]/95 border-t border-[#242a3a] flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center gap-6 shrink-0">
          {/* Target Airport Dropdown */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="airport-select"
              className="text-[10px] font-mono uppercase tracking-wider text-[#869397] flex items-center gap-1"
            >
              <Radio className="w-3 h-3 text-[#4cd7f6]" />
              <span>DISRUPTION TARGET:</span>
            </label>
            <select
              id="airport-select"
              value={scenario.closedAirportId || ''}
              onChange={(e) => {
                const val = e.target.value;
                onUpdateScenario({
                  closedAirportId: val === '' ? null : val,
                });
              }}
              className="bg-[#080e1d] text-[#dde2f8] font-mono text-xs px-2.5 py-1.5 rounded border border-[#334155] focus:outline-none focus:border-[#4cd7f6] cursor-pointer"
            >
              <option value="">-- None (Baseline Network) --</option>
              {airports.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id} — {a.city} ({a.name})
                </option>
              ))}
            </select>
          </div>

          {/* Closure Start Slider */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="start-time-slider"
              className="text-[10px] font-mono uppercase tracking-wider text-[#869397]"
            >
              START:
            </label>
            <input
              id="start-time-slider"
              type="range"
              min="300"
              max="1320"
              step="15"
              value={scenario.closureStartMin}
              aria-valuemin={300}
              aria-valuemax={1320}
              aria-valuenow={scenario.closureStartMin}
              aria-valuetext={`${formatMinutesToTime(scenario.closureStartMin)} IST`}
              disabled={!scenario.closedAirportId}
              onChange={(e) => {
                const start = parseInt(e.target.value, 10);
                const curDur = scenario.closureEndMin - scenario.closureStartMin;
                onUpdateScenario({
                  closureStartMin: start,
                  closureEndMin: start + Math.max(15, curDur),
                });
              }}
              className="w-24 sm:w-28 accent-[#4cd7f6] cursor-pointer disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4cd7f6]"
            />
            <span className="font-mono text-xs text-[#dde2f8] bg-[#080e1d] px-2 py-0.5 rounded border border-[#334155]">
              {formatMinutesToTime(scenario.closureStartMin)} IST
            </span>
          </div>

          {/* Closure Duration Slider */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="duration-slider"
              className="text-[10px] font-mono uppercase tracking-wider text-[#869397]"
            >
              DURATION:
            </label>
            <input
              id="duration-slider"
              type="range"
              min="15"
              max="240"
              step="15"
              value={duration > 0 ? duration : 90}
              aria-valuemin={15}
              aria-valuemax={240}
              aria-valuenow={duration > 0 ? duration : 90}
              aria-valuetext={`${duration > 0 ? duration : 90} minutes`}
              disabled={!scenario.closedAirportId}
              onChange={(e) => {
                const dur = parseInt(e.target.value, 10);
                onUpdateScenario({
                  closureEndMin: scenario.closureStartMin + dur,
                });
              }}
              className="w-24 sm:w-28 accent-[#ffb95f] cursor-pointer disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb95f]"
            />
            <span className="font-mono text-xs text-[#ffb95f] bg-[#080e1d] px-2 py-0.5 rounded border border-[#334155]">
              {scenario.closedAirportId ? `${duration} MIN` : '0 MIN'}
            </span>
          </div>
        </div>

        {/* Action Trigger Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onSimulate}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#06b6d4] text-[#003640] font-mono font-bold text-xs uppercase hover:brightness-110 active:brightness-95 transition-all shadow-[0_0_10px_rgba(6,182,212,0.35)]"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{isSimulating ? 'SIMULATING...' : 'SIMULATE CASCADE'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
