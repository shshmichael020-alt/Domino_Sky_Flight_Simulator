/**
 * Domino Sky: Pure Deterministic Cascade Simulation Engine
 * Zero hallucinations. 100% reproducible operational calculations.
 */

import flightNetworkRaw from '../data/flight_network.json';
import {
  NetworkData,
  SimulatedFlight,
  DisruptionScenario,
  RecoveryAction,
  SimulationMetrics,
  SimulationResult,
  Flight,
} from '../types/network';
import { formatMinutesToTime } from './time';
import { MIN_TURNAROUND_MINUTES } from '../constants/operations';
import { evaluateCrewDutyLegality } from './crewEngine';
import { evaluatePassengerConnections } from './connectionEngine';
import { simulateTailLegs } from './legSimulator';

export const defaultNetworkData = flightNetworkRaw as unknown as NetworkData;

export interface SimulateOptions {
  networkData?: NetworkData;
  closedAirportId?: string | null;
  closureStartMin?: number;
  closureEndMin?: number;
  recoveryActions?: RecoveryAction[];
  scenarioLabel?: string;
}

interface ActionMaps {
  cancelledFlightIds: Set<string>;
  spareSwaps: Map<string, RecoveryAction>;
  connectionHolds: Map<string, RecoveryAction>;
}

function parseActionMaps(recoveryActions: RecoveryAction[]): ActionMaps {
  const cancelledFlightIds = new Set<string>();
  const spareSwaps = new Map<string, RecoveryAction>();
  const connectionHolds = new Map<string, RecoveryAction>();

  for (const action of recoveryActions) {
    if (action.type === 'CANCEL_FLIGHT') {
      cancelledFlightIds.add(action.flightId);
    } else if (action.type === 'SWAP_SPARE') {
      spareSwaps.set(action.flightId, action);
    } else if (action.type === 'HOLD_CONNECTION') {
      connectionHolds.set(action.flightId, action);
    }
  }

  return { cancelledFlightIds, spareSwaps, connectionHolds };
}

function groupFlightsByTail(flights: Flight[]): Map<string, Flight[]> {
  const map = new Map<string, Flight[]>();
  for (const f of flights) {
    if (!map.has(f.tail_id)) map.set(f.tail_id, []);
    map.get(f.tail_id)!.push(f);
  }
  map.forEach((list) => list.sort((a, b) => a.leg_order - b.leg_order));
  return map;
}

/**
 * Deterministically simulates disruption cascade across the entire 16-airport network.
 * Big-O complexity: O(F + C + K) where F is flights (70), C is connections (21), K is crews (16).
 *
 * @param options - Scenario constraints and recovery action overrides
 * @returns Complete operational simulation result with metrics, flights, crews, and connections
 */
export function simulateDisruption(options: SimulateOptions = {}): SimulationResult {
  const data = options.networkData || defaultNetworkData;
  const closedAirportId = options.closedAirportId ?? null;
  const closureStartMin = options.closureStartMin ?? 0;
  const closureEndMin = options.closureEndMin ?? 0;
  const recoveryActions = options.recoveryActions ?? [];
  const minTurnaround = data.meta.min_turnaround_minutes ?? MIN_TURNAROUND_MINUTES;

  const { cancelledFlightIds, spareSwaps, connectionHolds } = parseActionMaps(recoveryActions);
  const flightsByTail = groupFlightsByTail(data.flights);

  const simulatedFlights: Record<string, SimulatedFlight> = {};
  let totalBufferAbsorbed = 0;

  for (const [scheduledTailId, tailFlights] of flightsByTail.entries()) {
    const tailRes = simulateTailLegs({
      tailFlights,
      scheduledTailId,
      cancelledFlightIds,
      spareSwaps,
      connectionHolds,
      minTurnaround,
      closedAirportId,
      closureStartMin,
      closureEndMin,
    });

    Object.assign(simulatedFlights, tailRes.simulatedFlights);
    totalBufferAbsorbed += tailRes.bufferAbsorbedMin;
  }

  // Evaluate Crew Legality under DGCA CAR SEC 7
  const crewEval = evaluateCrewDutyLegality(data.crews, simulatedFlights);

  // Compile flight metrics
  const flightList = Object.values(simulatedFlights);
  let onTimeFlights = 0;
  let delayedFlights = 0;
  let cancelledFlights = 0;
  let totalDelayMinutes = 0;
  let maxDelayMinutes = 0;
  let cancelledFlightPax = 0;

  for (const f of flightList) {
    if (f.status === 'CANCELLED') {
      cancelledFlights++;
      cancelledFlightPax += f.pax;
    } else if (f.delayMinutes > 0) {
      delayedFlights++;
      totalDelayMinutes += f.delayMinutes;
      if (f.delayMinutes > maxDelayMinutes) maxDelayMinutes = f.delayMinutes;
    } else {
      onTimeFlights++;
    }
  }

  // Evaluate Passenger Connections & Stranded Pax Breakdown
  const connEval = evaluatePassengerConnections(data.connections, simulatedFlights, cancelledFlightPax);

  const metrics: SimulationMetrics = {
    totalFlights: flightList.length,
    onTimeFlights,
    delayedFlights,
    cancelledFlights,
    totalDelayMinutes,
    maxDelayMinutes,
    brokenConnectionsCount: connEval.brokenConnectionsCount,
    brokenConnectionPax: connEval.brokenConnectionPax,
    cancelledFlightPax,
    uniqueStrandedPax: connEval.uniqueStrandedPax,
    crewBreachesCount: crewEval.totalCrewBreaches,
    bufferAbsorbedTotalMin: totalBufferAbsorbed,
  };

  const scenario: DisruptionScenario = {
    closedAirportId,
    closureStartMin,
    closureEndMin,
    closureStartStr: formatMinutesToTime(closureStartMin),
    closureEndStr: formatMinutesToTime(closureEndMin),
    label: options.scenarioLabel || (closedAirportId ? `${closedAirportId} Closure` : 'Baseline (Normal Operations)'),
  };

  return {
    scenario,
    flights: simulatedFlights,
    flightList,
    crews: crewEval.simulatedCrews,
    crewList: crewEval.crewList,
    connections: connEval.simulatedConnections,
    connectionList: connEval.connectionList,
    metrics,
    appliedActions: recoveryActions,
  };
}
