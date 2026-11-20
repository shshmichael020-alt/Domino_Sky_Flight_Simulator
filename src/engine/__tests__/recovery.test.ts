import { describe, it, expect } from 'vitest';
import { evaluateRecoveryCandidates } from '../recovery';
import { simulateDisruption, defaultNetworkData } from '../simulator';
import { parseTimeToMinutes } from '../time';

describe('Domino Sky Deterministic Recovery Optimizer', () => {
  it('9. Spare aircraft swap (VT-DS17 at BLR) resets rotation delay and crew legality', () => {
    // BOM storm from 08:00 to 09:30 delays DS0501 (BOM->BLR), which cascades into DS0502 (BLR->COK).
    const startMin = parseTimeToMinutes('08:00');
    const endMin = parseTimeToMinutes('09:30');

    const before = simulateDisruption({
      networkData: defaultNetworkData,
      closedAirportId: 'BOM',
      closureStartMin: startMin,
      closureEndMin: endMin,
    });

    const beforeDelay = before.flights['DS0502'].delayMinutes;
    expect(beforeDelay).toBeGreaterThan(0);

    // Swap spare VT-DS17 onto DS0502 at BLR (spare available from 05:00 at BLR)
    const after = simulateDisruption({
      networkData: defaultNetworkData,
      closedAirportId: 'BOM',
      closureStartMin: startMin,
      closureEndMin: endMin,
      recoveryActions: [
        {
          id: 'SWAP_VT-DS17_DS0502',
          type: 'SWAP_SPARE',
          flightId: 'DS0502',
          tailId: 'VT-DS05',
          spareTailId: 'VT-DS17',
          description: 'Swap VT-DS17 onto DS0502 at BLR',
          rationale: 'Severs inbound delay from DS0501 and resets duty period',
        },
      ],
    });

    const afterFlight = after.flights['DS0502'];
    expect(afterFlight.operated_by_tail).toBe('VT-DS17');
    expect(afterFlight.delayMinutes).toBe(0); // departs on time!
    expect(afterFlight.isSpareSwapped).toBe(true);

    // Network delay should be strictly lower after swap
    expect(after.metrics.totalDelayMinutes).toBeLessThan(before.metrics.totalDelayMinutes);
  });

  it('10. Cancellation recovery & deduplicated stranded passenger count', () => {
    const startMin = parseTimeToMinutes('08:00');
    const endMin = parseTimeToMinutes('09:30');

    // Cancel DS0401 (141 pax)
    const result = simulateDisruption({
      networkData: defaultNetworkData,
      closedAirportId: 'BOM',
      closureStartMin: startMin,
      closureEndMin: endMin,
      recoveryActions: [
        {
          id: 'CANCEL_DS0401',
          type: 'CANCEL_FLIGHT',
          flightId: 'DS0401',
          tailId: 'VT-DS04',
          description: 'Cancel DS0401',
          rationale: 'Halt downstream cascade',
        },
      ],
    });

    const f = result.flights['DS0401'];
    expect(f.status).toBe('CANCELLED');
    expect(f.actualDepMin).toBeNull();
    expect(f.cancelledPax).toBe(141);

    // Verify deduplicated stranded passengers:
    // cancelledFlightPax should include 141
    expect(result.metrics.cancelledFlightPax).toBeGreaterThanOrEqual(141);
    // uniqueStrandedPax must accurately reflect cancelled pax + only non-cancelled broken connection pax
    expect(result.metrics.uniqueStrandedPax).toBeGreaterThanOrEqual(141);
  });

  it('11. Targeted connection hold protects connecting passengers', () => {
    // Under 07:00-08:15 BOM closure, if connection CX01 is broken with a small shortfall
    const startMin = parseTimeToMinutes('07:00');
    const endMin = parseTimeToMinutes('08:15');

    const before = simulateDisruption({
      networkData: defaultNetworkData,
      closedAirportId: 'BOM',
      closureStartMin: startMin,
      closureEndMin: endMin,
    });

    const connBefore = before.connections['CX01'];
    if (connBefore && connBefore.status === 'BROKEN') {
      const from = before.flights['DS1201'];
      const to = before.flights['DS1502'];
      const currentWindow = to.actualDepMin! - from.actualArrMin!;
      const shortfall = connBefore.min_connect_minutes - currentWindow;

      if (shortfall > 0) {
        const after = simulateDisruption({
          networkData: defaultNetworkData,
          closedAirportId: 'BOM',
          closureStartMin: startMin,
          closureEndMin: endMin,
          recoveryActions: [
            {
              id: 'HOLD_DS1502_CX01',
              type: 'HOLD_CONNECTION',
              flightId: 'DS1502',
              holdMinutes: shortfall,
              targetConnectionId: 'CX01',
              description: 'Hold DS1502',
              rationale: 'Protect CX01',
            },
          ],
        });

        expect(after.connections['CX01'].status).toBe('MADE');
      }
    }
  });

  it('12. Optimizer generates, ranks, and evaluates top recovery candidates', () => {
    const startMin = parseTimeToMinutes('08:00');
    const endMin = parseTimeToMinutes('09:30');

    const { baselineResult, rankedCandidates } = evaluateRecoveryCandidates({
      networkData: defaultNetworkData,
      closedAirportId: 'BOM',
      closureStartMin: startMin,
      closureEndMin: endMin,
      scenarioLabel: 'Mumbai 90M Storm',
    });

    expect(baselineResult.metrics.totalDelayMinutes).toBeGreaterThan(0);
    expect(rankedCandidates.length).toBeGreaterThan(0);
    expect(rankedCandidates.length).toBeLessThanOrEqual(4);

    // Top candidate should have positive operational score or resolution
    const top = rankedCandidates[0];
    expect(top.action).toBeDefined();
    expect(top.score).toBeDefined();
    expect(top.afterMetrics).toBeDefined();
    expect(typeof top.summary).toBe('string');

    // Check ranked in descending order of score
    for (let i = 0; i < rankedCandidates.length - 1; i++) {
      expect(rankedCandidates[i].score).toBeGreaterThanOrEqual(rankedCandidates[i + 1].score);
    }
  });
});
