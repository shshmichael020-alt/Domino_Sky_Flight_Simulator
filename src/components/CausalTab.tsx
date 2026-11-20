import React, { useState } from 'react';
import {
  SimulatedFlight,
  SimulatedConnection,
  DisruptionScenario,
  CauseType,
} from '../types/network';
import {
  GitCommit,
  ArrowRight,
  Search,
} from 'lucide-react';

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

  // Delayed and cancelled flights
  const impactedFlights = flights.filter(
    (f) => f.delayMinutes > 0 || f.status === 'CANCELLED'
  );

  // Filtered list
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

  // Group by root cause flight ID
  const flightsByRootCause = new Map<string, SimulatedFlight[]>();
  for (const f of impactedFlights) {
    const rootId = f.rootCauseFlightId || f.flight_id;
    if (!flightsByRootCause.has(rootId)) {
      flightsByRootCause.set(rootId, []);
    }
    flightsByRootCause.get(rootId)!.push(f);
  }

  // Broken connections
  const brokenConnections = connections.filter((c) => c.status === 'BROKEN');

  const getCauseBadge = (cause: CauseType) => {
    switch (cause) {
      case 'DIRECT_CLOSURE_DEP':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40">
            DIRECT DEP CLOSURE
          </span>
        );
      case 'DIRECT_CLOSURE_ARR':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40">
            DIRECT ARR CLOSURE
          </span>
        );
      case 'AIRCRAFT_ROTATION_CASCADE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/40">
            ROTATION CASCADE
          </span>
        );
      case 'CONNECTION_HOLD':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#06b6d4]/20 text-[#4cd7f6] border border-[#06b6d4]/40">
            CONNECTION HOLD
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#94a3b8]/20 text-[#94a3b8] line-through border border-[#94a3b8]/40">
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#10b981]/20 text-[#10b981]">
            ON-TIME
          </span>
        );
    }
  };

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
                <div
                  key={f.flight_id}
                  onClick={() => onSelectFlight(f.flight_id)}
                  className="p-3 rounded bg-[#0d1322] border border-[#242a3a] hover:border-[#4cd7f6] cursor-pointer transition-all flex flex-col gap-2 group"
                >
                  {/* Top Bar of Card */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[#dde2f8]">
                        {f.flight_id}
                      </span>
                      <span className="text-xs font-mono text-[#869397]">
                        {f.origin} → {f.destination}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1e293b] text-[#4cd7f6]">
                        {f.operated_by_tail}
                      </span>
                      {f.crewDutyBreached && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#93000a] text-[#ffdad6] font-bold animate-pulse">
                          CREW FDP BREACH
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {getCauseBadge(f.causeType)}
                      <span
                        className={`text-xs font-mono font-bold ${
                          f.status === 'CANCELLED'
                            ? 'text-[#94a3b8] line-through'
                            : f.delayMinutes >= 45
                            ? 'text-[#f97316]'
                            : 'text-[#ffb95f]'
                        }`}
                      >
                        {f.status === 'CANCELLED'
                          ? 'CANCELLED'
                          : `+${f.delayMinutes}m DELAY`}
                      </span>
                    </div>
                  </div>

                  {/* Causal Explanation Text */}
                  <div className="text-xs font-mono text-[#bcc9cd] bg-[#151b2b] p-2 rounded border border-[#242a3a]/80">
                    <span className="text-[#869397] mr-1.5">ROOT CAUSE:</span>
                    {f.causeExplanation}
                  </div>

                  {/* Telemetry Line */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#869397]">
                    <div className="flex items-center gap-3">
                      <span>Sched: {f.scheduledDepStr}–{f.scheduledArrStr}</span>
                      <span>•</span>
                      <span>
                        Actual:{' '}
                        {f.status === 'CANCELLED'
                          ? 'Grounded'
                          : `${f.actualDepStr}–${f.actualArrStr}`}
                      </span>
                      {f.bufferAbsorbedMin > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-[#4cd7f6]">
                            Slack Absorbed: {f.bufferAbsorbedMin}m
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[#4cd7f6] group-hover:translate-x-0.5 transition-transform">
                      <span>Inspect</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
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
              {brokenConnections.map((c) => {
                const fromFlight = flights.find((f) => f.flight_id === c.from_flight);
                const toFlight = flights.find((f) => f.flight_id === c.to_flight);

                return (
                  <div
                    key={c.connection_id}
                    className="p-3 rounded bg-[#0d1322] border border-[#ef4444]/40 flex flex-col gap-1.5 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#ff817a]">
                          {c.connection_id}
                        </span>
                        <span className="text-[#869397]">at {c.airport}</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-[#93000a]/40 text-[#ffdad6] font-bold text-[10px]">
                        {c.passengers} STRANDED PAX
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[#dde2f8] bg-[#151b2b] px-2 py-1 rounded border border-[#242a3a]">
                      <span
                        className="cursor-pointer hover:text-[#4cd7f6]"
                        onClick={() => onSelectFlight(c.from_flight)}
                      >
                        {c.from_flight} (arr {fromFlight?.actualArrStr || '--:--'})
                      </span>
                      <ArrowRight className="w-3 h-3 text-[#ff817a]" />
                      <span
                        className="cursor-pointer hover:text-[#4cd7f6]"
                        onClick={() => onSelectFlight(c.to_flight)}
                      >
                        {c.to_flight} (dep {toFlight?.actualDepStr || '--:--'})
                      </span>
                    </div>

                    <div className="text-[10px] text-[#ffb4ab]">
                      {c.brokenReason || 'Transfer window collapsed below minimum threshold.'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
