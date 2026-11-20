/**
 * Domino Sky: Operational Candidate Generator
 * Generates candidate recovery actions (Spare Swaps, Cancellations, Connection Holds).
 */

import {
  NetworkData,
  RecoveryAction,
  SimulationResult,
} from '../types/network';
import { parseTimeToMinutes } from './time';
import {
  MAX_CONNECTION_HOLD_MINUTES,
  MIN_PASSENGERS_FOR_HOLD,
  SEVERE_DELAY_THRESHOLD_MINUTES,
} from '../constants/operations';

/**
 * Identifies spare swap candidates where a spare aircraft is available at the leg's origin.
 */
export function generateSpareSwapCandidates(
  data: NetworkData,
  baselineResult: SimulationResult,
  existingActionIds: Set<string>
): RecoveryAction[] {
  const candidates: RecoveryAction[] = [];

  for (const spare of data.spare_aircraft) {
    const spareAvailMin = parseTimeToMinutes(spare.available_from);

    for (const flight of data.flights) {
      if (flight.origin !== spare.base) continue;
      const scheduledDepMin = parseTimeToMinutes(flight.dep);
      if (scheduledDepMin < spareAvailMin) continue;

      const simFlight = baselineResult.flights[flight.flight_id];
      if (!simFlight) continue;

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
          candidates.push({
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

  return candidates;
}

/**
 * Identifies single-leg cancellation candidates that resolve crew duty breaches or severe delays.
 */
export function generateCancellationCandidates(
  data: NetworkData,
  baselineResult: SimulationResult,
  existingActionIds: Set<string>
): RecoveryAction[] {
  const candidates: RecoveryAction[] = [];

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

    if (
      simFlight.delayMinutes >= SEVERE_DELAY_THRESHOLD_MINUTES ||
      isBreachingLeg ||
      isHeavyDirect ||
      (isLastLeg && isBreachingLeg)
    ) {
      const actionId = `CANCEL_${flight.flight_id}`;
      if (!existingActionIds.has(actionId)) {
        candidates.push({
          id: actionId,
          type: 'CANCEL_FLIGHT',
          flightId: flight.flight_id,
          tailId: flight.tail_id,
          description: `Cancel flight ${flight.flight_id} (${flight.origin}→${flight.destination}, ${flight.pax} pax, delay +${simFlight.delayMinutes}m)`,
          rationale: isBreachingLeg
            ? `Eliminates illegal crew duty breach on tail ${flight.tail_id}.`
            : `Halts cascading turnaround delays on tail ${flight.tail_id} down the rotation chain.`,
        });
      }
    }
  }

  return candidates;
}

/**
 * Identifies targeted connection hold candidates to protect connecting passenger itineraries.
 */
export function generateConnectionHoldCandidates(
  baselineResult: SimulationResult,
  existingActionIds: Set<string>
): RecoveryAction[] {
  const candidates: RecoveryAction[] = [];

  for (const conn of baselineResult.connectionList) {
    if (conn.status !== 'BROKEN') continue;
    const from = baselineResult.flights[conn.from_flight];
    const to = baselineResult.flights[conn.to_flight];

    if (!from || !to || from.status === 'CANCELLED' || to.status === 'CANCELLED') continue;
    if (from.actualArrMin === null || to.actualDepMin === null) continue;

    const transferWindow = to.actualDepMin - from.actualArrMin;
    const shortfall = conn.min_connect_minutes - transferWindow;

    if (shortfall > 0 && shortfall <= MAX_CONNECTION_HOLD_MINUTES && conn.passengers >= MIN_PASSENGERS_FOR_HOLD) {
      const holdMinutes = shortfall;
      const actionId = `HOLD_${to.flight_id}_${conn.connection_id}`;
      if (!existingActionIds.has(actionId)) {
        candidates.push({
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

  return candidates;
}
