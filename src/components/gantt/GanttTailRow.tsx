import React from 'react';
import { SimulatedFlight } from '../../types/network';
import { ShieldAlert } from 'lucide-react';

interface GanttTailRowProps {
  tailId: string;
  isSpareTail: boolean;
  tailFlights: SimulatedFlight[];
  hours: number[];
  timelineStartMin: number;
  totalTimelineMinutes: number;
  onSelectFlight: (flightId: string) => void;
}

export const GanttTailRow: React.FC<GanttTailRowProps> = ({
  tailId,
  isSpareTail,
  tailFlights,
  hours,
  timelineStartMin,
  totalTimelineMinutes,
  onSelectFlight,
}) => {
  const getPositionPercent = (min: number) => {
    const clamped = Math.max(timelineStartMin, Math.min(timelineStartMin + totalTimelineMinutes, min));
    return ((clamped - timelineStartMin) / totalTimelineMinutes) * 100;
  };

  const getWidthPercent = (startMin: number, endMin: number) => {
    const s = Math.max(timelineStartMin, startMin);
    const e = Math.min(timelineStartMin + totalTimelineMinutes, endMin);
    return Math.max(1, ((e - s) / totalTimelineMinutes) * 100);
  };

  return (
    <div
      className={`flex items-center h-12 hover:bg-[#191f2f]/40 transition-colors ${
        isSpareTail ? 'bg-[#080e1d]/50' : ''
      }`}
    >
      {/* Tail Identifier Label */}
      <div className="w-28 shrink-0 px-3 flex flex-col justify-center border-r border-[#242a3a]">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-bold text-[#dde2f8]">
            {tailId}
          </span>
          {isSpareTail && (
            <span className="text-[9px] font-mono px-1 rounded bg-[#06b6d4]/20 text-[#4cd7f6]">
              SPARE
            </span>
          )}
        </div>
        <span className="text-[9px] font-mono text-[#869397]">
          {isSpareTail
            ? tailFlights.length > 0
              ? `SWAPPED (${tailFlights.length})`
              : 'STANDBY'
            : `${tailFlights.length} legs`}
        </span>
      </div>

      {/* Flight Blocks Track */}
      <div className="flex-1 relative h-full">
        {/* Vertical Hour Grid Lines */}
        {hours.map((h) => (
          <div
            key={h}
            className="absolute top-0 bottom-0 border-l border-[#191f2f] pointer-events-none"
            style={{ left: `${getPositionPercent(h)}%` }}
          />
        ))}

        {/* Flight Blocks */}
        {tailFlights.map((flight) => {
          const isCancelled = flight.status === 'CANCELLED';
          const startMin = isCancelled
            ? flight.scheduledDepMin
            : (flight.actualDepMin ?? flight.scheduledDepMin);
          const endMin = isCancelled
            ? flight.scheduledArrMin
            : (flight.actualArrMin ?? flight.scheduledArrMin);

          const left = getPositionPercent(startMin);
          const width = getWidthPercent(startMin, endMin);

          let borderClass = 'border-[#334155]';
          let bgClass = 'bg-[#1e293b]';
          let accentClass = 'bg-[#10b981]';
          let textColor = 'text-[#10b981]';

          if (isCancelled) {
            bgClass = 'bg-[#1e293b]/50';
            borderClass = 'border-[#475569]/40';
            accentClass = 'bg-[#94a3b8]';
            textColor = 'text-[#94a3b8] line-through';
          } else if (flight.crewDutyBreached) {
            bgClass = 'bg-[#93000a]/30';
            borderClass = 'border-[#ef4444] animate-pulse';
            accentClass = 'bg-[#ef4444]';
            textColor = 'text-[#ff817a] font-bold';
          } else if (flight.isSpareSwapped) {
            bgClass = 'bg-[#06b6d4]/20';
            borderClass = 'border-[#06b6d4]';
            accentClass = 'bg-[#06b6d4]';
            textColor = 'text-[#4cd7f6] font-bold';
          } else if (flight.delayMinutes >= 45) {
            bgClass = 'bg-[#f97316]/20';
            borderClass = 'border-[#f97316]';
            accentClass = 'bg-[#f97316]';
            textColor = 'text-[#f97316] font-bold';
          } else if (flight.delayMinutes > 0) {
            bgClass = 'bg-[#f59e0b]/20';
            borderClass = 'border-[#f59e0b]';
            accentClass = 'bg-[#f59e0b]';
            textColor = 'text-[#ffb95f]';
          }

          return (
            <div
              key={flight.flight_id}
              onClick={() => onSelectFlight(flight.flight_id)}
              style={{
                left: `${left}%`,
                width: `${width}%`,
              }}
              className={`absolute top-1.5 bottom-1.5 rounded-[4px] border ${borderClass} ${bgClass} cursor-pointer group hover:ring-1 hover:ring-[#4cd7f6] transition-all flex items-center overflow-hidden px-1.5 shadow-sm z-2`}
              title={`${flight.flight_id} (${flight.origin}→${flight.destination}) | Dep: ${flight.actualDepStr || flight.scheduledDepStr} | Delay: +${flight.delayMinutes}m`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentClass}`} />

              <div className="flex items-center justify-between w-full pl-1.5 text-[10px] font-mono truncate">
                <div className="flex items-center gap-1 truncate">
                  <span className="font-bold text-[#dde2f8]">
                    {flight.flight_id}
                  </span>
                  <span className="text-[#869397] truncate">
                    {flight.origin}→{flight.destination}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {flight.delayMinutes > 0 && !isCancelled && (
                    <span className={textColor}>+{flight.delayMinutes}m</span>
                  )}
                  {flight.crewDutyBreached && (
                    <ShieldAlert className="w-3 h-3 text-[#ef4444] shrink-0" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
