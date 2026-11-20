import { useState, useMemo } from 'react';
import flightNetworkRaw from './data/flight_network.json';
import {
  NetworkData,
  DisruptionScenario,
  RecoveryAction,
} from './types/network';
import { simulateDisruption } from './engine/simulator';
import { evaluateRecoveryCandidates } from './engine/recovery';
import { parseTimeToMinutes } from './engine/time';
import { Header } from './components/Header';
import { KpiRow } from './components/KpiRow';
import { BeforeAfterComparison } from './components/BeforeAfterComparison';
import { MapTab } from './components/MapTab';
import { GanttTab } from './components/GanttTab';
import { CausalTab } from './components/CausalTab';
import { CrewTab } from './components/CrewTab';
import { RecoveryStudio } from './components/RecoveryStudio';
import { FlightModal } from './components/FlightModal';
import {
  Map,
  Calendar,
  GitBranch,
  BadgeAlert,
  Sparkles,
} from 'lucide-react';

const networkData = flightNetworkRaw as unknown as NetworkData;

export function App() {
  // Pre-load default demo: "BOM 90-Min Thunderstorm 08:00–09:30 IST"
  const [scenario, setScenario] = useState<DisruptionScenario>({
    closedAirportId: 'BOM',
    closureStartMin: parseTimeToMinutes('08:00'),
    closureEndMin: parseTimeToMinutes('09:30'),
    closureStartStr: '08:00',
    closureEndStr: '09:30',
    label: 'Mumbai 90M Thunderstorm (08:00–09:30 IST)',
  });

  const [activeTab, setActiveTab] = useState<
    'map' | 'gantt' | 'causal' | 'crew' | 'recovery'
  >('map');
  const [appliedRecoveryActions, setAppliedRecoveryActions] = useState<RecoveryAction[]>([]);
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [inspectingFlightId, setInspectingFlightId] = useState<string | null>(null);

  // 1. Run baseline simulation (disrupted state WITHOUT recovery actions)
  const baselineResult = useMemo(() => {
    return simulateDisruption({
      networkData,
      closedAirportId: scenario.closedAirportId,
      closureStartMin: scenario.closureStartMin,
      closureEndMin: scenario.closureEndMin,
      recoveryActions: [],
      scenarioLabel: scenario.label,
    });
  }, [scenario]);

  // 2. Run active simulation (disrupted state WITH applied recovery actions)
  const activeResult = useMemo(() => {
    return simulateDisruption({
      networkData,
      closedAirportId: scenario.closedAirportId,
      closureStartMin: scenario.closureStartMin,
      closureEndMin: scenario.closureEndMin,
      recoveryActions: appliedRecoveryActions,
      scenarioLabel: scenario.label,
    });
  }, [scenario, appliedRecoveryActions]);

  // 3. Evaluate candidate recovery actions deterministically
  const { rankedCandidates } = useMemo(() => {
    return evaluateRecoveryCandidates({
      networkData,
      closedAirportId: scenario.closedAirportId,
      closureStartMin: scenario.closureStartMin,
      closureEndMin: scenario.closureEndMin,
      scenarioLabel: scenario.label,
      existingActions: appliedRecoveryActions,
    });
  }, [scenario, appliedRecoveryActions]);

  // Handle Preset Selection
  const handleApplyPreset = (
    preset: 'MUMBAI_STORM' | 'DELHI_FOG' | 'BLR_GROUND_STOP' | 'RESET'
  ) => {
    setAppliedRecoveryActions([]);
    if (preset === 'MUMBAI_STORM') {
      setScenario({
        closedAirportId: 'BOM',
        closureStartMin: parseTimeToMinutes('08:00'),
        closureEndMin: parseTimeToMinutes('09:30'),
        closureStartStr: '08:00',
        closureEndStr: '09:30',
        label: 'Mumbai 90M Thunderstorm (08:00–09:30 IST)',
      });
    } else if (preset === 'DELHI_FOG') {
      setScenario({
        closedAirportId: 'DEL',
        closureStartMin: parseTimeToMinutes('06:00'),
        closureEndMin: parseTimeToMinutes('08:30'),
        closureStartStr: '06:00',
        closureEndStr: '08:30',
        label: 'Delhi Dense Fog Ground Stop (06:00–08:30 IST)',
      });
    } else if (preset === 'BLR_GROUND_STOP') {
      setScenario({
        closedAirportId: 'BLR',
        closureStartMin: parseTimeToMinutes('09:00'),
        closureEndMin: parseTimeToMinutes('11:00'),
        closureStartStr: '09:00',
        closureEndStr: '11:00',
        label: 'BLR Kempegowda Ground Stop (09:00–11:00 IST)',
      });
    } else {
      setScenario({
        closedAirportId: null,
        closureStartMin: 0,
        closureEndMin: 0,
        closureStartStr: '00:00',
        closureEndStr: '00:00',
        label: 'Baseline (Normal Operations)',
      });
    }
  };

  // Toggle recovery action in applied list
  const handleToggleRecoveryAction = (action: RecoveryAction) => {
    setAppliedRecoveryActions((prev) => {
      const exists = prev.some((a) => a.id === action.id);
      if (exists) {
        return prev.filter((a) => a.id !== action.id);
      } else {
        return [...prev, action];
      }
    });
  };

  // The active displayed result depends on whether Diff mode is active or not
  const displayedResult = isDiffMode ? activeResult : baselineResult;

  return (
    <div className="min-h-screen bg-[#0d1322] text-[#dde2f8] flex flex-col font-sans">
      {/* Skip to Main Content for Screen Readers & Keyboard Users (WCAG 2.1 AA) */}
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
          setScenario((prev) => ({ ...prev, ...partial }));
          setAppliedRecoveryActions([]);
        }}
        onApplyPreset={handleApplyPreset}
        onSimulate={() => {
          // Triggers visual feedback or refocuses view
        }}
        isDiffMode={isDiffMode}
        onToggleDiffMode={setIsDiffMode}
        airports={networkData.airports}
      />

      {/* Main Workspace Canvas (padded below fixed header) */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 w-full pt-28 pb-8 px-4 lg:px-6 flex flex-col gap-4 focus:outline-none"
      >
        {/* Navigation Tabs Bar Matching Stitch OCC Specification */}
        <nav
          role="tablist"
          aria-label="Operations Control Views"
          className="w-full bg-[#080e1d] rounded-lg border border-[#242a3a] px-3 py-1 flex items-center justify-between overflow-x-auto shadow-md"
        >
          <div className="flex items-center gap-1 shrink-0">
            <button
              role="tab"
              id="tab-map"
              aria-controls="panel-map"
              aria-selected={activeTab === 'map'}
              onClick={() => setActiveTab('map')}
              className={`px-3 py-2 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4cd7f6] ${
                activeTab === 'map'
                  ? 'bg-[#1e293b] text-[#4cd7f6] border border-[#4cd7f6]/40 shadow-sm'
                  : 'text-[#869397] hover:text-[#dde2f8]'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>TAB 1: INDIA ROUTE MAP</span>
            </button>

            <button
              role="tab"
              id="tab-gantt"
              aria-controls="panel-gantt"
              aria-selected={activeTab === 'gantt'}
              onClick={() => setActiveTab('gantt')}
              className={`px-3 py-2 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4cd7f6] ${
                activeTab === 'gantt'
                  ? 'bg-[#1e293b] text-[#4cd7f6] border border-[#4cd7f6]/40 shadow-sm'
                  : 'text-[#869397] hover:text-[#dde2f8]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>TAB 2: TACTICAL GANTT (70)</span>
            </button>

            <button
              role="tab"
              id="tab-causal"
              aria-controls="panel-causal"
              aria-selected={activeTab === 'causal'}
              onClick={() => setActiveTab('causal')}
              className={`px-3 py-2 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4cd7f6] ${
                activeTab === 'causal'
                  ? 'bg-[#1e293b] text-[#4cd7f6] border border-[#4cd7f6]/40 shadow-sm'
                  : 'text-[#869397] hover:text-[#dde2f8]'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>TAB 3: CAUSAL IMPACT MATRIX</span>
              {displayedResult.metrics.delayedFlights > 0 && (
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#f97316]/20 text-[#f97316]">
                  {displayedResult.metrics.delayedFlights}
                </span>
              )}
            </button>

            <button
              role="tab"
              id="tab-crew"
              aria-controls="panel-crew"
              aria-selected={activeTab === 'crew'}
              onClick={() => setActiveTab('crew')}
              className={`px-3 py-2 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4cd7f6] ${
                activeTab === 'crew'
                  ? 'bg-[#1e293b] text-[#4cd7f6] border border-[#4cd7f6]/40 shadow-sm'
                  : 'text-[#869397] hover:text-[#dde2f8]'
              }`}
            >
              <BadgeAlert className="w-3.5 h-3.5" />
              <span>TAB 4: CREW ROSTER & FDP</span>
              {displayedResult.metrics.crewBreachesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#93000a] text-[#ffdad6] font-bold animate-pulse">
                  {displayedResult.metrics.crewBreachesCount} BREACH
                </span>
              )}
            </button>

            <button
              role="tab"
              id="tab-recovery"
              aria-controls="panel-recovery"
              aria-selected={activeTab === 'recovery'}
              onClick={() => setActiveTab('recovery')}
              className={`px-3 py-2 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4cd7f6] ${
                activeTab === 'recovery'
                  ? 'bg-[#06b6d4] text-[#003640] shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                  : 'text-[#4cd7f6] hover:bg-[#151b2b]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>TAB 5: RECOVERY SOLVER & AI</span>
              {appliedRecoveryActions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#003640] text-[#4cd7f6] font-bold">
                  {appliedRecoveryActions.length} APPLIED
                </span>
              )}
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono text-[#869397] shrink-0 pr-2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping"></span>
              <span>DGCA CAR SEC 7 COMPLIANT ENGINE</span>
            </span>
            <span>•</span>
            <span className="text-[#4cd7f6]">ZERO HALLUCINATION EVALUATOR</span>
          </div>
        </nav>

        {/* Top Operational KPI Row */}
        <KpiRow
          metrics={displayedResult.metrics}
          beforeMetrics={isDiffMode ? baselineResult.metrics : undefined}
          isDiffMode={isDiffMode}
        />

        {/* Unmistakable Before vs After Recovery Comparison Card Strip */}
        {(isDiffMode || appliedRecoveryActions.length > 0) && (
          <BeforeAfterComparison
            beforeMetrics={baselineResult.metrics}
            afterMetrics={activeResult.metrics}
            appliedActionsCount={appliedRecoveryActions.length}
          />
        )}

        {/* Active Tab Panel */}
        {activeTab === 'map' && (
          <section id="panel-map" role="tabpanel" aria-labelledby="tab-map" className="w-full">
            <MapTab
              airports={networkData.airports}
              flights={displayedResult.flightList}
              scenario={scenario}
              onSelectFlight={(fId) => setInspectingFlightId(fId)}
            />
          </section>
        )}

        {activeTab === 'gantt' && (
          <section id="panel-gantt" role="tabpanel" aria-labelledby="tab-gantt" className="w-full">
            <GanttTab
              flights={displayedResult.flightList}
              spareAircraft={networkData.spare_aircraft}
              onSelectFlight={(fId) => setInspectingFlightId(fId)}
            />
          </section>
        )}

        {activeTab === 'causal' && (
          <section id="panel-causal" role="tabpanel" aria-labelledby="tab-causal" className="w-full">
            <CausalTab
              flights={displayedResult.flightList}
              connections={displayedResult.connectionList}
              scenario={scenario}
              onSelectFlight={(fId) => setInspectingFlightId(fId)}
            />
          </section>
        )}

        {activeTab === 'crew' && (
          <section id="panel-crew" role="tabpanel" aria-labelledby="tab-crew" className="w-full">
            <CrewTab
              crews={displayedResult.crewList}
              flights={displayedResult.flightList}
              onSelectFlight={(fId) => setInspectingFlightId(fId)}
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
