/**
 * Domino Sky: useDisruptionSimulation Hook
 * Encapsulates disruption scenario state, deterministic simulation runs,
 * and recovery candidate evaluation.
 */

import { useState, useMemo, useCallback } from 'react';
import flightNetworkRaw from '../data/flight_network.json';
import {
  NetworkData,
  DisruptionScenario,
  RecoveryAction,
  SimulationResult,
  EvaluatedRecoveryCandidate,
} from '../types/network';
import { simulateDisruption } from '../engine/simulator';
import { evaluateRecoveryCandidates } from '../engine/recovery';
import { parseTimeToMinutes } from '../engine/time';
import { PRESET_SCENARIOS } from '../constants/operations';

export const defaultNetworkData = flightNetworkRaw as unknown as NetworkData;

export interface UseDisruptionSimulationReturn {
  scenario: DisruptionScenario;
  appliedRecoveryActions: RecoveryAction[];
  baselineResult: SimulationResult;
  activeResult: SimulationResult;
  rankedCandidates: EvaluatedRecoveryCandidate[];
  handleApplyPreset: (presetKey: 'MUMBAI_STORM' | 'DELHI_FOG' | 'BLR_GROUND_STOP' | 'RESET') => void;
  handleToggleRecoveryAction: (action: RecoveryAction) => void;
  handleCustomClosureChange: (airportId: string | null, startStr: string, endStr: string) => void;
  clearAllRecoveryActions: () => void;
}

/**
 * Custom React hook for controlling operational disruption scenarios and simulations.
 */
export function useDisruptionSimulation(): UseDisruptionSimulationReturn {
  const [scenario, setScenario] = useState<DisruptionScenario>(PRESET_SCENARIOS.MUMBAI_STORM);
  const [appliedRecoveryActions, setAppliedRecoveryActions] = useState<RecoveryAction[]>([]);

  // 1. Run baseline simulation (disrupted state WITHOUT recovery actions)
  const baselineResult = useMemo(() => {
    return simulateDisruption({
      networkData: defaultNetworkData,
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
      networkData: defaultNetworkData,
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
      networkData: defaultNetworkData,
      closedAirportId: scenario.closedAirportId,
      closureStartMin: scenario.closureStartMin,
      closureEndMin: scenario.closureEndMin,
      scenarioLabel: scenario.label,
      existingActions: appliedRecoveryActions,
    });
  }, [scenario, appliedRecoveryActions]);

  // Handle Preset Selection
  const handleApplyPreset = useCallback((presetKey: 'MUMBAI_STORM' | 'DELHI_FOG' | 'BLR_GROUND_STOP' | 'RESET') => {
    setAppliedRecoveryActions([]);
    const targetPreset = PRESET_SCENARIOS[presetKey];
    if (targetPreset) {
      setScenario(targetPreset);
    }
  }, []);

  // Handle Recovery Action Toggling
  const handleToggleRecoveryAction = useCallback((action: RecoveryAction) => {
    setAppliedRecoveryActions((prev) => {
      const exists = prev.some((a) => a.id === action.id);
      if (exists) {
        return prev.filter((a) => a.id !== action.id);
      }
      return [...prev, action];
    });
  }, []);

  // Handle Custom Airport Closure Configuration
  const handleCustomClosureChange = useCallback((
    airportId: string | null,
    startStr: string,
    endStr: string
  ) => {
    setAppliedRecoveryActions([]);
    if (!airportId) {
      setScenario(PRESET_SCENARIOS.RESET);
      return;
    }

    const startMin = parseTimeToMinutes(startStr);
    const endMin = parseTimeToMinutes(endStr);

    setScenario({
      closedAirportId: airportId,
      closureStartMin: startMin,
      closureEndMin: endMin,
      closureStartStr: startStr,
      closureEndStr: endStr,
      label: `Custom: ${airportId} Closed (${startStr}–${endStr} IST)`,
    });
  }, []);

  const clearAllRecoveryActions = useCallback(() => {
    setAppliedRecoveryActions([]);
  }, []);

  return {
    scenario,
    appliedRecoveryActions,
    baselineResult,
    activeResult,
    rankedCandidates,
    handleApplyPreset,
    handleToggleRecoveryAction,
    handleCustomClosureChange,
    clearAllRecoveryActions,
  };
}
