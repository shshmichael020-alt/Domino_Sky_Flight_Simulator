import React, { useEffect } from 'react';
import {
  SimulatedFlight,
  SimulatedConnection,
  SimulatedCrew,
  Airport,
} from '../types/network';
import {
  X,
  Plane,
} from 'lucide-react';

interface FlightModalProps {
  flightId: string | null;
  onClose: () => void;
  flights: SimulatedFlight[];
  connections: SimulatedConnection[];
  crews: SimulatedCrew[];
  airports: Airport[];
}

export const FlightModal: React.FC<FlightModalProps> = ({
  flightId,
  onClose,
  flights,
  connections,
  crews,
  airports,
}) => {
  // Support Esc key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!flightId) return null;

  const flight = flights.find((f) => f.flight_id === flightId);
  if (!flight) return null;

  const airportMap = new Map(airports.map((a) => [a.id, a]));
  const originAirport = airportMap.get(flight.origin);
  const destAirport = airportMap.get(flight.destination);

  const crew = crews.find((c) => c.crew_id === flight.crewId);

  // Connections involving this flight
  const inboundConns = connections.filter((c) => c.to_flight === flight.flight_id);
  const outboundConns = connections.filter((c) => c.from_flight === flight.flight_id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-flight-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080e1d]/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl bg-[#111827] rounded-lg border border-[#334155] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-[#151b2b] border-b border-[#242a3a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#1e293b] border border-[#334155] flex items-center justify-center text-[#4cd7f6]">
              <Plane className="w-5 h-5 transform -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="modal-flight-title" className="font-mono text-lg font-bold text-[#dde2f8]">
                  FLIGHT {flight.flight_id}
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1e293b] text-[#4cd7f6]">
                  TAIL: {flight.operated_by_tail}
                </span>
                {flight.isSpareSwapped && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#06b6d4]/20 text-[#4cd7f6] font-bold">
                    SPARE AIRCRAFT
                  </span>
                )}
              </div>
              <p className="text-xs text-[#869397]">
                Leg {flight.leg_order} of {flight.tail_id} Rotation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Flight Details"
            className="w-8 h-8 rounded bg-[#1e293b] hover:bg-[#334155] text-[#869397] hover:text-[#dde2f8] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Route & Times Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            {/* Origin */}
            <div className="p-3 rounded bg-[#0d1322] border border-[#242a3a]">
              <div className="text-[10px] text-[#869397] uppercase">ORIGIN STATION</div>
              <div className="text-lg font-bold text-[#dde2f8] mt-0.5">
                {flight.origin} ({originAirport?.city || ''})
              </div>
              <div className="mt-2 space-y-0.5 text-[11px]">
                <div className="text-[#869397]">
                  Sched Dep: <span className="text-[#dde2f8]">{flight.scheduledDepStr} IST</span>
                </div>
                <div className="text-[#869397]">
                  Actual Dep:{' '}
                  <span
                    className={
                      flight.status === 'CANCELLED'
                        ? 'text-[#94a3b8] line-through'
                        : flight.delayMinutes > 0
                        ? 'text-[#f97316] font-bold'
                        : 'text-[#10b981]'
                    }
                  >
                    {flight.status === 'CANCELLED' ? 'Cancelled' : `${flight.actualDepStr} IST`}
                  </span>
                </div>
              </div>
            </div>

            {/* Destination */}
            <div className="p-3 rounded bg-[#0d1322] border border-[#242a3a]">
              <div className="text-[10px] text-[#869397] uppercase">DESTINATION STATION</div>
              <div className="text-lg font-bold text-[#dde2f8] mt-0.5">
                {flight.destination} ({destAirport?.city || ''})
              </div>
              <div className="mt-2 space-y-0.5 text-[11px]">
                <div className="text-[#869397]">
                  Sched Arr: <span className="text-[#dde2f8]">{flight.scheduledArrStr} IST</span>
                </div>
                <div className="text-[#869397]">
                  Actual Arr:{' '}
                  <span
                    className={
                      flight.status === 'CANCELLED'
                        ? 'text-[#94a3b8] line-through'
                        : flight.delayMinutes > 0
                        ? 'text-[#f97316] font-bold'
                        : 'text-[#10b981]'
                    }
                  >
                    {flight.status === 'CANCELLED' ? 'Cancelled' : `${flight.actualArrStr} IST`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Status & Delay Breakdown */}
          <div className="p-3 rounded bg-[#0d1322] border border-[#242a3a] space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#869397] uppercase">
                OPERATIONAL STATUS
              </span>
              <span
                className={`px-2 py-0.5 rounded font-bold ${
                  flight.status === 'CANCELLED'
                    ? 'bg-[#94a3b8]/20 text-[#94a3b8] line-through'
                    : flight.crewDutyBreached
                    ? 'bg-[#93000a] text-[#ffdad6] animate-pulse'
                    : flight.delayMinutes >= 45
                    ? 'bg-[#f97316]/20 text-[#f97316]'
                    : flight.delayMinutes > 0
                    ? 'bg-[#f59e0b]/20 text-[#ffb95f]'
                    : 'bg-[#10b981]/20 text-[#10b981]'
                }`}
              >
                {flight.status === 'CANCELLED'
                  ? 'CANCELLED'
                  : flight.crewDutyBreached
                  ? `CREW DUTY BREACH (+${flight.delayMinutes}m DELAY)`
                  : flight.delayMinutes > 0
                  ? `DELAYED +${flight.delayMinutes}m`
                  : 'ON-TIME (NOMINAL)'}
              </span>
            </div>

            <div className="text-[#dde2f8] bg-[#151b2b] p-2.5 rounded border border-[#242a3a]">
              <span className="text-[#869397] block text-[10px] uppercase mb-0.5">
                CAUSAL ATTRIBUTION:
              </span>
              {flight.causeExplanation}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-[#869397]">
              <div>
                <span>Block Duration:</span>{' '}
                <span className="text-[#dde2f8] font-bold">{flight.block_minutes}m</span>
              </div>
              <div>
                <span>Passengers:</span>{' '}
                <span className="text-[#dde2f8] font-bold">{flight.pax} Booked</span>
              </div>
              <div>
                <span>Buffer Absorbed:</span>{' '}
                <span className="text-[#4cd7f6] font-bold">
                  {flight.bufferAbsorbedMin}m
                </span>
              </div>
            </div>
          </div>

          {/* Crew Legality Section */}
          <div className="p-3 rounded bg-[#0d1322] border border-[#242a3a] space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#869397] uppercase">
                ASSIGNED CREW LEGALITY (DGCA CAR SEC 7)
              </span>
              {crew?.isBreached ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#93000a] text-[#ffdad6] font-bold">
                  ILLEGAL EXCEEDANCE
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#10b981]/20 text-[#10b981]">
                  LEGAL
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#869397]">
              <span>Crew ID: <strong className="text-[#dde2f8]">{flight.crewId || crew?.crew_id || '--'}</strong></span>
              <span>Base: <strong className="text-[#dde2f8]">{crew?.base || '--'}</strong></span>
              <span>Duty Elapsed: <strong className="text-[#dde2f8]">{crew?.actualDutyElapsedMin || 0}m / 600m</strong></span>
            </div>
          </div>

          {/* Connected Passengers Section */}
          <div className="p-3 rounded bg-[#0d1322] border border-[#242a3a] space-y-2 text-xs font-mono">
            <span className="text-[10px] text-[#869397] uppercase block">
              PASSENGER CONNECTIONS AT HUBS ({inboundConns.length + outboundConns.length})
            </span>

            {inboundConns.length === 0 && outboundConns.length === 0 ? (
              <div className="text-[11px] text-[#869397]">
                No connecting itineraries scheduled through this flight.
              </div>
            ) : (
              <div className="space-y-1.5">
                {inboundConns.map((c) => (
                  <div
                    key={c.connection_id}
                    className="p-2 rounded bg-[#151b2b] border border-[#242a3a] flex items-center justify-between text-[11px]"
                  >
                    <span>
                      Inbound feeder: <strong>{c.from_flight}</strong> → {flight.flight_id} ({c.airport})
                    </span>
                    <span
                      className={`font-bold ${
                        c.status === 'MADE' ? 'text-[#10b981]' : 'text-[#ff817a]'
                      }`}
                    >
                      {c.status} ({c.passengers} pax)
                    </span>
                  </div>
                ))}
                {outboundConns.map((c) => (
                  <div
                    key={c.connection_id}
                    className="p-2 rounded bg-[#151b2b] border border-[#242a3a] flex items-center justify-between text-[11px]"
                  >
                    <span>
                      Outbound connection: {flight.flight_id} → <strong>{c.to_flight}</strong> ({c.airport})
                    </span>
                    <span
                      className={`font-bold ${
                        c.status === 'MADE' ? 'text-[#10b981]' : 'text-[#ff817a]'
                      }`}
                    >
                      {c.status} ({c.passengers} pax)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#151b2b] border-t border-[#242a3a] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#1e293b] hover:bg-[#334155] text-xs font-mono text-[#dde2f8] transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
