/**
 * Domino Sky: Airport Runway Closure Engine
 * Pure deterministic functions applying departure and arrival closure constraints.
 */

import { CauseType } from '../types/network';
import { formatMinutesToTime } from './time';

export interface ClosureResult {
  depMin: number;
  arrMin: number;
  causeType: CauseType;
  rootCauseFlightId: string | null;
  parentFlightId: string | null;
  causeExplanation: string;
}

/**
 * Evaluates whether a flight is affected by an active airport closure.
 *
 * @param origin - Departure station IATA code
 * @param destination - Arrival station IATA code
 * @param flightId - Unique flight designator
 * @param depMin - Earliest departure minute based on rotation
 * @param blockMinutes - Scheduled block duration in minutes
 * @param closedAirportId - Closed airport IATA code or null
 * @param closureStartMin - Start of runway closure in minutes from midnight
 * @param closureEndMin - End of runway closure in minutes from midnight
 * @param currentCause - Existing cause from rotation cascade
 * @param currentRoot - Existing root cause flight ID
 * @param currentParent - Existing parent flight ID
 * @param currentExplanation - Existing causal narrative
 * @returns Updated flight departure, arrival, and causal attribution
 */
export function applyAirportClosure(
  origin: string,
  destination: string,
  flightId: string,
  depMin: number,
  blockMinutes: number,
  closedAirportId: string | null,
  closureStartMin: number,
  closureEndMin: number,
  currentCause: CauseType,
  currentRoot: string | null,
  currentParent: string | null,
  currentExplanation: string
): ClosureResult {
  let finalDep = depMin;
  let finalArr = depMin + blockMinutes;
  let cause = currentCause;
  let root = currentRoot;
  let parent = currentParent;
  let explanation = currentExplanation;

  const isClosed = closedAirportId !== null && closureEndMin > closureStartMin;
  if (!isClosed) {
    return { depMin: finalDep, arrMin: finalArr, causeType: cause, rootCauseFlightId: root, parentFlightId: parent, causeExplanation: explanation };
  }

  // 1. Departure closure: Flight originates at closed airport
  if (origin === closedAirportId && depMin >= closureStartMin && depMin < closureEndMin) {
    finalDep = closureEndMin;
    finalArr = finalDep + blockMinutes;
    cause = 'DIRECT_CLOSURE_DEP';
    root = flightId;
    parent = null;
    explanation = `Direct departure ground stop at ${origin}: runway closed ${formatMinutesToTime(closureStartMin)} - ${formatMinutesToTime(closureEndMin)} IST.`;
  }

  // 2. Arrival closure: Flight lands at closed airport
  if (destination === closedAirportId && finalArr >= closureStartMin && finalArr < closureEndMin) {
    if (finalDep < closureStartMin) {
      // Airborne holding until runway opens
      finalArr = closureEndMin;
      cause = 'DIRECT_CLOSURE_ARR';
      root = flightId;
      parent = null;
      explanation = `Airborne holding over ${destination}: runway closed until ${formatMinutesToTime(closureEndMin)} IST.`;
    } else {
      // Ground hold before takeoff
      finalDep = Math.max(finalDep, closureEndMin - blockMinutes);
      finalArr = finalDep + blockMinutes;
      cause = 'DIRECT_CLOSURE_ARR';
      root = flightId;
      parent = null;
      explanation = `Ground hold at origin (${origin}) for ${destination} closure: held until ${formatMinutesToTime(closureEndMin)} IST.`;
    }
  }

  return {
    depMin: finalDep,
    arrMin: finalArr,
    causeType: cause,
    rootCauseFlightId: root,
    parentFlightId: parent,
    causeExplanation: explanation,
  };
}
