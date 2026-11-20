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
import { parseTimeToMinutes } from './time';

export interface RecoveryOptimizerOptions {
  networkData?: NetworkData;
  closedAirportId?: string | null;
  closureStartMin?: number;
  closureEndMin?: number;
  scenarioLabel?: string;
  existingActions?: RecoveryAction[];
}

/**
 * Automatically identifies and evaluates candidate recovery actions against the active disruption.
 * Returns the top ranked candidate actions with exact Before/After deltas.
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
  const candidateActions: RecoveryAction[] = [];
  const existingActionIds = new Set(existingActions.map((a) => a.id));

  // --- Candidate Class A: Spare Aircraft Swap (SWAP_SPARE) ---
  // Deploy VT-DS17 (BLR) or VT-DS18 (DEL)
  for (const spare of data.spare_aircraft) {
    const spareAvailMin = parseTimeToMinutes(spare.available_from);

    // Look for flights originating at the spare's base station
    for (const flight of data.flights) {
      if (flight.origin !== spare.base) continue;
      const scheduledDepMin = parseTimeToMinutes(flight.dep);
      if (scheduledDepMin < spareAvailMin) continue;

      const simFlight = baselineResult.flights[flight.flight_id];
      if (!simFlight) continue;

      // Swap is promising if the flight is delayed, crew is breached, or downstream tail has breaches/delays
      const tailFlights = data.flights
        .filter((f) => f.tail_id === flight.tail_id)
        .sort((a, b) => a.leg_order - b.leg_order);

      const hasDownstreamImpact = tailFlights.some((tf) => {
        const stf = baselineResult.flights[tf.flight_id];
        return (
          tf.leg_order >= flight.leg_order &&
          stf &&
          (stf.delayMinutes > 0 || stf.crewDutyBreached)
        );
      });

      if (simFlight.delayMinutes > 0 || simFlight.crewDutyBreached || hasDownstreamImpact) {
        const actionId = `SWAP_${spare.tail_id}_${flight.flight_id}`;
        if (!existingActionIds.has(actionId)) {
          candidateActions.push({
            id: actionId,
            type: 'SWAP_SPARE',
            flightId: flight.flight_id,
            tailId: flight.tail_id,
            spareTailId: spare.tail_id,
            description: `Swap spare aircraft ${spare.tail_id} at ${spare.base} onto ${flight.flight_id} (${flight.origin}→${flight.destination})`,
            rationale: `Deploys fresh spare tail ${spare.tail_id} with standby crew at ${spare.base}, severing inbound rotation delay and resetting crew duty limits.`,
          });
        }
      }
    }
  }

  // --- Candidate Class B: Strategic Single-Leg Cancellation (CANCEL_FLIGHT) ---
  // Candidates: heavily delayed flights or flights triggering crew duty breaches
  for (const flight of data.flights) {
    const simFlight = baselineResult.flights[flight.flight_id];
    if (!simFlight || simFlight.status === 'CANCELLED') continue;

    const tailFlights = data.flights
      .filter((f) => f.tail_id === flight.tail_id)
      .sort((a, b) => a.leg_order - b.leg_order);

    const isBreachingLeg = simFlight.crewDutyBreached;
    const isHeavyDirect =
      simFlight.causeType === 'DIRECT_CLOSURE_DEP' ||
      simFlight.causeType === 'DIRECT_CLOSURE_ARR';
    const isLastLeg = flight.leg_order === tailFlights[tailFlights.length - 1].leg_order;

    if (simFlight.delayMinutes >= 45 || isBreachingLeg || isHeavyDirect || (isLastLeg && isBreachingLeg)) {
      const actionId = `CANCEL_${flight.flight_id}`;
      if (!existingActionIds.has(actionId)) {
        candidateActions.push({
          id: actionId,
          type: 'CANCEL_FLIGHT',
          flightId: flight.flight_id,
          tailId: flight.tail_id,
          description: `Cancel flight ${flight.flight_id} (${flight.origin}→${flight.destination}, ${flight.pax} pax, delay +${simFlight.delayMinutes}m)`,
          rationale: isBreachingLeg
            ? `Eliminates illegal crew duty breach on tail ${flight.tail_id}.`
            : `Haults cascading turnaround delays on tail ${flight.tail_id} down the rotation chain.`,
        });
      }
    }
  }

  // --- Candidate Class C: Targeted Connection Hold (HOLD_CONNECTION) ---
  // Hold outbound flight to protect connecting passengers if shortfall <= 30m and pax >= 15
  for (const conn of baselineResult.connectionList) {
    if (conn.status !== 'BROKEN') continue;
    const from = baselineResult.flights[conn.from_flight];
    const to = baselineResult.flights[conn.to_flight];

    if (!from || !to || from.status === 'CANCELLED' || to.status === 'CANCELLED') continue;
    if (from.actualArrMin === null || to.actualDepMin === null) continue;

    const transferWindow = to.actualDepMin - from.actualArrMin;
    const shortfall = conn.min_connect_minutes - transferWindow;

    if (shortfall > 0 && shortfall <= 30 && conn.passengers >= 15) {
      const holdMinutes = shortfall;
      const actionId = `HOLD_${to.flight_id}_${conn.connection_id}`;
      if (!existingActionIds.has(actionId)) {
        candidateActions.push({
          id: actionId,
          type: 'HOLD_CONNECTION',
          flightId: to.flight_id,
          tailId: to.tail_id,
          holdMinutes,
          targetConnectionId: conn.connection_id,
          description: `Hold outbound flight ${to.flight_id} at ${conn.airport} for +${holdMinutes}m to protect ${conn.passengers} pax from ${from.flight_id}`,
          rationale: `Closes the ${shortfall}m transfer shortfall at ${conn.airport}, safeguarding connection ${conn.connection_id} without exceeding turnaround limits.`,
        });
      }
    }
  }

  // 2. Deterministically evaluate each candidate
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

    // Weighted operational objective function:
    // 1 breach resolved = 10,000 pts (critical safety/legality)
    // 1 broken connection saved = 200 pts
    // 1 stranded pax saved = 50 pts
    // 1 delay minute saved = 1 pt
    // Penalize if action causes new crew breaches or dramatically worsens stranded pax
    const score =
      crewBreachesResolved * 10000 +
      brokenConnectionsSaved * 200 +
      strandedPaxSaved * 50 +
      delayMinutesSaved * 1;

    let summary = '';
    if (crewBreachesResolved > 0) {
      summary += `Resolves ${crewBreachesResolved} illegal crew breach${crewBreachesResolved > 1 ? 'es' : ''}. `;
    }
    if (delayMinutesSaved > 0) {
      summary += `Saves ${delayMinutesSaved} mins of network delay. `;
    } else if (delayMinutesSaved < 0) {
      summary += `Adds ${Math.abs(delayMinutesSaved)} mins of operational hold. `;
    }
    if (brokenConnectionsSaved > 0) {
      summary += `Protects ${brokenConnectionsSaved} connection(s). `;
    }
    if (strandedPaxSaved > 0) {
      summary += `Reduces stranded pax by ${strandedPaxSaved}.`;
    }

    evaluatedCandidates.push({
      action,
      afterMetrics,
      delayMinutesSaved,
      strandedPaxSaved,
      crewBreachesResolved,
      brokenConnectionsSaved,
      score,
      summary: summary.trim(),
    });
  }

  // 3. Sort candidates by score descending
  evaluatedCandidates.sort((a, b) => b.score - a.score);

  // Return the top candidates (up to 4)
  const rankedCandidates = evaluatedCandidates.slice(0, 4);

  return {
    baselineResult,
    rankedCandidates,
  };
}
