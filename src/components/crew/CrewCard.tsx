import React from 'react';
import { SimulatedCrew, SimulatedFlight } from '../../types/network';
import { formatDuration } from '../../engine/time';

interface CrewCardProps {
  crew: SimulatedCrew;
  flightMap: Map<string, SimulatedFlight>;
  onSelectFlight: (flightId: string) => void;
}

export const CrewCard: React.FC<CrewCardProps> = ({
  crew,
  flightMap,
  onSelectFlight,
}) => {
  const dutyPercent = Math.min(
    100,
    (crew.actualDutyElapsedMin / crew.max_duty_mins) * 100
  );
  const margin = crew.max_duty_mins - crew.actualDutyElapsedMin;
  const isBreached = crew.isBreached;
  const isTight = !isBreached && margin <= 60 && crew.actualDutyElapsedMin > 0;
  const isRelieved = crew.swappedOutFlightIds.length > 0;

  return (
    <div
      className={`p-3 rounded border flex flex-col justify-between gap-2.5 transition-all ${
        isBreached
          ? 'bg-[#93000a]/20 border-[#ffb4ab] ring-1 ring-[#ffb4ab]/30'
          : isTight
          ? 'bg-[#0d1322] border-[#ffb95f]/50'
          : 'bg-[#0d1322] border-[#242a3a]'
      }`}
    >
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm font-bold text-[#dde2f8]">
              {crew.crew_id}
            </span>
            <span className="text-[10px] font-mono px-1 rounded bg-[#1e293b] text-[#4cd7f6]">
              {crew.base}
            </span>
          </div>

          {isBreached ? (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#93000a] text-[#ffdad6] font-bold animate-pulse">
              BREACH +{crew.breachMinutes}m
            </span>
          ) : isRelieved ? (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#06b6d4]/20 text-[#4cd7f6]">
              SPARE RELIEVED
            </span>
          ) : isTight ? (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#ffb95f]/20 text-[#ffb95f]">
              CRITICAL TURN
            </span>
          ) : (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#10b981]/20 text-[#10b981]">
              LEGAL
            </span>
          )}
        </div>

        <div className="text-[11px] font-mono text-[#869397] mt-1 flex items-center justify-between">
          <span>Assigned Tail: {crew.tail_id}</span>
          <span>Duty Start: {crew.dutyStartStr}</span>
        </div>
      </div>

      {/* Progress Bar of Duty Elapsed */}
      <div>
        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
          <span className="text-[#869397]">Duty Period (Max 10h / 600m)</span>
          <span
            className={
              isBreached
                ? 'text-[#ff817a] font-bold'
                : isTight
                ? 'text-[#ffb95f] font-bold'
                : 'text-[#dde2f8]'
            }
          >
            {formatDuration(crew.actualDutyElapsedMin)} / 10h
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#151b2b] overflow-hidden border border-[#242a3a]">
          <div
            className={`h-full transition-all duration-500 ${
              isBreached
                ? 'bg-[#ef4444]'
                : isTight
                ? 'bg-[#ffb95f]'
                : 'bg-[#10b981]'
            }`}
            style={{ width: `${dutyPercent}%` }}
          />
        </div>
      </div>

      {/* Assigned Legs List */}
      <div className="border-t border-[#242a3a] pt-2">
        <div className="text-[9px] font-mono text-[#869397] uppercase mb-1">
          Operated Flight Legs ({crew.operatedFlightIds.length}):
        </div>
        <div className="flex flex-wrap gap-1">
          {crew.operatedFlightIds.map((fId) => {
            const f = flightMap.get(fId);
            return (
              <button
                key={fId}
                onClick={() => onSelectFlight(fId)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  f?.crewDutyBreached
                    ? 'bg-[#93000a] text-[#ffdad6] font-bold ring-1 ring-[#ff817a]'
                    : f?.delayMinutes && f.delayMinutes > 0
                    ? 'bg-[#1e293b] text-[#ffb95f]'
                    : 'bg-[#151b2b] text-[#dde2f8] hover:bg-[#242a3a]'
                }`}
                title={`${fId}: Delay +${f?.delayMinutes || 0}m`}
              >
                {fId}
              </button>
            );
          })}
          {crew.swappedOutFlightIds.map((fId) => (
            <span
              key={fId}
              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#06b6d4]/10 text-[#4cd7f6] line-through"
              title={`${fId} swapped to spare aircraft with standby crew`}
            >
              {fId}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
