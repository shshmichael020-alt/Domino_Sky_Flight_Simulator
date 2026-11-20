import React from 'react';
import { SimulationMetrics } from '../types/network';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface BeforeAfterComparisonProps {
  beforeMetrics: SimulationMetrics;
  afterMetrics: SimulationMetrics;
  appliedActionsCount: number;
}

export const BeforeAfterComparison: React.FC<BeforeAfterComparisonProps> = ({
  beforeMetrics,
  afterMetrics,
  appliedActionsCount,
}) => {
  const delaySaved = beforeMetrics.totalDelayMinutes - afterMetrics.totalDelayMinutes;
  const paxSaved = beforeMetrics.uniqueStrandedPax - afterMetrics.uniqueStrandedPax;
  const breachesResolved = beforeMetrics.crewBreachesCount - afterMetrics.crewBreachesCount;
  const connsSaved = beforeMetrics.brokenConnectionsCount - afterMetrics.brokenConnectionsCount;
  const delayedFlightsSaved = beforeMetrics.delayedFlights - afterMetrics.delayedFlights;

  return (
    <section
      aria-label="Before vs After Recovery Operational Comparison"
      className="w-full bg-[#0d1322] rounded-lg border border-[#06b6d4]/40 p-4 shadow-xl flex flex-col gap-3 relative overflow-hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#242a3a] pb-2.5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-[#06b6d4]" />
          <div>
            <h3 className="text-xs font-mono font-bold text-[#dde2f8] uppercase tracking-wider">
              BEFORE VS AFTER RECOVERY DELTA MATRIX
            </h3>
            <p className="text-[11px] font-mono text-[#869397]">
              Deterministic Before/After differential across all 70 flights ({appliedActionsCount} active recovery action{appliedActionsCount === 1 ? '' : 's'}).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-0.5 rounded bg-[#1e293b] text-[#869397]">
            DISRUPTED BASELINE
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-[#06b6d4]" />
          <span className="px-2 py-0.5 rounded bg-[#06b6d4]/20 text-[#4cd7f6] font-bold">
            OPTIMIZED RECOVERY
          </span>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Metric 1: Delayed Flights */}
        <div className="bg-[#151b2b] p-3 rounded border border-[#242a3a] flex flex-col justify-between">
          <span className="text-[10px] font-mono text-[#869397] uppercase">DELAYED FLIGHTS</span>
          <div className="mt-1 flex items-baseline justify-between font-mono">
            <span className="text-sm text-[#f97316] font-bold">{beforeMetrics.delayedFlights}</span>
            <ArrowRight className="w-3 h-3 text-[#869397]" />
            <span className="text-lg text-[#dde2f8] font-bold">{afterMetrics.delayedFlights}</span>
          </div>
          <div className="text-[10px] font-mono mt-1">
            {delayedFlightsSaved > 0 ? (
              <span className="text-[#10b981] font-bold">-{delayedFlightsSaved} flights</span>
            ) : (
              <span className="text-[#869397]">No change</span>
            )}
          </div>
        </div>

        {/* Metric 2: Total Delay Minutes */}
        <div className="bg-[#151b2b] p-3 rounded border border-[#242a3a] flex flex-col justify-between">
          <span className="text-[10px] font-mono text-[#ffb95f] uppercase">TOTAL DELAY MINS</span>
          <div className="mt-1 flex items-baseline justify-between font-mono">
            <span className="text-sm text-[#ffb95f] font-bold">+{beforeMetrics.totalDelayMinutes}m</span>
            <ArrowRight className="w-3 h-3 text-[#869397]" />
            <span className="text-lg text-[#dde2f8] font-bold">+{afterMetrics.totalDelayMinutes}m</span>
          </div>
          <div className="text-[10px] font-mono mt-1">
            {delaySaved > 0 ? (
              <span className="text-[#10b981] font-bold">Saved {delaySaved}m delay</span>
            ) : (
              <span className="text-[#869397]">0m net change</span>
            )}
          </div>
        </div>

        {/* Metric 3: Stranded Passengers */}
        <div className="bg-[#151b2b] p-3 rounded border border-[#242a3a] flex flex-col justify-between">
          <span className="text-[10px] font-mono text-[#ff817a] uppercase">STRANDED PASSENGERS</span>
          <div className="mt-1 flex items-baseline justify-between font-mono">
            <span className="text-sm text-[#ff817a] font-bold">{beforeMetrics.uniqueStrandedPax}</span>
            <ArrowRight className="w-3 h-3 text-[#869397]" />
            <span className="text-lg text-[#dde2f8] font-bold">{afterMetrics.uniqueStrandedPax}</span>
          </div>
          <div className="text-[10px] font-mono mt-1">
            {paxSaved > 0 ? (
              <span className="text-[#10b981] font-bold">Protected {paxSaved} pax</span>
            ) : (
              <span className="text-[#869397]">0 pax net</span>
            )}
          </div>
        </div>

        {/* Metric 4: Broken Connections */}
        <div className="bg-[#151b2b] p-3 rounded border border-[#242a3a] flex flex-col justify-between">
          <span className="text-[10px] font-mono text-[#869397] uppercase">BROKEN CONNECTIONS</span>
          <div className="mt-1 flex items-baseline justify-between font-mono">
            <span className="text-sm text-[#f97316] font-bold">{beforeMetrics.brokenConnectionsCount}</span>
            <ArrowRight className="w-3 h-3 text-[#869397]" />
            <span className="text-lg text-[#dde2f8] font-bold">{afterMetrics.brokenConnectionsCount}</span>
          </div>
          <div className="text-[10px] font-mono mt-1">
            {connsSaved > 0 ? (
              <span className="text-[#10b981] font-bold">Saved {connsSaved} conn</span>
            ) : (
              <span className="text-[#869397]">0 change</span>
            )}
          </div>
        </div>

        {/* Metric 5: Crew Breaches */}
        <div className="bg-[#151b2b] p-3 rounded border border-[#242a3a] flex flex-col justify-between">
          <span className="text-[10px] font-mono text-[#ffb4ab] uppercase">DGCA CREW BREACHES</span>
          <div className="mt-1 flex items-baseline justify-between font-mono">
            <span className="text-sm text-[#ffb4ab] font-bold">{beforeMetrics.crewBreachesCount}</span>
            <ArrowRight className="w-3 h-3 text-[#869397]" />
            <span className="text-lg text-[#10b981] font-bold">{afterMetrics.crewBreachesCount}</span>
          </div>
          <div className="text-[10px] font-mono mt-1">
            {breachesResolved > 0 ? (
              <span className="text-[#10b981] font-bold">Resolved {breachesResolved} breach(es)</span>
            ) : (
              <span className="text-[#869397]">0 unresolved</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
