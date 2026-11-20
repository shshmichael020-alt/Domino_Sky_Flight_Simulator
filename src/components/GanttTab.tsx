import React, { useState } from 'react';
import { SimulatedFlight, SpareAircraft } from '../types/network';
import { formatMinutesToTime } from '../engine/time';
import { Search, Filter, ShieldAlert, Plane } from 'lucide-react';

interface GanttTabProps {
  flights: SimulatedFlight[];
  spareAircraft: SpareAircraft[];
  onSelectFlight: (flightId: string) => void;
}

export const GanttTab: React.FC<GanttTabProps> = ({
  flights,
  spareAircraft,
  onSelectFlight,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DELAYED' | 'BREACH' | 'SPARE'>('ALL');

  // Timeline bounds in minutes: 05:00 (300) to 23:00 (1380)
  const timelineStartMin = 300;
  const timelineEndMin = 1380;
  const totalTimelineMinutes = timelineEndMin - timelineStartMin;

  // Group flights by scheduled aircraft (tail_id)
  const tails = Array.from(new Set(flights.map((f) => f.tail_id))).sort();

  // Also include spare aircraft tails
  const spareTails = spareAircraft.map((s) => s.tail_id);
  const allTails = [...tails, ...spareTails];

  // Helper to convert minute to percentage width/position
  const getPositionPercent = (min: number) => {
    const clamped = Math.max(timelineStartMin, Math.min(timelineEndMin, min));
    return ((clamped - timelineStartMin) / totalTimelineMinutes) * 100;
  };

  const getWidthPercent = (startMin: number, endMin: number) => {
    const s = Math.max(timelineStartMin, startMin);
    const e = Math.min(timelineEndMin, endMin);
    return Math.max(1, ((e - s) / totalTimelineMinutes) * 100);
  };

  // Timeline hour markers (05:00, 06:00, ... 22:00)
  const hours: number[] = [];
  for (let m = timelineStartMin; m <= timelineEndMin; m += 60) {
    hours.push(m);
  }

  return (
    <div className="w-full bg-[#151b2b] rounded-lg border border-[#242a3a] overflow-hidden flex flex-col shadow-xl">
      {/* Gantt Filter & Search Header */}
      <div className="p-3 bg-[#111827] border-b border-[#242a3a] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#dde2f8]">
            <Plane className="w-4 h-4 text-[#4cd7f6]" />
            <span className="font-bold">TACTICAL ROTATION TIMELINE</span>
            <span className="text-[#869397]">(16 ACTIVE TAILS + 2 RESERVES)</span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#869397] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search flight or tail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#080e1d] text-[#dde2f8] font-mono text-xs pl-8 pr-3 py-1 rounded border border-[#334155] focus:outline-none focus:border-[#4cd7f6] w-44"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#869397]" />
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-[#1e293b] text-[#4cd7f6] border border-[#4cd7f6]/40'
                : 'text-[#869397] hover:text-[#dde2f8]'
            }`}
          >
            ALL (70)
          </button>
          <button
            onClick={() => setStatusFilter('DELAYED')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors ${
              statusFilter === 'DELAYED'
                ? 'bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/40'
                : 'text-[#869397] hover:text-[#dde2f8]'
            }`}
          >
            DELAYED ONLY
          </button>
          <button
            onClick={() => setStatusFilter('BREACH')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors ${
              statusFilter === 'BREACH'
                ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40'
                : 'text-[#869397] hover:text-[#dde2f8]'
            }`}
          >
            CREW BREACH
          </button>
        </div>
      </div>

      {/* Main Gantt Body */}
      <div className="overflow-x-auto">
        <div className="min-w-[1020px] select-none">
          {/* Time Header Scale */}
          <div className="flex border-b border-[#242a3a] bg-[#0d1322] sticky top-0 z-10">
            <div className="w-28 shrink-0 px-3 py-2 text-[10px] font-mono text-[#869397] uppercase border-r border-[#242a3a]">
              AIRCRAFT TAIL
            </div>
            <div className="flex-1 relative h-7">
              {hours.map((h) => {
                const left = getPositionPercent(h);
                return (
                  <div
                    key={h}
                    className="absolute top-0 bottom-0 border-l border-[#242a3a] flex items-center pl-1 text-[10px] font-mono text-[#869397]"
                    style={{ left: `${left}%` }}
                  >
                    {formatMinutesToTime(h)}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tails Rotation Rows */}
          <div className="divide-y divide-[#1e293b]/60">
            {allTails.map((tailId) => {
              const isSpareTail = spareTails.includes(tailId);
              // Find flights scheduled for this tail OR operated by this tail (in case of spare swap)
              const tailFlights = flights
                .filter(
                  (f) =>
                    f.tail_id === tailId || (isSpareTail && f.operated_by_tail === tailId)
                )
                .sort((a, b) => a.leg_order - b.leg_order);

              // Apply search and status filters
              if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchesTail = tailId.toLowerCase().includes(term);
                const matchesFlight = tailFlights.some(
                  (f) =>
                    f.flight_id.toLowerCase().includes(term) ||
                    f.origin.toLowerCase().includes(term) ||
                    f.destination.toLowerCase().includes(term)
                );
                if (!matchesTail && !matchesFlight) return null;
              }

              if (statusFilter === 'DELAYED') {
                const hasDelayed = tailFlights.some((f) => f.delayMinutes > 0);
                if (!hasDelayed) return null;
              } else if (statusFilter === 'BREACH') {
                const hasBreach = tailFlights.some((f) => f.crewDutyBreached);
                if (!hasBreach) return null;
              }

              return (
                <div
                  key={tailId}
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

                      // Status colors
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
                          {/* 4px Left Status Bar */}
                          <div
                            className={`absolute left-0 top-0 bottom-0 w-1 ${accentClass}`}
                          />

                          {/* Block Content */}
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
                                <span className={textColor}>
                                  +{flight.delayMinutes}m
                                </span>
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
            })}
          </div>
        </div>
      </div>

      {/* Gantt Footer Legend */}
      <div className="p-3 bg-[#111827] border-t border-[#242a3a] flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-[#869397]">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[2px] bg-[#10b981]"></span>
            <span>On-Time (&lt;1m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[2px] bg-[#f59e0b]"></span>
            <span>Direct Delay (&lt;45m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[2px] bg-[#f97316]"></span>
            <span>Cascade Delay (&ge;45m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[2px] bg-[#ef4444]"></span>
            <span>DGCA Crew Breach</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[2px] bg-[#06b6d4]"></span>
            <span>Spare Aircraft Swap</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[2px] bg-[#94a3b8] line-through"></span>
            <span>Cancelled</span>
          </div>
        </div>

        <div>
          <span>Click any block to inspect full causal cascade & telemetry</span>
        </div>
      </div>
    </div>
  );
};
