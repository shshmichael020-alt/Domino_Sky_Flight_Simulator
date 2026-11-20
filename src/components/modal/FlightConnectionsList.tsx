import React from 'react';
import { SimulatedConnection } from '../../types/network';

interface FlightConnectionsListProps {
  flightId: string;
  inboundConns: SimulatedConnection[];
  outboundConns: SimulatedConnection[];
}

export const FlightConnectionsList: React.FC<FlightConnectionsListProps> = ({
  flightId,
  inboundConns,
  outboundConns,
}) => {
  return (
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
                Inbound feeder: <strong>{c.from_flight}</strong> → {flightId} ({c.airport})
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
                Outbound connection: {flightId} → <strong>{c.to_flight}</strong> ({c.airport})
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
  );
};
