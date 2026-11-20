import React, { useState } from 'react';
import { Airport, SimulatedFlight, DisruptionScenario } from '../types/network';
import { MapCanvas } from './map/MapCanvas';
import { StationInspector } from './map/StationInspector';

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

  const airportMap = new Map(airports.map((a) => [a.id, a]));
  const selectedAirport = selectedAirportId ? airportMap.get(selectedAirportId) || null : null;

  const departingFromSelected = flights.filter((f) => f.origin === selectedAirportId);
  const arrivingAtSelected = flights.filter((f) => f.destination === selectedAirportId);
  const totalAirportDelay = [...departingFromSelected, ...arrivingAtSelected].reduce(
    (acc, f) => acc + f.delayMinutes,
    0
  );

  const handleSelectAirport = (airportId: string) => {
    setSelectedAirportId(airportId);
    if (onSelectAirport) onSelectAirport(airportId);
  };

  return (
    <div className="w-full bg-[#151b2b] rounded-lg border border-[#242a3a] overflow-hidden flex flex-col xl:flex-row relative shadow-xl">
      <MapCanvas
        airports={airports}
        flights={flights}
        scenario={scenario}
        selectedAirportId={selectedAirportId}
        onSelectAirport={handleSelectAirport}
      />

      <StationInspector
        selectedAirport={selectedAirport}
        scenario={scenario}
        departingFlights={departingFromSelected}
        arrivingFlights={arrivingAtSelected}
        totalDelay={totalAirportDelay}
        onSelectFlight={onSelectFlight}
      />
    </div>
  );
};
