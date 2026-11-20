/**
 * Domino Sky: Pure Deterministic Tail Leg Simulation
 * Simulates leg-by-leg propagation, turnaround buffers, closures, and swaps.
 */

import {
  Flight,
  SimulatedFlight,
  RecoveryAction,
  CauseType,
  FlightStatus,
} from '../types/network';
import { parseTimeToMinutes } from './time';
import { applyAirportClosure } from './closureEngine';
import { createCancelledFlight, assembleSimulatedFlight } from './flightAssembler';

export interface SimulateTailLegsParams {
  tailFlights: Flight[];
  scheduledTailId: string;
  cancelledFlightIds: Set<string>;
  spareSwaps: Map<string, RecoveryAction>;
  connectionHolds: Map<string, RecoveryAction>;
  minTurnaround: number;
  closedAirportId: string | null;
  closureStartMin: number;
  closureEndMin: number;
}

export interface TailSimulationResult {
  simulatedFlights: Record<string, SimulatedFlight>;
  bufferAbsorbedMin: number;
}

export { createCancelledFlight };

/**
 * Simulates all legs for a single aircraft tail in sequential leg order.
 * Big-O complexity: O(L) where L is the number of legs on this tail (<= 6).
 */
export function simulateTailLegs(params: SimulateTailLegsParams): TailSimulationResult {
  const {
    tailFlights,
    scheduledTailId,
    cancelledFlightIds,
    spareSwaps,
    connectionHolds,
    minTurnaround,
    closedAirportId,
    closureStartMin,
    closureEndMin,
  } = params;

  const resultFlights: Record<string, SimulatedFlight> = {};
  let totalTailBufferAbsorbed = 0;
  let prevOperatedFlight: SimulatedFlight | null = null;
  let activeTailId = scheduledTailId;
  let isChainSwapped = false;

  for (const flight of tailFlights) {
    if (cancelledFlightIds.has(flight.flight_id)) {
      resultFlights[flight.flight_id] = createCancelledFlight(flight, activeTailId, isChainSwapped);
      continue;
    }

    if (spareSwaps.has(flight.flight_id)) {
      const swapAction = spareSwaps.get(flight.flight_id)!;
      activeTailId = swapAction.spareTailId || 'VT-DS17';
      isChainSwapped = true;
      prevOperatedFlight = null;
    }

    const scheduledDepMin = parseTimeToMinutes(flight.dep);
    const scheduledArrMin = parseTimeToMinutes(flight.arr);

    let prevReadyMin = 0;
    let bufferAbsorbedMin = 0;
    let upstreamDelay = 0;

    if (prevOperatedFlight && prevOperatedFlight.actualArrMin !== null) {
      prevReadyMin = prevOperatedFlight.actualArrMin + minTurnaround;
      upstreamDelay = prevOperatedFlight.delayMinutes;
    }

    let depMin = Math.max(scheduledDepMin, prevReadyMin);

    if (prevOperatedFlight && upstreamDelay > 0) {
      const rotationDelay = Math.max(0, depMin - scheduledDepMin);
      bufferAbsorbedMin = Math.max(0, upstreamDelay - rotationDelay);
      totalTailBufferAbsorbed += bufferAbsorbedMin;
    }

    let causeType: CauseType = 'ON_TIME';
    let parentFlightId: string | null = null;
    let rootCauseFlightId: string | null = null;
    let causeExplanation = 'Operating strictly on schedule';

    if (depMin > scheduledDepMin && prevOperatedFlight) {
      causeType = 'AIRCRAFT_ROTATION_CASCADE';
      parentFlightId = prevOperatedFlight.flight_id;
      rootCauseFlightId = prevOperatedFlight.rootCauseFlightId || prevOperatedFlight.flight_id;
      causeExplanation = `Delayed +${depMin - scheduledDepMin}m: inbound ${activeTailId} arrived late from ${prevOperatedFlight.origin} (${prevOperatedFlight.flight_id}). Turnaround buffer absorbed ${bufferAbsorbedMin}m.`;
    }

    // Apply Airport Closure
    const closure = applyAirportClosure(
      flight.origin,
      flight.destination,
      flight.flight_id,
      depMin,
      flight.block_minutes,
      closedAirportId,
      closureStartMin,
      closureEndMin,
      causeType,
      rootCauseFlightId,
      parentFlightId,
      causeExplanation
    );

    depMin = closure.depMin;
    let arrMin = closure.arrMin;
    causeType = closure.causeType;
    rootCauseFlightId = closure.rootCauseFlightId;
    parentFlightId = closure.parentFlightId;
    causeExplanation = closure.causeExplanation;

    // Apply Connection Hold
    let isConnectionHeld = false;
    let holdMinutes = 0;
    if (connectionHolds.has(flight.flight_id)) {
      holdMinutes = connectionHolds.get(flight.flight_id)!.holdMinutes || 0;
      if (holdMinutes > 0) {
        depMin += holdMinutes;
        arrMin = depMin + flight.block_minutes;
        isConnectionHeld = true;
        if (causeType === 'ON_TIME') {
          causeType = 'CONNECTION_HOLD';
          causeExplanation = `Tactical connection protection: held +${holdMinutes}m to protect connecting passengers.`;
        } else {
          causeExplanation += ` (Plus intentional +${holdMinutes}m gate hold for connecting pax).`;
        }
      }
    }

    const depDelay = Math.max(0, depMin - scheduledDepMin);
    const arrDelay = Math.max(0, arrMin - scheduledArrMin);
    const delayMinutes = Math.max(depDelay, arrDelay);

    let status: FlightStatus = 'ON_TIME';
    if (delayMinutes > 0) {
      status = (causeType === 'DIRECT_CLOSURE_DEP' || causeType === 'DIRECT_CLOSURE_ARR')
        ? 'DIRECT_DELAYED'
        : 'CASCADE_DELAYED';
    } else if (isChainSwapped) {
      status = 'RECOVERED';
    }

    const simFlight = assembleSimulatedFlight({
      flight,
      scheduledTailId,
      activeTailId,
      scheduledDepMin,
      scheduledArrMin,
      actualDepMin: depMin,
      actualArrMin: arrMin,
      delayMinutes,
      status,
      causeType,
      rootCauseFlightId,
      parentFlightId,
      causeExplanation,
      bufferAbsorbedMin,
      isChainSwapped,
      isConnectionHeld,
      holdMinutes,
    });

    resultFlights[flight.flight_id] = simFlight;
    prevOperatedFlight = simFlight;
  }

  return {
    simulatedFlights: resultFlights,
    bufferAbsorbedMin: totalTailBufferAbsorbed,
  };
}
