import React, { useState } from 'react';
import { SimulatedCrew, SimulatedFlight } from '../types/network';
import { formatDuration } from '../engine/time';
import {
  Gavel,
  Search,
} from 'lucide-react';

interface CrewTabProps {
  crews: SimulatedCrew[];
  flights: SimulatedFlight[];
  onSelectFlight: (flightId: string) => void;
}

export const CrewTab: React.FC<CrewTabProps> = ({
  crews,
  flights,
  onSelectFlight,
}) => {
  const [filterBreach, setFilterBreach] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const flightMap = new Map(flights.map((f) => [f.flight_id, f]));

  const filteredCrews = crews.filter((c) => {
    if (filterBreach && !c.isBreached) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        c.crew_id.toLowerCase().includes(term) ||
        c.tail_id.toLowerCase().includes(term) ||
        c.base.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const breachedCount = crews.filter((c) => c.isBreached).length;
  const tightCount = crews.filter(
    (c) =>
      !c.isBreached &&
      c.actualDutyElapsedMin > 0 &&
      c.max_duty_mins - c.actualDutyElapsedMin <= 60
  ).length;

  return (
    <div className="w-full bg-[#151b2b] rounded-lg border border-[#242a3a] overflow-hidden flex flex-col gap-4 p-4 shadow-xl">
      {/* Header & DGCA Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242a3a] pb-3">
        <div className="flex items-center gap-2">
          <Gavel className="w-5 h-5 text-[#4cd7f6]" />
          <div>
            <h2 className="text-sm font-bold text-[#dde2f8]">
              CREW ROSTER & FLIGHT DUTY PERIOD (FDP) LEGALITY MATRIX
            </h2>
            <p className="text-xs text-[#869397]">
              DGCA CAR Section 7 Series J Part III Compliance Engine (Strict 600m Max Single-Day Limit).
            </p>
          </div>
        </div>

        {/* Search & Breach Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#869397] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search crew or base..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#080e1d] text-[#dde2f8] font-mono text-xs pl-8 pr-3 py-1 rounded border border-[#334155] focus:outline-none focus:border-[#4cd7f6] w-44"
            />
          </div>

          <button
            onClick={() => setFilterBreach(!filterBreach)}
            className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
              filterBreach
                ? 'bg-[#93000a] text-[#ffdad6] shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                : 'bg-[#1e293b] text-[#869397] hover:text-[#dde2f8]'
            }`}
          >
            {filterBreach ? 'SHOWING BREACHES ONLY' : `BREACHES ONLY (${breachedCount})`}
          </button>
        </div>
      </div>

      {/* KPI Micro Bar for Crew */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#0d1322] p-2.5 rounded border border-[#242a3a] flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#869397] uppercase">
            Total Active Crew Pairings
          </span>
          <span className="font-mono text-sm font-bold text-[#dde2f8]">16</span>
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

      {/* Crew Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 max-h-[600px] overflow-y-auto pr-1">
        {filteredCrews.map((crew) => {
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
              key={crew.crew_id}
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
        })}
      </div>
    </div>
  );
};
