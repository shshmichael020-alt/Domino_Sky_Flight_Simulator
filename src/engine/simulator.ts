/**
 * Domino Sky: Pure Deterministic Cascade Simulation Engine
 * Zero hallucinations. 100% reproducible operational calculations.
 */

import flightNetworkRaw from '../data/flight_network.json';
import {
  NetworkData,
  SimulatedFlight,
  SimulatedCrew,
  SimulatedConnection,
  DisruptionScenario,
  RecoveryAction,
  SimulationMetrics,
  SimulationResult,
  FlightStatus,
  CauseType,
} from '../types/network';
import {
  parseTimeToMinutes,
  formatMinutesToTime,
} from './time';

export const defaultNetworkData = flightNetworkRaw as unknown as NetworkData;

export interface SimulateOptions {
  networkData?: NetworkData;
  closedAirportId?: string | null;
  closureStartMin?: number;
  closureEndMin?: number;
  recoveryActions?: RecoveryAction[];
  scenarioLabel?: string;
}

/**
 * Deterministically simulates disruption cascade across the entire 16-airport network.
 */
export function simulateDisruption(options: SimulateOptions = {}): SimulationResult {
  const data = options.networkData || defaultNetworkData;
  const closedAirportId = options.closedAirportId ?? null;
  const closureStartMin = options.closureStartMin ?? 0;
  const closureEndMin = options.closureEndMin ?? 0;
  const recoveryActions = options.recoveryActions ?? [];
  const minTurnaround = data.meta.min_turnaround_minutes ?? 30;

  // Build indexed map of recovery actions
  const cancelledFlightIds = new Set<string>();
  const spareSwapsByFlightId = new Map<string, RecoveryAction>();
  const connectionHoldsByFlightId = new Map<string, RecoveryAction>();

  for (const action of recoveryActions) {
    if (action.type === 'CANCEL_FLIGHT') {
      cancelledFlightIds.add(action.flightId);
    } else if (action.type === 'SWAP_SPARE') {
      spareSwapsByFlightId.set(action.flightId, action);
    } else if (action.type === 'HOLD_CONNECTION') {
      connectionHoldsByFlightId.set(action.flightId, action);
    }
  }

  // Group flights by scheduled aircraft (tail_id) and sort by leg_order (1..N)
  const flightsByTail = new Map<string, typeof data.flights>();
  for (const f of data.flights) {
    if (!flightsByTail.has(f.tail_id)) {
      flightsByTail.set(f.tail_id, []);
    }
    flightsByTail.get(f.tail_id)!.push(f);
  }

  // Sort each tail's flights by leg_order
  flightsByTail.forEach((tailFlights) => {
    tailFlights.sort((a, b) => a.leg_order - b.leg_order);
  });

  const simulatedFlights: Record<string, SimulatedFlight> = {};
  let totalBufferAbsorbed = 0;

  // Process each tail's rotation sequentially
  for (const [scheduledTailId, tailFlights] of flightsByTail.entries()) {
    let prevOperatedFlight: SimulatedFlight | null = null;
    let activeTailId = scheduledTailId;
    let isChainSwappedWithSpare = false;

    for (const flight of tailFlights) {
      const scheduledDepMin = parseTimeToMinutes(flight.dep);
      const scheduledArrMin = parseTimeToMinutes(flight.arr);

      // 1. Check if flight is cancelled
      if (cancelledFlightIds.has(flight.flight_id)) {
        simulatedFlights[flight.flight_id] = {
          flight_id: flight.flight_id,
          tail_id: scheduledTailId,
          operated_by_tail: activeTailId,
          leg_order: flight.leg_order,
          origin: flight.origin,
          destination: flight.destination,
          scheduledDepMin,
          scheduledArrMin,
          actualDepMin: null,
          actualArrMin: null,
          scheduledDepStr: flight.dep,
          scheduledArrStr: flight.arr,
          actualDepStr: null,
          actualArrStr: null,
          delayMinutes: 0,
          block_minutes: flight.block_minutes,
          pax: flight.pax,
          cancelledPax: flight.pax,
          status: 'CANCELLED',
          causeType: 'CANCELLED',
          rootCauseFlightId: null,
          parentFlightId: null,
          causeExplanation: 'Flight cancelled by operational recovery decision to prevent downstream cascade.',
          bufferAbsorbedMin: 0,
          crewDutyBreached: false,
          crewId: '',
          crewDutyElapsedMin: 0,
          isSpareSwapped: isChainSwappedWithSpare,
          isConnectionHeld: false,
          holdMinutes: 0,
        };
        // When a flight is cancelled, subsequent legs on this tail cannot fly unless repositioned or on-time
        // In this schedule, cancellation acts as a circuit breaker for that leg.
        continue;
      }

      // 2. Check if a spare aircraft swap is initiated at this flight
      if (spareSwapsByFlightId.has(flight.flight_id)) {
        const swapAction = spareSwapsByFlightId.get(flight.flight_id)!;
        activeTailId = swapAction.spareTailId || 'VT-DS17';
        isChainSwappedWithSpare = true;
        // Sever inbound delay from previous late leg!
        prevOperatedFlight = null;
      }

      // 3. Compute earliest departure based on aircraft rotation
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
        totalBufferAbsorbed += bufferAbsorbedMin;
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

      // 4. Apply Airport Closure constraint [closureStartMin, closureEndMin)
      const isAirportClosed = closedAirportId !== null && closureEndMin > closureStartMin;
      let arrMin = depMin + flight.block_minutes;

      if (isAirportClosed) {
        // Departure closure: flight originates at closed airport
        if (flight.origin === closedAirportId) {
          if (depMin >= closureStartMin && depMin < closureEndMin) {
            depMin = closureEndMin;
            arrMin = depMin + flight.block_minutes;
            causeType = 'DIRECT_CLOSURE_DEP';
            rootCauseFlightId = flight.flight_id;
            parentFlightId = null;
            causeExplanation = `Direct departure ground stop at ${flight.origin}: runway closed ${formatMinutesToTime(closureStartMin)} - ${formatMinutesToTime(closureEndMin)} IST.`;
          }
        }

        // Arrival closure: flight lands at closed airport
        if (flight.destination === closedAirportId) {
          if (arrMin >= closureStartMin && arrMin < closureEndMin) {
            if (depMin < closureStartMin) {
              // Airborne holding until closure end
              arrMin = closureEndMin;
              causeType = 'DIRECT_CLOSURE_ARR';
              rootCauseFlightId = flight.flight_id;
              parentFlightId = null;
              causeExplanation = `Airborne holding over ${flight.destination}: runway closed until ${formatMinutesToTime(closureEndMin)} IST.`;
            } else {
              // Ground hold before takeoff
              depMin = Math.max(depMin, closureEndMin - flight.block_minutes);
              arrMin = depMin + flight.block_minutes;
              causeType = 'DIRECT_CLOSURE_ARR';
              rootCauseFlightId = flight.flight_id;
              parentFlightId = null;
              causeExplanation = `Ground hold at origin (${flight.origin}) for ${flight.destination} closure: held until ${formatMinutesToTime(closureEndMin)} IST.`;
            }
          }
        }
      }

      // 5. Apply any tactical HOLD_CONNECTION action
      let isConnectionHeld = false;
      let holdMinutes = 0;
      if (connectionHoldsByFlightId.has(flight.flight_id)) {
        const holdAction = connectionHoldsByFlightId.get(flight.flight_id)!;
        holdMinutes = holdAction.holdMinutes || 0;
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

      // Finalize flight times and delays
      const depDelayMinutes = Math.max(0, depMin - scheduledDepMin);
      const arrDelayMinutes = Math.max(0, arrMin - scheduledArrMin);
      const delayMinutes = Math.max(depDelayMinutes, arrDelayMinutes);

      let status: FlightStatus = 'ON_TIME';
      if (delayMinutes > 0) {
        if (causeType === 'DIRECT_CLOSURE_DEP' || causeType === 'DIRECT_CLOSURE_ARR') {
          status = 'DIRECT_DELAYED';
        } else {
          status = 'CASCADE_DELAYED';
        }
      } else if (isChainSwappedWithSpare) {
        status = 'RECOVERED';
      }

      const simFlight: SimulatedFlight = {
        flight_id: flight.flight_id,
        tail_id: scheduledTailId,
        operated_by_tail: activeTailId,
        leg_order: flight.leg_order,
        origin: flight.origin,
        destination: flight.destination,
        scheduledDepMin,
        scheduledArrMin,
        actualDepMin: depMin,
        actualArrMin: arrMin,
        scheduledDepStr: flight.dep,
        scheduledArrStr: flight.arr,
        actualDepStr: formatMinutesToTime(depMin),
        actualArrStr: formatMinutesToTime(arrMin),
        delayMinutes,
        block_minutes: flight.block_minutes,
        pax: flight.pax,
        cancelledPax: 0,
        status,
        causeType,
        rootCauseFlightId,
        parentFlightId,
        causeExplanation,
        bufferAbsorbedMin,
        crewDutyBreached: false,
        crewId: '',
        crewDutyElapsedMin: 0,
        isSpareSwapped: isChainSwappedWithSpare,
        isConnectionHeld,
        holdMinutes,
      };

      simulatedFlights[flight.flight_id] = simFlight;
      prevOperatedFlight = simFlight;
    }
  }

  // 6. Evaluate Crew Legal Duty Limits (DGCA CAR SEC 7 / Max 600 mins)
  const simulatedCrews: Record<string, SimulatedCrew> = {};
  let totalCrewBreaches = 0;

  for (const crew of data.crews) {
    const dutyStartMin = parseTimeToMinutes(crew.duty_start);
    const operatedFlightIds: string[] = [];
    const swappedOutFlightIds: string[] = [];
    let lastArrMin: number | null = null;

    for (const fId of crew.flight_ids) {
      const sf = simulatedFlights[fId];
      if (!sf) continue;
      sf.crewId = crew.crew_id;

      if (sf.status === 'CANCELLED') {
        // Cancelled legs do not add flight duty time
        continue;
      }

      if (sf.isSpareSwapped) {
        // Spare aircraft deployed with fresh standby crew; original crew relieved!
        swappedOutFlightIds.push(fId);
        continue;
      }

      operatedFlightIds.push(fId);
      if (sf.actualArrMin !== null) {
        if (lastArrMin === null || sf.actualArrMin > lastArrMin) {
          lastArrMin = sf.actualArrMin;
        }
      }
    }

    let actualDutyElapsedMin = 0;
    let isBreached = false;
    let breachMinutes = 0;

    if (operatedFlightIds.length > 0 && lastArrMin !== null) {
      actualDutyElapsedMin = lastArrMin - dutyStartMin;
      if (actualDutyElapsedMin > crew.max_duty_mins) {
        isBreached = true;
        breachMinutes = actualDutyElapsedMin - crew.max_duty_mins;
        totalCrewBreaches++;

        // Flag individual flights exceeding the duty threshold
        for (const fId of operatedFlightIds) {
          const sf = simulatedFlights[fId];
          if (sf && sf.actualArrMin !== null) {
            const elapsedAtLeg = sf.actualArrMin - dutyStartMin;
            sf.crewDutyElapsedMin = elapsedAtLeg;
            if (elapsedAtLeg > crew.max_duty_mins) {
              sf.crewDutyBreached = true;
            }
          }
        }
      } else {
        for (const fId of operatedFlightIds) {
          const sf = simulatedFlights[fId];
          if (sf && sf.actualArrMin !== null) {
            sf.crewDutyElapsedMin = sf.actualArrMin - dutyStartMin;
          }
        }
      }
    }

    simulatedCrews[crew.crew_id] = {
      crew_id: crew.crew_id,
      tail_id: crew.tail_id,
      base: crew.base,
      dutyStartMin,
      dutyStartStr: crew.duty_start,
      max_duty_mins: crew.max_duty_mins,
      actualDutyElapsedMin,
      isBreached,
      breachMinutes,
      operatedFlightIds,
      swappedOutFlightIds,
      lastArrMin,
    };
  }

  // 7. Evaluate Passenger Connections
  const simulatedConnections: Record<string, SimulatedConnection> = {};
  let brokenConnectionsCount = 0;
  let brokenConnectionPax = 0;
  let brokenPaxExcludingCancelledFlights = 0;

  for (const conn of data.connections) {
    const from = simulatedFlights[conn.from_flight];
    const to = simulatedFlights[conn.to_flight];

    if (!from || !to) continue;

    const scheduledConnectSlackMin =
      to.scheduledDepMin - from.scheduledArrMin - conn.min_connect_minutes;

    if (from.status === 'CANCELLED' || to.status === 'CANCELLED') {
      const brokenReason =
        from.status === 'CANCELLED'
          ? `Inbound flight ${from.flight_id} cancelled`
          : `Outbound flight ${to.flight_id} cancelled`;

      simulatedConnections[conn.connection_id] = {
        connection_id: conn.connection_id,
        airport: conn.airport,
        from_flight: conn.from_flight,
        to_flight: conn.to_flight,
        passengers: conn.passengers,
        min_connect_minutes: conn.min_connect_minutes,
        scheduledConnectSlackMin,
        actualConnectSlackMin: null,
        status: 'BROKEN',
        brokenReason,
      };
      brokenConnectionsCount++;
      brokenConnectionPax += conn.passengers;
      // Already counted in cancelledFlightPax, do not add to brokenPaxExcludingCancelledFlights
      continue;
    }

    // Both flights operated: check turnaround time window
    const connectWindow = to.actualDepMin! - from.actualArrMin!;
    const actualConnectSlackMin = connectWindow - conn.min_connect_minutes;

    if (connectWindow >= conn.min_connect_minutes) {
      simulatedConnections[conn.connection_id] = {
        connection_id: conn.connection_id,
        airport: conn.airport,
        from_flight: conn.from_flight,
        to_flight: conn.to_flight,
        passengers: conn.passengers,
        min_connect_minutes: conn.min_connect_minutes,
        scheduledConnectSlackMin,
        actualConnectSlackMin,
        status: 'MADE',
        brokenReason: null,
      };
    } else {
      const shortfall = conn.min_connect_minutes - connectWindow;
      simulatedConnections[conn.connection_id] = {
        connection_id: conn.connection_id,
        airport: conn.airport,
        from_flight: conn.from_flight,
        to_flight: conn.to_flight,
        passengers: conn.passengers,
        min_connect_minutes: conn.min_connect_minutes,
        scheduledConnectSlackMin,
        actualConnectSlackMin,
        status: 'BROKEN',
        brokenReason: `Misconnect: ${connectWindow}m transfer window vs ${conn.min_connect_minutes}m required (short by ${shortfall}m)`,
      };
      brokenConnectionsCount++;
      brokenConnectionPax += conn.passengers;
      brokenPaxExcludingCancelledFlights += conn.passengers;
    }
  }

  // 8. Compile Metrics
  const flightList = Object.values(simulatedFlights);
  const totalFlights = flightList.length;
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
      if (f.delayMinutes > maxDelayMinutes) {
        maxDelayMinutes = f.delayMinutes;
      }
    } else {
      onTimeFlights++;
    }
  }

  // Transparent, deduplicated stranded passenger computation
  const uniqueStrandedPax = cancelledFlightPax + brokenPaxExcludingCancelledFlights;

  const metrics: SimulationMetrics = {
    totalFlights,
    onTimeFlights,
    delayedFlights,
    cancelledFlights,
    totalDelayMinutes,
    maxDelayMinutes,
    brokenConnectionsCount,
    brokenConnectionPax,
    cancelledFlightPax,
    uniqueStrandedPax,
    crewBreachesCount: totalCrewBreaches,
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
    crews: simulatedCrews,
    crewList: Object.values(simulatedCrews),
    connections: simulatedConnections,
    connectionList: Object.values(simulatedConnections),
    metrics,
    appliedActions: recoveryActions,
  };
}
