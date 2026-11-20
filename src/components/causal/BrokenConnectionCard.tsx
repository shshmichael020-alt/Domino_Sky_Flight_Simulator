import React from 'react';
import { SimulatedConnection, SimulatedFlight } from '../../types/network';
import { ArrowRight } from 'lucide-react';

interface BrokenConnectionCardProps {
  connection: SimulatedConnection;
  fromFlight?: SimulatedFlight;
  toFlight?: SimulatedFlight;
  onSelectFlight: (flightId: string) => void;
}

export const BrokenConnectionCard: React.FC<BrokenConnectionCardProps> = ({
  connection,
  fromFlight,
  toFlight,
  onSelectFlight,
}) => {
  return (
    <div className="p-3 rounded bg-[#0d1322] border border-[#ef4444]/40 flex flex-col gap-1.5 text-xs font-mono">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[#ff817a]">
            {connection.connection_id}
          </span>
          <span className="text-[#869397]">at {connection.airport}</span>
        </div>
        <span className="px-1.5 py-0.5 rounded bg-[#93000a]/40 text-[#ffdad6] font-bold text-[10px]">
          {connection.passengers} STRANDED PAX
        </span>
      </div>

      <div className="flex items-center justify-between text-[#dde2f8] bg-[#151b2b] px-2 py-1 rounded border border-[#242a3a]">
        <span
          className="cursor-pointer hover:text-[#4cd7f6]"
          onClick={() => onSelectFlight(connection.from_flight)}
        >
          {connection.from_flight} (arr {fromFlight?.actualArrStr || '--:--'})
        </span>
        <ArrowRight className="w-3 h-3 text-[#ff817a]" />
        <span
          className="cursor-pointer hover:text-[#4cd7f6]"
          onClick={() => onSelectFlight(connection.to_flight)}
        >
          {connection.to_flight} (dep {toFlight?.actualDepStr || '--:--'})
        </span>
      </div>

      <div className="text-[10px] text-[#ffb4ab]">
        {connection.brokenReason || 'Transfer window collapsed below minimum threshold.'}
      </div>
    </div>
  );
};
