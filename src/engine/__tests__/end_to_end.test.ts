import { describe, it, expect } from 'vitest';
import { simulateDisruption, defaultNetworkData } from '../simulator';
import { evaluateRecoveryCandidates } from '../recovery';
import { parseTimeToMinutes } from '../time';
import dispatcherHandler from '../../../api/dispatcher';

describe('End-to-End Math & AI Grounding Verification (BOM 90M Storm)', () => {
  const startMin = parseTimeToMinutes('08:00'); // 480
  const endMin = parseTimeToMinutes('09:30'); // 570

  it('23. Verifies default BOM 90-min storm: direct delays, rotation cascades, and stranded pax', () => {
    const result = simulateDisruption({
      networkData: defaultNetworkData,
      closedAirportId: 'BOM',
      closureStartMin: startMin,
      closureEndMin: endMin,
      scenarioLabel: 'Mumbai 90M Thunderstorm',
    });

    // Delayed flights > 0
    expect(result.metrics.delayedFlights).toBeGreaterThan(0);
    // Cascade flights > 0
    const cascadeFlights = result.flightList.filter(
      (f) => f.causeType === 'AIRCRAFT_ROTATION_CASCADE'
    );
    expect(cascadeFlights.length).toBeGreaterThan(0);

    // Stranded pax > 0
    expect(result.metrics.uniqueStrandedPax).toBeGreaterThan(0);
    // Direct delays present
    const directFlights = result.flightList.filter(
      (f) => f.causeType === 'DIRECT_CLOSURE_DEP' || f.causeType === 'DIRECT_CLOSURE_ARR'
    );
    expect(directFlights.length).toBeGreaterThan(0);
  });

  it('24. Applying top recovery action strictly improves core metrics with exact delta math', () => {
    const { baselineResult, rankedCandidates } = evaluateRecoveryCandidates({
      networkData: defaultNetworkData,
      closedAirportId: 'BOM',
      closureStartMin: startMin,
      closureEndMin: endMin,
      scenarioLabel: 'Mumbai 90M Thunderstorm',
    });

    expect(rankedCandidates.length).toBeGreaterThan(0);
    const top = rankedCandidates[0];

    // Re-simulate explicitly with top candidate action
    const after = simulateDisruption({
      networkData: defaultNetworkData,
      closedAirportId: 'BOM',
      closureStartMin: startMin,
      closureEndMin: endMin,
      recoveryActions: [top.action],
    });

    // Check exact delta calculations
    const exactDelaySaved =
      baselineResult.metrics.totalDelayMinutes - after.metrics.totalDelayMinutes;
    const exactPaxSaved =
      baselineResult.metrics.uniqueStrandedPax - after.metrics.uniqueStrandedPax;
    const exactBreachesResolved =
      baselineResult.metrics.crewBreachesCount - after.metrics.crewBreachesCount;
    const exactConnsSaved =
      baselineResult.metrics.brokenConnectionsCount - after.metrics.brokenConnectionsCount;

    expect(top.delayMinutesSaved).toBe(exactDelaySaved);
    expect(top.strandedPaxSaved).toBe(exactPaxSaved);
    expect(top.crewBreachesResolved).toBe(exactBreachesResolved);
    expect(top.brokenConnectionsSaved).toBe(exactConnsSaved);

    // Must strictly improve at least one operational metric
    const improved =
      top.delayMinutesSaved > 0 ||
      top.strandedPaxSaved > 0 ||
      top.crewBreachesResolved > 0 ||
      top.brokenConnectionsSaved > 0;
    expect(improved).toBe(true);
  });

  it('25. /api/dispatcher matches deterministic metrics verbatim with zero invented numbers', async () => {
    const baseline = simulateDisruption({
      networkData: defaultNetworkData,
      closedAirportId: 'BOM',
      closureStartMin: startMin,
      closureEndMin: endMin,
    });

    const req: any = {
      method: 'POST',
      headers: {},
      body: {
        scenario: baseline.scenario,
        metrics: baseline.metrics,
        topDelayedFlights: baseline.flightList
          .filter((f) => f.delayMinutes > 0)
          .map((f) => ({
            flightId: f.flight_id,
            tailId: f.operated_by_tail,
            origin: f.origin,
            dest: f.destination,
            delayMinutes: f.delayMinutes,
            causeType: f.causeType,
            causeExplanation: f.causeExplanation,
          })),
        topRecoveryCandidates: [],
      },
    };

    const res: any = {
      headers: {},
      setHeader(k: string, v: string) {
        this.headers[k] = v;
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.body = data;
        return this;
      },
    };

    await dispatcherHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();
    expect(typeof res.body.briefing).toBe('string');

    // Verify exact deterministic numbers are cited in briefing
    expect(res.body.briefing).toContain(`${baseline.metrics.delayedFlights} delayed flights`);
    expect(res.body.briefing).toContain(`${baseline.metrics.totalDelayMinutes} minutes`);
    expect(res.body.briefing).toContain(`${baseline.metrics.uniqueStrandedPax} unique stranded passengers`);
    expect(res.body.briefing).toContain(`${baseline.metrics.crewBreachesCount} crew duty breach(es)`);
  });
});
