/**
 * Domino Sky: Operational Constants & Thresholds
 * Centralized constants to eliminate magic numbers across the application.
 */

import { DisruptionScenario } from '../types/network';

/** Minimum turnaround duration required between legs (minutes) */
export const MIN_TURNAROUND_MINUTES = 30;

/** Maximum legal flight duty period under DGCA CAR SEC 7 (minutes) */
export const MAX_CREW_DUTY_MINUTES = 600;

/** Default minimum connection transfer window at hub stations (minutes) */
export const MIN_CONNECT_MINUTES_DEFAULT = 45;

/** Standard passenger seating capacity per aircraft */
export const SEATS_PER_AIRCRAFT = 180;

/** Minutes in a standard 24-hour day */
export const MINUTES_IN_DAY = 1440;

/** Tactical Gantt timeline start: 05:00 IST in minutes */
export const GANTT_TIMELINE_START_MIN = 300;

/** Tactical Gantt timeline end: 23:00 IST in minutes */
export const GANTT_TIMELINE_END_MIN = 1380;

/** Maximum allowable tactical gate hold for connecting passenger rescue (minutes) */
export const MAX_CONNECTION_HOLD_MINUTES = 30;

/** Minimum passenger volume required to warrant a tactical connection gate hold */
export const MIN_PASSENGERS_FOR_HOLD = 15;

/** Maximum number of top-ranked recovery candidate actions to return */
export const MAX_RECOVERY_CANDIDATES = 4;

/** Delay threshold to distinguish minor station delay from severe delay (minutes) */
export const SEVERE_DELAY_THRESHOLD_MINUTES = 45;

/** Critical crew duty buffer cutoff threshold (minutes) */
export const CREW_CRITICAL_CUTOFF_MINUTES = 60;

/** Weighted objective function coefficients for ranking recovery candidate actions */
export const RECOVERY_SCORE_WEIGHTS = {
  CREW_BREACH: 10000,
  BROKEN_CONNECTION: 200,
  STRANDED_PASSENGER: 50,
  DELAY_MINUTE: 1,
} as const;

/** SVG Map projection boundary limits and coordinate scales */
export const SVG_MAP_CONFIG = {
  MIN_LNG: 68.0,
  MAX_LNG: 95.0,
  MIN_LAT: 7.5,
  MAX_LAT: 33.5,
  SCALE_X: 700,
  SCALE_Y: 580,
  OFFSET_X: 40,
  OFFSET_Y: 35,
  VIEWBOX: '0 0 800 660',
} as const;

/** 16 Whitelisted Indian Airport Hub Identifiers */
export const VALID_AIRPORT_IDS = [
  'DEL', 'BOM', 'BLR', 'HYD', 'MAA', 'CCU', 'AMD', 'COK',
  'GOI', 'PNQ', 'JAI', 'GAU', 'LKO', 'IXC', 'BBI', 'TRV'
] as const;

export type ValidAirportId = typeof VALID_AIRPORT_IDS[number];

/** Pre-configured 1-click operational disruption presets */
export const PRESET_SCENARIOS: Record<'MUMBAI_STORM' | 'DELHI_FOG' | 'BLR_GROUND_STOP' | 'RESET', DisruptionScenario> = {
  MUMBAI_STORM: {
    closedAirportId: 'BOM',
    closureStartMin: 480, // 08:00
    closureEndMin: 570,   // 09:30
    closureStartStr: '08:00',
    closureEndStr: '09:30',
    label: 'Mumbai 90M Thunderstorm (08:00–09:30 IST)',
  },
  DELHI_FOG: {
    closedAirportId: 'DEL',
    closureStartMin: 360, // 06:00
    closureEndMin: 510,   // 08:30
    closureStartStr: '06:00',
    closureEndStr: '08:30',
    label: 'Delhi Dense Fog Ground Stop (06:00–08:30 IST)',
  },
  BLR_GROUND_STOP: {
    closedAirportId: 'BLR',
    closureStartMin: 540, // 09:00
    closureEndMin: 660,   // 11:00
    closureStartStr: '09:00',
    closureEndStr: '11:00',
    label: 'BLR Kempegowda Ground Stop (09:00–11:00 IST)',
  },
  RESET: {
    closedAirportId: null,
    closureStartMin: 0,
    closureEndMin: 0,
    closureStartStr: '00:00',
    closureEndStr: '00:00',
    label: 'Baseline (Normal Operations)',
  },
};
