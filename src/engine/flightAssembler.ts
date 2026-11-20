/**
 * Domino Sky: Simulated Flight Object Assembler
 * Creates typed SimulatedFlight instances with exact causal attribution.
 */

import { Flight, SimulatedFlight, CauseType, FlightStatus } from '../types/network';
import { parseTimeToMinutes, formatMinutesToTime } from './time';

export interface AssembleFlightParams {
  flight: Flight;
  scheduledTailId: string;
  activeTailId: string;
  scheduledDepMin: number;
  scheduledArrMin: number;
  actualDepMin: number;
  actualArrMin: number;
  delayMinutes: number;
  status: FlightStatus;
  causeType: CauseType;
  rootCauseFlightId: string | null;
  parentFlightId: string | null;
  causeExplanation: string;
  bufferAbsorbedMin: number;
  isChainSwapped: boolean;
  isConnectionHeld: boolean;
  holdMinutes: number;
}

/**
 * Creates a cancelled flight representation.
 */
export function createCancelledFlight(
  flight: Flight,
  tailId: string,
  isChainSwapped: boolean
): SimulatedFlight {
  const scheduledDepMin = parseTimeToMinutes(flight.dep);
  const scheduledArrMin = parseTimeToMinutes(flight.arr);

  return {
    flight_id: flight.flight_id,
    tail_id: flight.tail_id,
    operated_by_tail: tailId,
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
    isSpareSwapped: isChainSwapped,
    isConnectionHeld: false,
    holdMinutes: 0,
  };
}

/**
 * Assembles a fully simulated active flight record.
 */
export function assembleSimulatedFlight(params: AssembleFlightParams): SimulatedFlight {
  const {
    flight,
    scheduledTailId,
    activeTailId,
    scheduledDepMin,
    scheduledArrMin,
    actualDepMin,
    actualArrMin,
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
  } = params;

  return {
    flight_id: flight.flight_id,
    tail_id: scheduledTailId,
    operated_by_tail: activeTailId,
    leg_order: flight.leg_order,
    origin: flight.origin,
    destination: flight.destination,
    scheduledDepMin,
    scheduledArrMin,
    actualDepMin,
    actualArrMin,
    scheduledDepStr: flight.dep,
    scheduledArrStr: flight.arr,
    actualDepStr: formatMinutesToTime(actualDepMin),
    actualArrStr: formatMinutesToTime(actualArrMin),
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
    isSpareSwapped: isChainSwapped,
    isConnectionHeld,
    holdMinutes,
  };
}
