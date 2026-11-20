import React from 'react';
import {
  Clock,
  AlertTriangle,
  Gavel,
  Users,
  Anchor,
  Layers,
} from 'lucide-react';
import { SimulationMetrics } from '../types/network';
import { KpiCard } from './kpi/KpiCard';

interface KpiRowProps {
  metrics: SimulationMetrics;
  beforeMetrics?: SimulationMetrics;
  isDiffMode?: boolean;
}

export const KpiRow: React.FC<KpiRowProps> = ({
  metrics,
  beforeMetrics,
  isDiffMode,
}) => {
  const delayDelta = beforeMetrics
    ? beforeMetrics.totalDelayMinutes - metrics.totalDelayMinutes
    : 0;
  const paxDelta = beforeMetrics
    ? beforeMetrics.uniqueStrandedPax - metrics.uniqueStrandedPax
    : 0;
  const breachDelta = beforeMetrics
    ? beforeMetrics.crewBreachesCount - metrics.crewBreachesCount
    : 0;

  return (
    <section
      aria-label="Operational Key Performance Indicators"
      aria-live="polite"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3"
    >
      {/* KPI 1: Active Flights & Delay Ratio */}
      <KpiCard
        title="FLIGHT OPERATIONS"
        icon={<Layers className="w-4 h-4 text-[#4cd7f6]" />}
        value={metrics.totalFlights - metrics.cancelledFlights}
        subValue={`/ ${metrics.totalFlights} OPERATED`}
        bottomBarColor="bg-[#4cd7f6]/40"
        footer={
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#10b981]">{metrics.onTimeFlights} On-Time</span>
            <span className={metrics.delayedFlights > 0 ? 'text-[#f97316] font-bold' : 'text-[#869397]'}>
              {metrics.delayedFlights} Delayed
            </span>
            {metrics.cancelledFlights > 0 && (
              <span className="text-[#94a3b8] line-through">{metrics.cancelledFlights} Cxl</span>
            )}
          </div>
        }
      />

      {/* KPI 2: Cumulative Network Delay */}
      <KpiCard
        title="NETWORK DELAY"
        icon={<Clock className="w-4 h-4 text-[#ffb95f]" />}
        value={<span className="text-[#ffb95f]">{metrics.totalDelayMinutes > 0 ? `+${metrics.totalDelayMinutes}m` : '0m'}</span>}
        subValue={metrics.maxDelayMinutes > 0 ? `(MAX +${metrics.maxDelayMinutes}m)` : undefined}
        bottomBarColor="bg-[#ffb95f]/40"
        footer={
          <div className="flex items-center justify-between text-[11px] font-mono text-[#869397]">
            <span>Slack Absorbed:</span>
            <span className="text-[#4cd7f6] font-bold">{metrics.bufferAbsorbedTotalMin}m</span>
          </div>
        }
        diffBadge={
          isDiffMode && delayDelta > 0 ? (
            <div className="text-[10px] font-mono text-[#10b981] font-bold">Saved {delayDelta}m via recovery</div>
          ) : undefined
        }
      />

      {/* KPI 3: Broken Connections & Transfer Windows */}
      <KpiCard
        title="HUB CONNECTIONS"
        icon={
          <AlertTriangle
            className={`w-4 h-4 ${metrics.brokenConnectionsCount > 0 ? 'text-[#f97316]' : 'text-[#10b981]'}`}
          />
        }
        value={
          <span className={metrics.brokenConnectionsCount > 0 ? 'text-[#f97316]' : 'text-[#10b981]'}>
            {metrics.brokenConnectionsCount}
          </span>
        }
        subValue="/ 21 BROKEN"
        bottomBarColor="bg-[#f97316]/40"
        footer={
          <div className="text-[11px] font-mono text-[#869397] truncate">
            {metrics.brokenConnectionPax > 0 ? `${metrics.brokenConnectionPax} transfer pax missed` : 'All 21 connections made'}
          </div>
        }
      />

      {/* KPI 4: Stranded Passengers (Transparent Breakdown) */}
      <KpiCard
        title="STRANDED PASSENGERS"
        icon={
          <Users className={`w-4 h-4 ${metrics.uniqueStrandedPax > 0 ? 'text-[#ff817a]' : 'text-[#10b981]'}`} />
        }
        value={
          <span className={metrics.uniqueStrandedPax > 0 ? 'text-[#ff817a]' : 'text-[#10b981]'}>
            {metrics.uniqueStrandedPax}
          </span>
        }
        subValue="UNIQUE PAX"
        bottomBarColor="bg-[#ff817a]/40"
        footer={
          <div className="flex items-center justify-between text-[10px] font-mono text-[#869397]">
            <span>Cxl: {metrics.cancelledFlightPax}</span>
            <span>•</span>
            <span>Misconn: {metrics.uniqueStrandedPax - metrics.cancelledFlightPax}</span>
          </div>
        }
        diffBadge={
          isDiffMode && paxDelta > 0 ? (
            <div className="text-[10px] font-mono text-[#10b981] font-bold">Saved {paxDelta} pax</div>
          ) : undefined
        }
      />

      {/* KPI 5: Hard DGCA CAR SEC 7 Crew Duty Breaches */}
      <KpiCard
        title="DGCA CREW BREACHES"
        icon={
          <Gavel
            className={`w-4 h-4 ${metrics.crewBreachesCount > 0 ? 'text-[#ffb4ab] animate-bounce' : 'text-[#10b981]'}`}
          />
        }
        value={metrics.crewBreachesCount.toString().padStart(2, '0')}
        subValue={
          <span
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
              metrics.crewBreachesCount > 0 ? 'bg-[#93000a] text-[#ffdad6]' : 'bg-[#10b981]/20 text-[#10b981]'
            }`}
          >
            {metrics.crewBreachesCount > 0 ? 'ILLEGAL DISPATCH' : '100% LEGAL'}
          </span>
        }
        bottomBarColor={metrics.crewBreachesCount > 0 ? 'bg-[#ffb4ab]' : 'bg-[#10b981]/40'}
        isAlert={metrics.crewBreachesCount > 0}
        footer={
          <div className="text-[10px] font-mono text-[#869397] truncate">
            {metrics.crewBreachesCount > 0 ? 'FDP >600m exceedance' : 'All 16 crews within duty limits'}
          </div>
        }
        diffBadge={
          isDiffMode && breachDelta > 0 ? (
            <div className="text-[10px] font-mono text-[#10b981] font-bold">Resolved {breachDelta} breach(es)</div>
          ) : undefined
        }
      />

      {/* KPI 6: Reserve Aircraft Readiness */}
      <KpiCard
        title="RESERVE FLEET"
        icon={<Anchor className="w-4 h-4 text-[#4cd7f6]" />}
        value={<span className="text-[#4cd7f6]">2</span>}
        subValue="HOT SPARES"
        bottomBarColor="bg-[#4cd7f6]/40"
        footer={
          <div className="flex items-center justify-between text-[10px] font-mono text-[#869397]">
            <span className="text-[#4cd7f6]">VT-DS17 (BLR)</span>
            <span className="text-[#4cd7f6]">VT-DS18 (DEL)</span>
          </div>
        }
      />
    </section>
  );
};
