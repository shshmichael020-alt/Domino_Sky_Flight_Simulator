/**
 * Domino Sky: Passenger Connection & Stranded Pax Evaluator
 * Deterministically checks all 21 hub connections and computes transparent stranded pax totals.
 */

import { Connection, SimulatedFlight, SimulatedConnection } from '../types/network';

export interface ConnectionEvaluationResult {
  simulatedConnections: Record<string, SimulatedConnection>;
  connectionList: SimulatedConnection[];
  brokenConnectionsCount: number;
  brokenConnectionPax: number;
  uniqueStrandedPax: number;
}

/**
 * Evaluates all hub connections after flight arrival and departure times are finalized.
 *
 * @param connections - Connection itineraries from network dataset
 * @param flights - Finalized simulated flights map
 * @param cancelledFlightPax - Total passengers booked on cancelled flights
 * @returns Evaluated connections and deduplicated stranded passenger accounting
 */
export function evaluatePassengerConnections(
  connections: Connection[],
  flights: Record<string, SimulatedFlight>,
  cancelledFlightPax: number
): ConnectionEvaluationResult {
  const simulatedConnections: Record<string, SimulatedConnection> = {};
  let brokenConnectionsCount = 0;
  let brokenConnectionPax = 0;
  let brokenPaxExcludingCancelledFlights = 0;

  for (const conn of connections) {
    const from = flights[conn.from_flight];
    const to = flights[conn.to_flight];

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
      // Already accounted for in cancelledFlightPax; avoid double-counting
      continue;
    }

    // Both flights operated: check turnaround time window against min_connect_minutes
    const fromArr = from.actualArrMin ?? from.scheduledArrMin;
    const toDep = to.actualDepMin ?? to.scheduledDepMin;
    const connectWindow = toDep - fromArr;
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

  // Transparent deduplication: cancelled pax + non-cancelled missed connection pax
  const uniqueStrandedPax = cancelledFlightPax + brokenPaxExcludingCancelledFlights;

  return {
    simulatedConnections,
    connectionList: Object.values(simulatedConnections),
    brokenConnectionsCount,
    brokenConnectionPax,
    uniqueStrandedPax,
  };
}
