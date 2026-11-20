import React from 'react';
import { SimulatedFlight, Airport } from '../../types/network';

interface FlightTimingGridProps {
  flight: SimulatedFlight;
  originAirport?: Airport;
  destAirport?: Airport;
}

export const FlightTimingGrid: React.FC<FlightTimingGridProps> = ({
  flight,
  originAirport,
  destAirport,
}) => {
  return (
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
  );
};
