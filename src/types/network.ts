/**
 * Domino Sky: Flight Disruption Cascade & Recovery Simulator
 * Strict TypeScript Type Definitions
 */

export interface Airport {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  tier: 'mega_hub' | 'regional_hub' | 'spoke';
  capacity_per_hour: number;
}

export interface Flight {
  flight_id: string;
  tail_id: string;
  leg_order: number;
  origin: string;
  destination: string;
  dep: string; // HH:MM
  arr: string; // HH:MM
  block_minutes: number;
  pax: number;
  turnaround_before_min: number | null;
}

export interface Connection {
  connection_id: string;
  airport: string;
  from_flight: string;
  to_flight: string;
  passengers: number;
  min_connect_minutes: number;
}

export interface Crew {
  crew_id: string;
  tail_id: string;
  base: string;
  duty_start: string; // HH:MM
  max_duty_mins: number;
  flight_ids: string[];
}

export interface SpareAircraft {
  tail_id: string;
  base: string;
  available_from: string; // HH:MM
  seats: number;
}

export interface NetworkMeta {
  dataset: string;
  operating_day: string;
  min_turnaround_minutes: number;
  seats_per_aircraft: number;
  notes: string[];
}

export interface NetworkData {
  meta: NetworkMeta;
  airports: Airport[];
  flights: Flight[];
  connections: Connection[];
  crews: Crew[];
  spare_aircraft: SpareAircraft[];
}

export type CauseType =
  | 'ON_TIME'
  | 'DIRECT_CLOSURE_DEP'
  | 'DIRECT_CLOSURE_ARR'
  | 'AIRCRAFT_ROTATION_CASCADE'
  | 'CONNECTION_HOLD'
  | 'CANCELLED';

export type FlightStatus =
  | 'ON_TIME'
  | 'DIRECT_DELAYED'
  | 'CASCADE_DELAYED'
  | 'CANCELLED'
  | 'RECOVERED';

export interface SimulatedFlight {
  flight_id: string;
  tail_id: string; // Scheduled tail
  operated_by_tail: string; // May be spare (e.g. VT-DS17)
  leg_order: number;
  origin: string;
  destination: string;
  scheduledDepMin: number;
  scheduledArrMin: number;
  actualDepMin: number | null;
  actualArrMin: number | null;
  scheduledDepStr: string;
  scheduledArrStr: string;
  actualDepStr: string | null;
  actualArrStr: string | null;
  delayMinutes: number;
  block_minutes: number;
  pax: number;
  cancelledPax: number;
  status: FlightStatus;
  causeType: CauseType;
  rootCauseFlightId: string | null;
  parentFlightId: string | null;
  causeExplanation: string;
  bufferAbsorbedMin: number;
  crewDutyBreached: boolean;
  crewId: string;
  crewDutyElapsedMin: number;
  isSpareSwapped: boolean;
  isConnectionHeld: boolean;
  holdMinutes: number;
}

export interface SimulatedCrew {
  crew_id: string;
  tail_id: string;
  base: string;
  dutyStartMin: number;
  dutyStartStr: string;
  max_duty_mins: number;
  actualDutyElapsedMin: number;
  isBreached: boolean;
  breachMinutes: number;
  operatedFlightIds: string[];
  swappedOutFlightIds: string[];
  lastArrMin: number | null;
}

export interface SimulatedConnection {
  connection_id: string;
  airport: string;
  from_flight: string;
  to_flight: string;
  passengers: number;
  min_connect_minutes: number;
  scheduledConnectSlackMin: number;
  actualConnectSlackMin: number | null;
  status: 'MADE' | 'BROKEN';
  brokenReason: string | null;
}

export interface DisruptionScenario {
  closedAirportId: string | null;
  closureStartMin: number;
  closureEndMin: number;
  closureStartStr: string;
  closureEndStr: string;
  label: string;
}

export type RecoveryActionType = 'SWAP_SPARE' | 'CANCEL_FLIGHT' | 'HOLD_CONNECTION';

export interface RecoveryAction {
  id: string;
  type: RecoveryActionType;
  flightId: string;
  tailId?: string;
  spareTailId?: string;
  holdMinutes?: number;
  targetConnectionId?: string;
  description: string;
  rationale: string;
}

export interface SimulationMetrics {
  totalFlights: number;
  onTimeFlights: number;
  delayedFlights: number;
  cancelledFlights: number;
  totalDelayMinutes: number;
  maxDelayMinutes: number;
  brokenConnectionsCount: number;
  brokenConnectionPax: number;
  cancelledFlightPax: number;
  uniqueStrandedPax: number;
  crewBreachesCount: number;
  bufferAbsorbedTotalMin: number;
}

export interface SimulationResult {
  scenario: DisruptionScenario;
  flights: Record<string, SimulatedFlight>;
  flightList: SimulatedFlight[];
  crews: Record<string, SimulatedCrew>;
  crewList: SimulatedCrew[];
  connections: Record<string, SimulatedConnection>;
  connectionList: SimulatedConnection[];
  metrics: SimulationMetrics;
  appliedActions: RecoveryAction[];
}

export interface EvaluatedRecoveryCandidate {
  action: RecoveryAction;
  afterMetrics: SimulationMetrics;
  delayMinutesSaved: number;
  strandedPaxSaved: number;
  crewBreachesResolved: number;
  brokenConnectionsSaved: number;
  score: number;
  summary: string;
}

export interface DispatcherPayload {
  scenario: DisruptionScenario;
  metrics: SimulationMetrics;
  topDelayedFlights: {
    flightId: string;
    tailId: string;
    origin: string;
    dest: string;
    delayMinutes: number;
    causeType: CauseType;
    causeExplanation: string;
  }[];
  brokenConnections: {
    connectionId: string;
    airport: string;
    fromFlight: string;
    toFlight: string;
    passengers: number;
    reason: string;
  }[];
  crewBreaches: {
    crewId: string;
    tailId: string;
    breachMinutes: number;
    dutyElapsed: number;
    maxDuty: number;
  }[];
  topRecoveryCandidates: {
    id: string;
    type: RecoveryActionType;
    description: string;
    rationale: string;
    delayMinutesSaved: number;
    strandedPaxSaved: number;
    crewBreachesResolved: number;
    brokenConnectionsSaved: number;
    score: number;
  }[];
  question?: string;
}

export interface DispatcherResponse {
  briefing: string;
  recommendations: string[];
  keyRisks: string[];
  confidence: number;
  mode: 'live_gemini' | 'deterministic_fallback';
}
