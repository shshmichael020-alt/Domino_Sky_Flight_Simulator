/**
 * Domino Sky: Time utilities for IST HH:MM conversions & formatting
 */

/**
 * Parses an HH:MM string into minutes from midnight (00:00 = 0).
 * Handles malformed strings gracefully.
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

/**
 * Formats minutes from midnight into HH:MM IST format.
 * If minutes >= 1440 (24h rollover), formats as "+1d HH:MM".
 */
export function formatMinutesToTime(minutes: number): string {
  if (isNaN(minutes)) return '--:--';
  const totalMins = Math.max(0, Math.round(minutes));
  const days = Math.floor(totalMins / 1440);
  const remainingMins = totalMins % 1440;
  const hours = Math.floor(remainingMins / 60);
  const mins = remainingMins % 60;

  const hh = hours.toString().padStart(2, '0');
  const mm = mins.toString().padStart(2, '0');

  if (days > 0) {
    return `+${days}d ${hh}:${mm}`;
  }
  return `${hh}:${mm}`;
}

/**
 * Formats minutes into standard 24h format (e.g. 24:15 or 00:15) without +1d prefix.
 */
export function formatMinutesTo24h(minutes: number): string {
  if (isNaN(minutes)) return '--:--';
  const totalMins = Math.max(0, Math.round(minutes));
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const hh = hours.toString().padStart(2, '0');
  const mm = mins.toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Formats a duration in minutes into a human-readable string (e.g., "1h 35m", "45m", "0m").
 */
export function formatDuration(minutes: number): string {
  if (isNaN(minutes) || minutes <= 0) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

/**
 * Formats a delay value with leading plus sign, e.g., "+55m", "+1h 30m", or "On Time".
 */
export function formatDelay(minutes: number): string {
  if (isNaN(minutes) || minutes <= 0) return 'On Time';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `+${mins}m`;
  if (mins === 0) return `+${hrs}h`;
  return `+${hrs}h ${mins}m`;
}
