import React, { useState } from 'react';
import { Airport, SimulatedFlight, DisruptionScenario } from '../../types/network';
import { MapRouteArcs, RouteData } from './MapRouteArcs';
import { MapAirportNodes } from './MapAirportNodes';
import { MapLegend } from './MapLegend';

interface MapCanvasProps {
  airports: Airport[];
  flights: SimulatedFlight[];
  scenario: DisruptionScenario;
  selectedAirportId: string | null;
  onSelectAirport: (airportId: string) => void;
}

const project = (lat: number, lng: number) => {
  const minLng = 68.0;
  const maxLng = 95.0;
  const minLat = 7.5;
  const maxLat = 33.5;

  const x = ((lng - minLng) / (maxLng - minLng)) * 700 + 40;
  const y = ((maxLat - lat) / (maxLat - minLat)) * 580 + 35;
  return { x, y };
};

export const MapCanvas: React.FC<MapCanvasProps> = ({
  airports,
  flights,
  scenario,
  selectedAirportId,
  onSelectAirport,
}) => {
  const [hoveredRoute, setHoveredRoute] = useState<string | null>(null);
  const airportMap = new Map(airports.map((a) => [a.id, a]));

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

  return (
    <div className="flex-1 relative min-h-[540px] lg:min-h-[620px] bg-[#0d1322] flex items-center justify-center p-2 sm:p-4">
      {/* Radar Background Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#242a3a_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none"></div>

      {/* SVG Network Map */}
      <svg
        viewBox="0 0 800 660"
        className="w-full h-full max-h-[660px] select-none"
        aria-label="Interactive India Flight Network Map"
      >
        <defs>
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

        {/* Decorative Grid Circle */}
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

        {/* Render Route Network Arcs */}
        <MapRouteArcs
          routesByKey={routesByKey}
          airportMap={airportMap}
          project={project}
          hoveredRoute={hoveredRoute}
          setHoveredRoute={setHoveredRoute}
        />

        {/* Render Airport Nodes */}
        <MapAirportNodes
          airports={airports}
          flights={flights}
          scenario={scenario}
          selectedAirportId={selectedAirportId}
          project={project}
          onSelectAirport={onSelectAirport}
        />
      </svg>

      {/* Map Legend Overlay */}
      <MapLegend />
    </div>
  );
};
