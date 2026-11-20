import React from 'react';
import { Airport, SimulatedFlight, DisruptionScenario } from '../../types/network';
import { ArrowRight } from 'lucide-react';

interface StationInspectorProps {
  selectedAirport: Airport | null;
  scenario: DisruptionScenario;
  departingFlights: SimulatedFlight[];
  arrivingFlights: SimulatedFlight[];
  totalDelay: number;
  onSelectFlight?: (flightId: string) => void;
}

export const StationInspector: React.FC<StationInspectorProps> = ({
  selectedAirport,
  scenario,
  departingFlights,
  arrivingFlights,
  totalDelay,
  onSelectFlight,
}) => {
  return (
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
                  totalDelay > 0 ? 'text-[#ffb95f]' : 'text-[#10b981]'
                }`}
              >
                {totalDelay > 0 ? `+${totalDelay}m` : '0m (Nominal)'}
              </div>
            </div>
          </div>

          {/* Flights List Through This Station */}
          <div>
            <div className="text-[10px] font-mono text-[#869397] uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Station Flights ({departingFlights.length + arrivingFlights.length})</span>
              <span className="text-[#4cd7f6]">
                {departingFlights.length} Dep / {arrivingFlights.length} Arr
              </span>
            </div>
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {[...departingFlights, ...arrivingFlights]
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
  );
};
