/**
 * Domino Sky: Deterministic Recovery Optimizer & Evaluator
 * Evaluates candidate recovery solutions (Spare Swaps, Cancellations, Connection Holds)
 * Computes exact Before vs After operational deltas.
 */

import {
  NetworkData,
  RecoveryAction,
  EvaluatedRecoveryCandidate,
  SimulationResult,
} from '../types/network';
import { simulateDisruption, defaultNetworkData } from './simulator';
import {
  RECOVERY_SCORE_WEIGHTS,
  MAX_RECOVERY_CANDIDATES,
} from '../constants/operations';
import {
  generateSpareSwapCandidates,
  generateCancellationCandidates,
  generateConnectionHoldCandidates,
} from './candidateGenerator';

export interface RecoveryOptimizerOptions {
  networkData?: NetworkData;
  closedAirportId?: string | null;
  closureStartMin?: number;
  closureEndMin?: number;
  scenarioLabel?: string;
  existingActions?: RecoveryAction[];
}

function computeCandidateScore(
  crewBreachesResolved: number,
  brokenConnectionsSaved: number,
  strandedPaxSaved: number,
  delayMinutesSaved: number
): number {
  return (
    crewBreachesResolved * RECOVERY_SCORE_WEIGHTS.CREW_BREACH +
    brokenConnectionsSaved * RECOVERY_SCORE_WEIGHTS.BROKEN_CONNECTION +
    strandedPaxSaved * RECOVERY_SCORE_WEIGHTS.STRANDED_PASSENGER +
    delayMinutesSaved * RECOVERY_SCORE_WEIGHTS.DELAY_MINUTE
  );
}

function buildCandidateSummary(
  crewBreachesResolved: number,
  delayMinutesSaved: number,
  brokenConnectionsSaved: number,
  strandedPaxSaved: number
): string {
  const parts: string[] = [];
  if (crewBreachesResolved > 0) {
    parts.push(`Resolves ${crewBreachesResolved} illegal crew breach${crewBreachesResolved > 1 ? 'es' : ''}.`);
  }
  if (delayMinutesSaved > 0) {
    parts.push(`Saves ${delayMinutesSaved} mins of network delay.`);
  } else if (delayMinutesSaved < 0) {
    parts.push(`Adds ${Math.abs(delayMinutesSaved)} mins of operational hold.`);
  }
  if (brokenConnectionsSaved > 0) {
    parts.push(`Protects ${brokenConnectionsSaved} connection(s).`);
  }
  if (strandedPaxSaved > 0) {
    parts.push(`Reduces stranded pax by ${strandedPaxSaved}.`);
  }
  return parts.join(' ');
}

/**
 * Automatically identifies and evaluates candidate recovery actions against the active disruption.
 * Big-O complexity: O(A * (F + C + K)) where A is evaluated candidates (<= 15), F=70, C=21, K=16.
 *
 * @param options - Disruption scenario parameters and existing action roster
 * @returns Baseline simulation result and top ranked candidate actions with exact Before/After deltas
 */
export function evaluateRecoveryCandidates(
  options: RecoveryOptimizerOptions = {}
): {
  baselineResult: SimulationResult;
  rankedCandidates: EvaluatedRecoveryCandidate[];
} {
  const data = options.networkData || defaultNetworkData;
  const closedAirportId = options.closedAirportId ?? null;
  const closureStartMin = options.closureStartMin ?? 0;
  const closureEndMin = options.closureEndMin ?? 0;
  const existingActions = options.existingActions ?? [];

  // 1. Run baseline simulation for current disruption state
  const baselineResult = simulateDisruption({
    networkData: data,
    closedAirportId,
    closureStartMin,
    closureEndMin,
    recoveryActions: existingActions,
    scenarioLabel: options.scenarioLabel,
  });

  const beforeMetrics = baselineResult.metrics;
  const existingActionIds = new Set(existingActions.map((a) => a.id));

  // 2. Collect candidates across all three operational classes
  const candidateActions: RecoveryAction[] = [
    ...generateSpareSwapCandidates(data, baselineResult, existingActionIds),
    ...generateCancellationCandidates(data, baselineResult, existingActionIds),
    ...generateConnectionHoldCandidates(baselineResult, existingActionIds),
  ];

  // 3. Deterministically evaluate each candidate
  const evaluatedCandidates: EvaluatedRecoveryCandidate[] = [];

  for (const action of candidateActions) {
    const simulatedAfter = simulateDisruption({
      networkData: data,
      closedAirportId,
      closureStartMin,
      closureEndMin,
      recoveryActions: [...existingActions, action],
      scenarioLabel: options.scenarioLabel,
    });

    const afterMetrics = simulatedAfter.metrics;
    const delayMinutesSaved = beforeMetrics.totalDelayMinutes - afterMetrics.totalDelayMinutes;
    const strandedPaxSaved = beforeMetrics.uniqueStrandedPax - afterMetrics.uniqueStrandedPax;
    const crewBreachesResolved = beforeMetrics.crewBreachesCount - afterMetrics.crewBreachesCount;
    const brokenConnectionsSaved =
      beforeMetrics.brokenConnectionsCount - afterMetrics.brokenConnectionsCount;

    const score = computeCandidateScore(
      crewBreachesResolved,
      brokenConnectionsSaved,
      strandedPaxSaved,
      delayMinutesSaved
    );

    const summary = buildCandidateSummary(
      crewBreachesResolved,
      delayMinutesSaved,
      brokenConnectionsSaved,
      strandedPaxSaved
    );

    evaluatedCandidates.push({
      action,
      afterMetrics,
      delayMinutesSaved,
      strandedPaxSaved,
      crewBreachesResolved,
      brokenConnectionsSaved,
      score,
      summary,
    });
  }

  // 4. Sort candidates by score descending and return top candidates
  evaluatedCandidates.sort((a, b) => b.score - a.score);
  const rankedCandidates = evaluatedCandidates.slice(0, MAX_RECOVERY_CANDIDATES);

  return {
    baselineResult,
    rankedCandidates,
  };
}
