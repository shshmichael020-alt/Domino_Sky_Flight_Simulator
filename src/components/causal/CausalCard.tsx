import React from 'react';
import { SimulatedFlight, CauseType } from '../../types/network';
import { ArrowRight } from 'lucide-react';

interface CausalCardProps {
  flight: SimulatedFlight;
  onSelectFlight: (flightId: string) => void;
}

export function getCauseBadge(cause: CauseType) {
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
}

export const CausalCard: React.FC<CausalCardProps> = ({ flight, onSelectFlight }) => {
  return (
    <div
      onClick={() => onSelectFlight(flight.flight_id)}
      className="p-3 rounded bg-[#0d1322] border border-[#242a3a] hover:border-[#4cd7f6] cursor-pointer transition-all flex flex-col gap-2 group"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-[#dde2f8]">
            {flight.flight_id}
          </span>
          <span className="text-xs font-mono text-[#869397]">
            {flight.origin} → {flight.destination}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1e293b] text-[#4cd7f6]">
            {flight.operated_by_tail}
          </span>
          {flight.crewDutyBreached && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#93000a] text-[#ffdad6] font-bold animate-pulse">
              CREW FDP BREACH
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {getCauseBadge(flight.causeType)}
          <span
            className={`text-xs font-mono font-bold ${
              flight.status === 'CANCELLED'
                ? 'text-[#94a3b8] line-through'
                : flight.delayMinutes >= 45
                ? 'text-[#f97316]'
                : 'text-[#ffb95f]'
            }`}
          >
            {flight.status === 'CANCELLED' ? 'CANCELLED' : `+${flight.delayMinutes}m DELAY`}
          </span>
        </div>
      </div>

      {/* Causal Explanation Text */}
      <div className="text-xs font-mono text-[#bcc9cd] bg-[#151b2b] p-2 rounded border border-[#242a3a]/80">
        <span className="text-[#869397] mr-1.5">ROOT CAUSE:</span>
        {flight.causeExplanation}
      </div>

      {/* Telemetry Line */}
      <div className="flex items-center justify-between text-[11px] font-mono text-[#869397]">
        <div className="flex items-center gap-3">
          <span>Sched: {flight.scheduledDepStr}–{flight.scheduledArrStr}</span>
          <span>•</span>
          <span>
            Actual:{' '}
            {flight.status === 'CANCELLED'
              ? 'Grounded'
              : `${flight.actualDepStr}–${flight.actualArrStr}`}
          </span>
          {flight.bufferAbsorbedMin > 0 && (
            <>
              <span>•</span>
              <span className="text-[#4cd7f6]">
                Slack Absorbed: {flight.bufferAbsorbedMin}m
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
  );
};
