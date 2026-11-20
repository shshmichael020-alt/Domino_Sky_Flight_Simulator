import React from 'react';
import { Airport, SimulatedFlight, DisruptionScenario } from '../../types/network';

interface MapAirportNodesProps {
  airports: Airport[];
  flights: SimulatedFlight[];
  scenario: DisruptionScenario;
  selectedAirportId: string | null;
  project: (lat: number, lng: number) => { x: number; y: number };
  onSelectAirport: (airportId: string) => void;
}

export const MapAirportNodes: React.FC<MapAirportNodesProps> = ({
  airports,
  flights,
  scenario,
  selectedAirportId,
  project,
  onSelectAirport,
}) => {
  return (
    <>
      {airports.map((airport) => {
        const { x, y } = project(airport.lat, airport.lng);
        const isClosed = scenario.closedAirportId === airport.id;
        const isSelected = selectedAirportId === airport.id;
        const isMegaHub = airport.tier === 'mega_hub';

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
            onClick={() => onSelectAirport(airport.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectAirport(airport.id);
              }
            }}
          >
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

            <circle
              cx={x}
              cy={y}
              r={isMegaHub ? 8 : 5}
              fill="#080e1d"
              stroke={nodeColor}
              strokeWidth={isSelected ? 3 : 2}
              filter={isClosed ? 'url(#glow-red)' : undefined}
            />

            <circle
              cx={x}
              cy={y}
              r={isMegaHub ? 3.5 : 2}
              fill={nodeColor}
            />

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
    </>
  );
};
