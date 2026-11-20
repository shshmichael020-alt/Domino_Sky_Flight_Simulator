import React, { useState } from 'react';
import { Airport, SimulatedFlight, DisruptionScenario } from '../types/network';
import { ArrowRight } from 'lucide-react';

interface MapTabProps {
  airports: Airport[];
  flights: SimulatedFlight[];
  scenario: DisruptionScenario;
  onSelectAirport?: (airportId: string) => void;
  onSelectFlight?: (flightId: string) => void;
}

export const MapTab: React.FC<MapTabProps> = ({
  airports,
  flights,
  scenario,
  onSelectAirport,
  onSelectFlight,
}) => {
  const [selectedAirportId, setSelectedAirportId] = useState<string | null>(
    scenario.closedAirportId || 'BOM'
  );
  const [hoveredRoute, setHoveredRoute] = useState<string | null>(null);

  // SVG coordinate projection for India:
  // Lng range: 68°E - 96°E -> x in [50, 750]
  // Lat range: 8°N - 35°N -> y in [50, 650]
  const project = (lat: number, lng: number) => {
    const minLng = 68.0;
    const maxLng = 95.0;
    const minLat = 7.5;
    const maxLat = 33.5;

    const x = ((lng - minLng) / (maxLng - minLng)) * 700 + 40;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 580 + 35;
    return { x, y };
  };

  const airportMap = new Map(airports.map((a) => [a.id, a]));

  // Aggregate flight route connections
  interface RouteData {
    key: string;
    origin: string;
    dest: string;
    flightCount: number;
    maxDelay: number;
    hasCancelled: boolean;
    hasBreach: boolean;
    hasSwap: boolean;
    flights: SimulatedFlight[];
  }

  const routesByKey = new Map<string, RouteData>();
  for (const f of flights) {
    const key = [f.origin, f.destination].sort().join('-');
    if (!routesByKey.has(key)) {
      routesByKey.set(key, {
        key,
        origin: f.origin,
        dest: f.destination,
        flightCount: 0,
        maxDelay: 0,
        hasCancelled: false,
        hasBreach: false,
        hasSwap: false,
        flights: [],
      });
    }
    const r = routesByKey.get(key)!;
    r.flightCount++;
    r.flights.push(f);
    if (f.delayMinutes > r.maxDelay) r.maxDelay = f.delayMinutes;
    if (f.status === 'CANCELLED') r.hasCancelled = true;
    if (f.crewDutyBreached) r.hasBreach = true;
    if (f.isSpareSwapped) r.hasSwap = true;
  }

  const selectedAirport = selectedAirportId
    ? airportMap.get(selectedAirportId) || null
    : null;

  const departingFromSelected = flights.filter(
    (f) => f.origin === selectedAirportId
  );
  const arrivingAtSelected = flights.filter(
    (f) => f.destination === selectedAirportId
  );
  const totalAirportDelay = [...departingFromSelected, ...arrivingAtSelected].reduce(
    (acc, f) => acc + f.delayMinutes,
    0
  );

  return (
    <div className="w-full bg-[#151b2b] rounded-lg border border-[#242a3a] overflow-hidden flex flex-col xl:flex-row relative shadow-xl">
      {/* Tactical Canvas Area */}
      <div className="flex-1 relative min-h-[540px] lg:min-h-[620px] bg-[#0d1322] flex items-center justify-center p-2 sm:p-4">
        {/* Subtle Radar Background Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#242a3a_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none"></div>

        {/* SVG Network Map */}
        <svg
          viewBox="0 0 800 660"
          className="w-full h-full max-h-[660px] select-none"
          aria-label="Interactive India Flight Network Map"
        >
          <defs>
            {/* Glow Filters */}
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Subcontinent Decorative Border Guidelines */}
          <ellipse
            cx="390"
            cy="360"
            rx="340"
            ry="280"
            fill="none"
            stroke="#191f2f"
            strokeWidth="1"
            strokeDasharray="4 8"
          />

          {/* Render Route Network Lines */}
          {Array.from(routesByKey.values()).map((route) => {
            const orig = airportMap.get(route.origin);
            const dest = airportMap.get(route.dest);
            if (!orig || !dest) return null;

            const p1 = project(orig.lat, orig.lng);
            const p2 = project(dest.lat, dest.lng);

            // Calculate subtle curved arc
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const cx = (p1.x + p2.x) / 2 - dy * 0.12;
            const cy = (p1.y + p2.y) / 2 + dx * 0.12;
            const pathData = `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`;

            // Color coding
            let strokeColor = '#10b981'; // On-Time
            let strokeWidth = 1.2;
            let strokeDash = undefined;

            if (route.hasBreach) {
              strokeColor = '#ef4444'; // Red
              strokeWidth = 2.4;
            } else if (route.hasCancelled) {
              strokeColor = '#94a3b8';
              strokeDash = '3 3';
            } else if (route.maxDelay >= 45) {
              strokeColor = '#f97316'; // Orange
              strokeWidth = 2.0;
            } else if (route.maxDelay > 0) {
              strokeColor = '#f59e0b'; // Amber
              strokeWidth = 1.6;
            } else if (route.hasSwap) {
              strokeColor = '#06b6d4'; // Cyan
              strokeWidth = 2.0;
            }

            const isHovered = hoveredRoute === route.key;

            return (
              <g key={route.key}>
                <path
                  d={pathData}
                  fill="none"
                  stroke={isHovered ? '#ffffff' : strokeColor}
                  strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                  strokeDasharray={strokeDash}
                  strokeOpacity={isHovered ? 1 : 0.65}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredRoute(route.key)}
                  onMouseLeave={() => setHoveredRoute(null)}
                />
              </g>
            );
          })}

          {/* Render Airport Nodes */}
          {airports.map((airport) => {
            const { x, y } = project(airport.lat, airport.lng);
            const isClosed = scenario.closedAirportId === airport.id;
            const isSelected = selectedAirportId === airport.id;
            const isMegaHub = airport.tier === 'mega_hub';

            // Airport delay severity
            const airportFlights = flights.filter(
              (f) => f.origin === airport.id || f.destination === airport.id
            );
            const maxAirDelay = Math.max(0, ...airportFlights.map((f) => f.delayMinutes));
            const hasBreach = airportFlights.some((f) => f.crewDutyBreached);

            let nodeColor = '#10b981';
            if (isClosed || hasBreach) nodeColor = '#ef4444';
            else if (maxAirDelay >= 45) nodeColor = '#f97316';
            else if (maxAirDelay > 0) nodeColor = '#f59e0b';

            return (
              <g
                key={airport.id}
                tabIndex={0}
                role="button"
                aria-label={`${airport.city} (${airport.id}) airport, ${airport.tier.replace('_', ' ')}`}
                className="cursor-pointer group focus:outline-none"
                onClick={() => {
                  setSelectedAirportId(airport.id);
                  if (onSelectAirport) onSelectAirport(airport.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedAirportId(airport.id);
                    if (onSelectAirport) onSelectAirport(airport.id);
                  }
                }}
              >
                {/* Closure Radar Ripple Rings */}
                {isClosed && (
                  <>
                    <circle
                      cx={x}
                      cy={y}
                      r="12"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="1.5"
                      className="animate-radar"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r="22"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      opacity="0.6"
                      className="animate-spin"
                      style={{ transformOrigin: `${x}px ${y}px`, animationDuration: '6s' }}
                    />
                  </>
                )}

                {/* Selected Ring */}
                {isSelected && (
                  <circle
                    cx={x}
                    cy={y}
                    r={isMegaHub ? 13 : 10}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                    className="animate-pulse"
                  />
                )}

                {/* Base Outer Disc */}
                <circle
                  cx={x}
                  cy={y}
                  r={isMegaHub ? 8 : 5}
                  fill="#080e1d"
                  stroke={nodeColor}
                  strokeWidth={isSelected ? 3 : 2}
                  filter={isClosed ? 'url(#glow-red)' : undefined}
                />

                {/* Inner Core */}
                <circle
                  cx={x}
                  cy={y}
                  r={isMegaHub ? 3.5 : 2}
                  fill={nodeColor}
                />

                {/* Monospace IATA Label */}
                <text
                  x={x}
                  y={y - (isMegaHub ? 12 : 9)}
                  textAnchor="middle"
                  fill={isClosed ? '#ff817a' : isSelected ? '#4cd7f6' : '#dde2f8'}
                  className="font-mono text-[10px] font-bold select-none pointer-events-none drop-shadow-md"
                >
                  {airport.id}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tactical Map Legend Overlay */}
        <div className="absolute bottom-3 left-3 bg-[#080e1d]/90 p-2.5 rounded border border-[#242a3a] text-[10px] font-mono text-[#869397] flex flex-wrap gap-3 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
            <span>On-Time</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
            <span>Direct Delayed (&lt;45m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]"></span>
            <span>Cascade Delayed (&ge;45m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span>
            <span>Closed / Breach</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]"></span>
            <span>Recovered / Spare</span>
          </div>
        </div>
      </div>

      {/* Airport Station Inspector Sidebar */}
      <aside className="w-full xl:w-80 bg-[#151b2b] border-t xl:border-t-0 xl:border-l border-[#242a3a] p-4 flex flex-col justify-between">
        {selectedAirport ? (
          <div className="space-y-4">
            {/* Station Header */}
            <div className="border-b border-[#242a3a] pb-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-2xl font-bold text-[#dde2f8]">
                  {selectedAirport.id}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    scenario.closedAirportId === selectedAirport.id
                      ? 'bg-[#93000a] text-[#ffdad6] animate-pulse'
                      : 'bg-[#1e293b] text-[#4cd7f6]'
                  }`}
                >
                  {scenario.closedAirportId === selectedAirport.id
                    ? 'RUNWAY CLOSED'
                    : selectedAirport.tier.replace('_', ' ')}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-[#dde2f8] mt-1">
                {selectedAirport.city}
              </h2>
              <p className="text-xs text-[#869397]">{selectedAirport.name}</p>
            </div>

            {/* Capacity & Telemetry */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-[#080e1d] p-2 rounded border border-[#242a3a]">
                <div className="text-[10px] text-[#869397] uppercase">Capacity</div>
                <div className="text-[#dde2f8] font-bold">
                  {selectedAirport.capacity_per_hour} mov/hr
                </div>
              </div>
              <div className="bg-[#080e1d] p-2 rounded border border-[#242a3a]">
                <div className="text-[10px] text-[#869397] uppercase">Station Delay</div>
                <div
                  className={`font-bold ${
                    totalAirportDelay > 0 ? 'text-[#ffb95f]' : 'text-[#10b981]'
                  }`}
                >
                  {totalAirportDelay > 0 ? `+${totalAirportDelay}m` : '0m (Nominal)'}
                </div>
              </div>
            </div>

            {/* Flights List Through This Station */}
            <div>
              <div className="text-[10px] font-mono text-[#869397] uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Station Flights ({departingFromSelected.length + arrivingAtSelected.length})</span>
                <span className="text-[#4cd7f6]">
                  {departingFromSelected.length} Dep / {arrivingAtSelected.length} Arr
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {[...departingFromSelected, ...arrivingAtSelected]
                  .sort((a, b) => (a.actualDepMin ?? a.scheduledDepMin) - (b.actualDepMin ?? b.scheduledDepMin))
                  .map((f) => (
                    <div
                      key={f.flight_id}
                      onClick={() => onSelectFlight && onSelectFlight(f.flight_id)}
                      className="p-2 rounded bg-[#080e1d] border border-[#242a3a] hover:border-[#4cd7f6] cursor-pointer flex items-center justify-between text-xs font-mono transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#dde2f8]">{f.flight_id}</span>
                        <span className="text-[10px] text-[#869397]">
                          {f.origin}→{f.destination}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {f.status === 'CANCELLED' ? (
                          <span className="text-[10px] text-[#94a3b8] line-through">
                            CANCELLED
                          </span>
                        ) : f.delayMinutes > 0 ? (
                          <span
                            className={`text-[10px] font-bold ${
                              f.crewDutyBreached
                                ? 'text-[#ff817a]'
                                : f.delayMinutes >= 45
                                ? 'text-[#f97316]'
                                : 'text-[#ffb95f]'
                            }`}
                          >
                            +{f.delayMinutes}m
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#10b981]">ON-TIME</span>
                        )}
                        <ArrowRight className="w-3 h-3 text-[#869397]" />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-[#869397] text-xs font-mono">
            Click on any airport node to inspect its local flight operations and delay cascade.
          </div>
        )}

        {/* Station Footer Legend */}
        <div className="mt-4 pt-3 border-t border-[#242a3a] text-[10px] font-mono text-[#869397]">
          <span>DGCA Hub Regulations • IST Local Dispatch</span>
        </div>
      </aside>
    </div>
  );
};
