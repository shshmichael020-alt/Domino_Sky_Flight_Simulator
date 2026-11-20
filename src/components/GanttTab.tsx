import React, { useState } from 'react';
import { SimulatedFlight, SpareAircraft } from '../types/network';
import { formatMinutesToTime } from '../engine/time';
import { GANTT_TIMELINE_START_MIN, GANTT_TIMELINE_END_MIN } from '../constants/operations';
import { GanttControls, GanttStatusFilter } from './gantt/GanttControls';
import { GanttTailRow } from './gantt/GanttTailRow';
import { GanttLegend } from './gantt/GanttLegend';

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
  const [statusFilter, setStatusFilter] = useState<GanttStatusFilter>('ALL');

  const timelineStartMin = GANTT_TIMELINE_START_MIN;
  const timelineEndMin = GANTT_TIMELINE_END_MIN;
  const totalTimelineMinutes = timelineEndMin - timelineStartMin;

  const tails = Array.from(new Set(flights.map((f) => f.tail_id))).sort();
  const spareTails = spareAircraft.map((s) => s.tail_id);
  const allTails = [...tails, ...spareTails];

  const getPositionPercent = (min: number) => {
    const clamped = Math.max(timelineStartMin, Math.min(timelineEndMin, min));
    return ((clamped - timelineStartMin) / totalTimelineMinutes) * 100;
  };

  const hours: number[] = [];
  for (let m = timelineStartMin; m <= timelineEndMin; m += 60) {
    hours.push(m);
  }

  return (
    <div className="w-full bg-[#151b2b] rounded-lg border border-[#242a3a] overflow-hidden flex flex-col shadow-xl">
      {/* Gantt Filter & Search Header */}
      <GanttControls
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

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
              const tailFlights = flights
                .filter(
                  (f) =>
                    f.tail_id === tailId || (isSpareTail && f.operated_by_tail === tailId)
                )
                .sort((a, b) => a.leg_order - b.leg_order);

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
                <GanttTailRow
                  key={tailId}
                  tailId={tailId}
                  isSpareTail={isSpareTail}
                  tailFlights={tailFlights}
                  hours={hours}
                  timelineStartMin={timelineStartMin}
                  totalTimelineMinutes={totalTimelineMinutes}
                  onSelectFlight={onSelectFlight}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Gantt Footer Legend */}
      <GanttLegend />
    </div>
  );
};
