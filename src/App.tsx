import { useState } from 'react';
import flightNetworkRaw from './data/flight_network.json';
import { NetworkData } from './types/network';
import { useDisruptionSimulation } from './hooks/useDisruptionSimulation';
import { Header } from './components/Header';
import { KpiRow } from './components/KpiRow';
import { BeforeAfterComparison } from './components/BeforeAfterComparison';
import { TabBar, NavigationTab } from './components/navigation/TabBar';
import { MapTab } from './components/MapTab';
import { GanttTab } from './components/GanttTab';
import { CausalTab } from './components/CausalTab';
import { CrewTab } from './components/CrewTab';
import { RecoveryStudio } from './components/RecoveryStudio';
import { FlightModal } from './components/FlightModal';

const networkData = flightNetworkRaw as unknown as NetworkData;

/**
 * Domino Sky: Main Operations Control Center (OCC) Application Dashboard
 */
export function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('map');
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [inspectingFlightId, setInspectingFlightId] = useState<string | null>(null);

  const {
    scenario,
    appliedRecoveryActions,
    baselineResult,
    activeResult,
    rankedCandidates,
    handleApplyPreset,
    handleToggleRecoveryAction,
    handleCustomClosureChange,
    clearAllRecoveryActions,
  } = useDisruptionSimulation();

  const displayedResult = isDiffMode ? activeResult : baselineResult;

  return (
    <div className="min-h-screen bg-[#0d1322] text-[#dde2f8] flex flex-col font-sans">
      {/* Skip to Main Content for Accessibility (WCAG 2.1 AA) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#06b6d4] focus:text-[#003640] focus:font-bold focus:rounded focus:outline-none focus:ring-2 focus:ring-white shadow-xl"
      >
        Skip to main content
      </a>

      {/* Top Fixed Header with Presets & Sliders */}
      <Header
        scenario={scenario}
        onUpdateScenario={(partial) => {
          if (partial.closedAirportId !== undefined) {
            handleCustomClosureChange(
              partial.closedAirportId,
              partial.closureStartStr || scenario.closureStartStr,
              partial.closureEndStr || scenario.closureEndStr
            );
          }
        }}
        onApplyPreset={handleApplyPreset}
        onSimulate={clearAllRecoveryActions}
        isDiffMode={isDiffMode}
        onToggleDiffMode={setIsDiffMode}
        airports={networkData.airports}
      />

      {/* Main Workspace Canvas */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 w-full pt-28 pb-8 px-4 lg:px-6 flex flex-col gap-4 focus:outline-none"
      >
        {/* Navigation Tabs Bar */}
        <TabBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          delayedFlightsCount={displayedResult.metrics.delayedFlights}
          crewBreachesCount={displayedResult.metrics.crewBreachesCount}
          appliedActionsCount={appliedRecoveryActions.length}
        />

        {/* Operational KPI Row */}
        <KpiRow
          metrics={displayedResult.metrics}
          beforeMetrics={isDiffMode ? baselineResult.metrics : undefined}
          isDiffMode={isDiffMode}
        />

        {/* Unmistakable Before vs After Recovery Comparison Matrix */}
        {(isDiffMode || appliedRecoveryActions.length > 0) && (
          <BeforeAfterComparison
            beforeMetrics={baselineResult.metrics}
            afterMetrics={activeResult.metrics}
            appliedActionsCount={appliedRecoveryActions.length}
          />
        )}

        {/* Active Tab Panel Views */}
        {activeTab === 'map' && (
          <section id="panel-map" role="tabpanel" aria-labelledby="tab-map" className="w-full">
            <MapTab
              airports={networkData.airports}
              flights={displayedResult.flightList}
              scenario={scenario}
              onSelectFlight={setInspectingFlightId}
            />
          </section>
        )}

        {activeTab === 'gantt' && (
          <section id="panel-gantt" role="tabpanel" aria-labelledby="tab-gantt" className="w-full">
            <GanttTab
              flights={displayedResult.flightList}
              spareAircraft={networkData.spare_aircraft}
              onSelectFlight={setInspectingFlightId}
            />
          </section>
        )}

        {activeTab === 'causal' && (
          <section id="panel-causal" role="tabpanel" aria-labelledby="tab-causal" className="w-full">
            <CausalTab
              flights={displayedResult.flightList}
              connections={displayedResult.connectionList}
              scenario={scenario}
              onSelectFlight={setInspectingFlightId}
            />
          </section>
        )}

        {activeTab === 'crew' && (
          <section id="panel-crew" role="tabpanel" aria-labelledby="tab-crew" className="w-full">
            <CrewTab
              crews={displayedResult.crewList}
              flights={displayedResult.flightList}
              onSelectFlight={setInspectingFlightId}
            />
          </section>
        )}

        {activeTab === 'recovery' && (
          <section id="panel-recovery" role="tabpanel" aria-labelledby="tab-recovery" className="w-full">
            <RecoveryStudio
              candidates={rankedCandidates}
              appliedActions={appliedRecoveryActions}
              onToggleAction={handleToggleRecoveryAction}
              metrics={displayedResult.metrics}
              scenario={scenario}
              flights={displayedResult.flightList}
            />
          </section>
        )}
      </main>

      {/* Flight Telemetry & Causal Inspector Modal */}
      <FlightModal
        flightId={inspectingFlightId}
        onClose={() => setInspectingFlightId(null)}
        flights={displayedResult.flightList}
        connections={displayedResult.connectionList}
        crews={displayedResult.crewList}
        airports={networkData.airports}
      />
    </div>
  );
}
export default App;
