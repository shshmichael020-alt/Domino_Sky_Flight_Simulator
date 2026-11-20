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
      <div className="bg-[#151b2b] p-3 rounded border border-[#242a3a] flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#869397] uppercase tracking-wider">
            FLIGHT OPERATIONS
          </span>
          <Layers className="w-4 h-4 text-[#4cd7f6]" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-mono text-2xl font-bold text-[#dde2f8]">
            {metrics.totalFlights - metrics.cancelledFlights}
          </span>
          <span className="text-[11px] font-mono text-[#869397]">
            / {metrics.totalFlights} OPERATED
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] font-mono">
          <span className="text-[#10b981]">{metrics.onTimeFlights} On-Time</span>
          <span
            className={metrics.delayedFlights > 0 ? 'text-[#f97316] font-bold' : 'text-[#869397]'}
          >
            {metrics.delayedFlights} Delayed
          </span>
          {metrics.cancelledFlights > 0 && (
            <span className="text-[#94a3b8] line-through">
              {metrics.cancelledFlights} Cxl
            </span>
          )}
        </div>
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-[#4cd7f6]/40"></div>
      </div>

      {/* KPI 2: Cumulative Network Delay */}
      <div className="bg-[#151b2b] p-3 rounded border border-[#242a3a] flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#ffb95f] uppercase tracking-wider">
            NETWORK DELAY
          </span>
          <Clock className="w-4 h-4 text-[#ffb95f]" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-mono text-2xl font-bold text-[#ffb95f]">
            {metrics.totalDelayMinutes > 0 ? `+${metrics.totalDelayMinutes}m` : '0m'}
          </span>
          {metrics.maxDelayMinutes > 0 && (
            <span className="text-[10px] font-mono text-[#869397]">
              (MAX +{metrics.maxDelayMinutes}m)
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-[#869397]">
          <span>Slack Absorbed:</span>
          <span className="text-[#4cd7f6] font-bold">
            {metrics.bufferAbsorbedTotalMin}m
          </span>
        </div>
        {isDiffMode && delayDelta > 0 && (
          <div className="text-[10px] font-mono text-[#10b981] font-bold">
            Saved {delayDelta}m via recovery
          </div>
        )}
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-[#ffb95f]/40"></div>
      </div>

      {/* KPI 3: Broken Connections & Transfer Windows */}
      <div className="bg-[#151b2b] p-3 rounded border border-[#242a3a] flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#869397] uppercase tracking-wider">
            HUB CONNECTIONS
          </span>
          <AlertTriangle
            className={`w-4 h-4 ${
              metrics.brokenConnectionsCount > 0 ? 'text-[#f97316]' : 'text-[#10b981]'
            }`}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span
            className={`font-mono text-2xl font-bold ${
              metrics.brokenConnectionsCount > 0 ? 'text-[#f97316]' : 'text-[#10b981]'
            }`}
          >
            {metrics.brokenConnectionsCount}
          </span>
          <span className="text-[11px] font-mono text-[#869397]">
            / 21 BROKEN
          </span>
        </div>
        <div className="mt-1 text-[11px] font-mono text-[#869397] truncate">
          {metrics.brokenConnectionPax > 0
            ? `${metrics.brokenConnectionPax} transfer pax missed`
            : 'All 21 connections made'}
        </div>
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-[#f97316]/40"></div>
      </div>

      {/* KPI 4: Stranded Passengers (Transparent Breakdown) */}
      <div className="bg-[#151b2b] p-3 rounded border border-[#242a3a] flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#869397] uppercase tracking-wider">
            STRANDED PASSENGERS
          </span>
          <Users
            className={`w-4 h-4 ${
              metrics.uniqueStrandedPax > 0 ? 'text-[#ff817a]' : 'text-[#10b981]'
            }`}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span
            className={`font-mono text-2xl font-bold ${
              metrics.uniqueStrandedPax > 0 ? 'text-[#ff817a]' : 'text-[#10b981]'
            }`}
          >
            {metrics.uniqueStrandedPax}
          </span>
          <span className="text-[10px] font-mono text-[#869397]">UNIQUE PAX</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-[#869397]">
          <span>Cxl: {metrics.cancelledFlightPax}</span>
          <span>•</span>
          <span>Misconn: {metrics.uniqueStrandedPax - metrics.cancelledFlightPax}</span>
        </div>
        {isDiffMode && paxDelta > 0 && (
          <div className="text-[10px] font-mono text-[#10b981] font-bold">
            Saved {paxDelta} pax
          </div>
        )}
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-[#ff817a]/40"></div>
      </div>

      {/* KPI 5: Hard DGCA CAR SEC 7 Crew Duty Breaches */}
      <div
        className={`p-3 rounded border relative overflow-hidden transition-all ${
          metrics.crewBreachesCount > 0
            ? 'bg-[#93000a]/20 border-[#ffb4ab] ring-1 ring-[#ffb4ab]/40'
            : 'bg-[#151b2b] border-[#242a3a]'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-[10px] font-mono uppercase tracking-wider font-bold ${
              metrics.crewBreachesCount > 0 ? 'text-[#ffb4ab]' : 'text-[#869397]'
            }`}
          >
            DGCA CREW BREACHES
          </span>
          <Gavel
            className={`w-4 h-4 ${
              metrics.crewBreachesCount > 0
                ? 'text-[#ffb4ab] animate-bounce'
                : 'text-[#10b981]'
            }`}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span
            className={`font-mono text-2xl font-bold ${
              metrics.crewBreachesCount > 0 ? 'text-[#ffb4ab]' : 'text-[#10b981]'
            }`}
          >
            {metrics.crewBreachesCount.toString().padStart(2, '0')}
          </span>
          <span
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
              metrics.crewBreachesCount > 0
                ? 'bg-[#93000a] text-[#ffdad6]'
                : 'bg-[#10b981]/20 text-[#10b981]'
            }`}
          >
            {metrics.crewBreachesCount > 0 ? 'ILLEGAL DISPATCH' : '100% LEGAL'}
          </span>
        </div>
        <div className="mt-1 text-[10px] font-mono text-[#869397] truncate">
          {metrics.crewBreachesCount > 0
            ? 'FDP >600m exceedance'
            : 'All 16 crews within duty limits'}
        </div>
        {isDiffMode && breachDelta > 0 && (
          <div className="text-[10px] font-mono text-[#10b981] font-bold">
            Resolved {breachDelta} breach(es)
          </div>
        )}
        <div
          className={`absolute bottom-0 left-0 h-[2px] w-full ${
            metrics.crewBreachesCount > 0 ? 'bg-[#ffb4ab]' : 'bg-[#10b981]/40'
          }`}
        ></div>
      </div>

      {/* KPI 6: Reserve Aircraft Readiness */}
      <div className="bg-[#151b2b] p-3 rounded border border-[#242a3a] flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#869397] uppercase tracking-wider">
            RESERVE FLEET
          </span>
          <Anchor className="w-4 h-4 text-[#4cd7f6]" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-mono text-2xl font-bold text-[#4cd7f6]">2</span>
          <span className="text-[11px] font-mono text-[#869397]">HOT SPARES</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-[#869397]">
          <span className="text-[#4cd7f6]">VT-DS17 (BLR)</span>
          <span className="text-[#4cd7f6]">VT-DS18 (DEL)</span>
        </div>
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-[#4cd7f6]/40"></div>
      </div>
    </section>
  );
};
