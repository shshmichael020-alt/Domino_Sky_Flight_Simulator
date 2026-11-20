import React, { useState } from 'react';
import {
  SimulatedFlight,
  SimulatedConnection,
  DisruptionScenario,
} from '../types/network';
import { GitCommit, Search } from 'lucide-react';
import { CausalCard } from './causal/CausalCard';
import { BrokenConnectionCard } from './causal/BrokenConnectionCard';

interface CausalTabProps {
  flights: SimulatedFlight[];
  connections: SimulatedConnection[];
  scenario?: DisruptionScenario;
  onSelectFlight: (flightId: string) => void;
}

export const CausalTab: React.FC<CausalTabProps> = ({
  flights,
  connections,
  onSelectFlight,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const flightMap = new Map(flights.map((f) => [f.flight_id, f]));
  const impactedFlights = flights.filter(
    (f) => f.delayMinutes > 0 || f.status === 'CANCELLED'
  );

  const filteredImpacted = impactedFlights.filter((f) => {
    if (filterType !== 'ALL' && f.causeType !== filterType) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        f.flight_id.toLowerCase().includes(term) ||
        f.tail_id.toLowerCase().includes(term) ||
        f.origin.toLowerCase().includes(term) ||
        f.destination.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const brokenConnections = connections.filter((c) => c.status === 'BROKEN');

  return (
    <div className="w-full bg-[#151b2b] rounded-lg border border-[#242a3a] overflow-hidden flex flex-col gap-4 p-4 shadow-xl">
      {/* Top Controls & Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242a3a] pb-3">
        <div className="flex items-center gap-2">
          <GitCommit className="w-5 h-5 text-[#4cd7f6]" />
          <div>
            <h2 className="text-sm font-bold text-[#dde2f8]">
              CAUSAL IMPACT MATRIX & PROPAGATION CHAINS
            </h2>
            <p className="text-xs text-[#869397]">
              Deterministic ripple-effect analysis tracing delays back to root ground stops.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#869397] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search flight or station..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#080e1d] text-[#dde2f8] font-mono text-xs pl-8 pr-3 py-1 rounded border border-[#334155] focus:outline-none focus:border-[#4cd7f6] w-48"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#080e1d] text-[#dde2f8] font-mono text-xs px-2.5 py-1 rounded border border-[#334155] focus:outline-none focus:border-[#4cd7f6]"
          >
            <option value="ALL">All Impact Types ({impactedFlights.length})</option>
            <option value="DIRECT_CLOSURE_DEP">Direct Departure Ground Stop</option>
            <option value="DIRECT_CLOSURE_ARR">Direct Arrival Hold</option>
            <option value="AIRCRAFT_ROTATION_CASCADE">Rotation Cascade</option>
            <option value="CANCELLED">Cancelled Legs</option>
          </select>
        </div>
      </div>

      {/* Main Causal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column (2 cols): Hierarchical Cascade Chains */}
        <div className="lg:col-span-2 space-y-3">
          <div className="text-xs font-mono text-[#869397] uppercase tracking-wider flex items-center justify-between">
            <span>Impacted Flights ({filteredImpacted.length})</span>
            <span>Deterministic Grounding Guarantee</span>
          </div>

          {filteredImpacted.length === 0 ? (
            <div className="p-8 rounded bg-[#0d1322] border border-[#242a3a] text-center text-xs font-mono text-[#869397]">
              Zero flight disruptions matching current filter criteria. Network operating nominally.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredImpacted.map((f) => (
                <CausalCard key={f.flight_id} flight={f} onSelectFlight={onSelectFlight} />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Connection Impact Matrix */}
        <div className="space-y-3">
          <div className="text-xs font-mono text-[#869397] uppercase tracking-wider flex items-center justify-between">
            <span>Broken Connections ({brokenConnections.length} / 21)</span>
            <span className="text-[#ff817a]">
              {brokenConnections.reduce((sum, c) => sum + c.passengers, 0)} Missed Pax
            </span>
          </div>

          {brokenConnections.length === 0 ? (
            <div className="p-6 rounded bg-[#0d1322] border border-[#242a3a] text-center text-xs font-mono text-[#10b981]">
              All 21 passenger connections successfully made!
            </div>
          ) : (
            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {brokenConnections.map((c) => (
                <BrokenConnectionCard
                  key={c.connection_id}
                  connection={c}
                  fromFlight={flightMap.get(c.from_flight)}
                  toFlight={flightMap.get(c.to_flight)}
                  onSelectFlight={onSelectFlight}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
