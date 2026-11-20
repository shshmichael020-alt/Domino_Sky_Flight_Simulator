/**
 * Domino Sky: Crew Legality & Flight Duty Period Engine
 * Evaluates compliance with DGCA CAR Section 7 (Max 600-minute single-day duty limit).
 */

import { Crew, SimulatedFlight, SimulatedCrew } from '../types/network';
import { parseTimeToMinutes } from './time';
import { MAX_CREW_DUTY_MINUTES } from '../constants/operations';

export interface CrewEvaluationResult {
  simulatedCrews: Record<string, SimulatedCrew>;
  crewList: SimulatedCrew[];
  totalCrewBreaches: number;
}

/**
 * Deterministically checks crew flight duty periods across all scheduled crew pairings.
 *
 * @param crews - Registered crew pairings from network dataset
 * @param flights - Finalized simulated flights map
 * @returns Map of evaluated crew states and total breach count
 */
export function evaluateCrewDutyLegality(
  crews: Crew[],
  flights: Record<string, SimulatedFlight>
): CrewEvaluationResult {
  const simulatedCrews: Record<string, SimulatedCrew> = {};
  let totalCrewBreaches = 0;

  for (const crew of crews) {
    const dutyStartMin = parseTimeToMinutes(crew.duty_start);
    const maxDuty = crew.max_duty_mins || MAX_CREW_DUTY_MINUTES;
    const operatedFlightIds: string[] = [];
    const swappedOutFlightIds: string[] = [];
    let lastArrMin: number | null = null;

    for (const fId of crew.flight_ids) {
      const sf = flights[fId];
      if (!sf) continue;
      sf.crewId = crew.crew_id;

      if (sf.status === 'CANCELLED') continue;

      if (sf.isSpareSwapped) {
        swappedOutFlightIds.push(fId);
        continue;
      }

      operatedFlightIds.push(fId);
      if (sf.actualArrMin !== null && (lastArrMin === null || sf.actualArrMin > lastArrMin)) {
        lastArrMin = sf.actualArrMin;
      }
    }

    let actualDutyElapsedMin = 0;
    let isBreached = false;
    let breachMinutes = 0;

    if (operatedFlightIds.length > 0 && lastArrMin !== null) {
      actualDutyElapsedMin = lastArrMin - dutyStartMin;
      if (actualDutyElapsedMin > maxDuty) {
        isBreached = true;
        breachMinutes = actualDutyElapsedMin - maxDuty;
        totalCrewBreaches++;

        // Mark individual flights exceeding the legal duty threshold
        for (const fId of operatedFlightIds) {
          const sf = flights[fId];
          if (sf && sf.actualArrMin !== null) {
            const elapsedAtLeg = sf.actualArrMin - dutyStartMin;
            sf.crewDutyElapsedMin = elapsedAtLeg;
            if (elapsedAtLeg > maxDuty) {
              sf.crewDutyBreached = true;
            }
          }
        }
      } else {
        for (const fId of operatedFlightIds) {
          const sf = flights[fId];
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
      max_duty_mins: maxDuty,
      actualDutyElapsedMin,
      isBreached,
      breachMinutes,
      operatedFlightIds,
      swappedOutFlightIds,
      lastArrMin,
    };
  }

  return {
    simulatedCrews,
    crewList: Object.values(simulatedCrews),
    totalCrewBreaches,
  };
}
