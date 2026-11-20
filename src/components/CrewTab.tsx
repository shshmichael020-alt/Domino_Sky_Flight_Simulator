import React, { useState } from 'react';
import { SimulatedCrew, SimulatedFlight } from '../types/network';
import { Gavel, Search } from 'lucide-react';
import { CrewMicroStats } from './crew/CrewMicroStats';
import { CrewCard } from './crew/CrewCard';

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
      <CrewMicroStats
        totalCount={crews.length}
        tightCount={tightCount}
        breachedCount={breachedCount}
      />

      {/* Crew Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 max-h-[600px] overflow-y-auto pr-1">
        {filteredCrews.map((crew) => (
          <CrewCard
            key={crew.crew_id}
            crew={crew}
            flightMap={flightMap}
            onSelectFlight={onSelectFlight}
          />
        ))}
      </div>
    </div>
  );
};
