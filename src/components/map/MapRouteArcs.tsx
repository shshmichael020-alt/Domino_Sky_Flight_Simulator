import React from 'react';
import { Airport, SimulatedFlight } from '../../types/network';

export interface RouteData {
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

interface MapRouteArcsProps {
  routesByKey: Map<string, RouteData>;
  airportMap: Map<string, Airport>;
  project: (lat: number, lng: number) => { x: number; y: number };
  hoveredRoute: string | null;
  setHoveredRoute: (key: string | null) => void;
}

export const MapRouteArcs: React.FC<MapRouteArcsProps> = ({
  routesByKey,
  airportMap,
  project,
  hoveredRoute,
  setHoveredRoute,
}) => {
  return (
    <>
      {Array.from(routesByKey.values()).map((route) => {
        const orig = airportMap.get(route.origin);
        const dest = airportMap.get(route.dest);
        if (!orig || !dest) return null;

        const p1 = project(orig.lat, orig.lng);
        const p2 = project(dest.lat, dest.lng);

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const cx = (p1.x + p2.x) / 2 - dy * 0.12;
        const cy = (p1.y + p2.y) / 2 + dx * 0.12;
        const pathData = `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`;

        let strokeColor = '#10b981';
        let strokeWidth = 1.2;
        let strokeDash = undefined;

        if (route.hasBreach) {
          strokeColor = '#ef4444';
          strokeWidth = 2.4;
        } else if (route.hasCancelled) {
          strokeColor = '#94a3b8';
          strokeDash = '3 3';
        } else if (route.maxDelay >= 45) {
          strokeColor = '#f97316';
          strokeWidth = 2.0;
        } else if (route.maxDelay > 0) {
          strokeColor = '#f59e0b';
          strokeWidth = 1.6;
        } else if (route.hasSwap) {
          strokeColor = '#06b6d4';
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
    </>
  );
};
