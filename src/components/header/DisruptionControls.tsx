import React from 'react';
import { Radio, Zap } from 'lucide-react';
import { DisruptionScenario } from '../../types/network';
import { formatMinutesToTime } from '../../engine/time';

interface DisruptionControlsProps {
  scenario: DisruptionScenario;
  onUpdateScenario: (newScenario: Partial<DisruptionScenario>) => void;
  onSimulate: () => void;
  airports: Array<{ id: string; name: string; city: string }>;
  isSimulating?: boolean;
}

export const DisruptionControls: React.FC<DisruptionControlsProps> = ({
  scenario,
  onUpdateScenario,
  onSimulate,
  airports,
  isSimulating,
}) => {
  const duration = scenario.closureEndMin - scenario.closureStartMin;

  return (
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
  );
};
