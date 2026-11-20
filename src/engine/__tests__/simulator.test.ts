import { describe, it, expect } from 'vitest';
import { simulateDisruption, defaultNetworkData } from '../simulator';
import { parseTimeToMinutes, formatMinutesToTime, formatDuration, formatDelay } from '../time';

describe('Domino Sky Deterministic Simulation Engine', () => {
  it('1. Zero-disruption baseline: all 70 flights on time, 0 broken connections, 0 crew breaches', () => {
    const result = simulateDisruption({
      networkData: defaultNetworkData,
      closedAirportId: null,
      closureStartMin: 0,
      closureEndMin: 0,
    });

    expect(result.metrics.totalFlights).toBe(70);
    expect(result.metrics.onTimeFlights).toBe(70);
    expect(result.metrics.delayedFlights).toBe(0);
    expect(result.metrics.cancelledFlights).toBe(0);
    expect(result.metrics.totalDelayMinutes).toBe(0);
    expect(result.metrics.maxDelayMinutes).toBe(0);
    expect(result.metrics.brokenConnectionsCount).toBe(0);
    expect(result.metrics.brokenConnectionPax).toBe(0);
    expect(result.metrics.cancelledFlightPax).toBe(0);
    expect(result.metrics.uniqueStrandedPax).toBe(0);
    expect(result.metrics.crewBreachesCount).toBe(0);

    // Verify all connections are MADE
    expect(result.connectionList.length).toBe(21);
    result.connectionList.forEach((conn) => {
      expect(conn.status).toBe('MADE');
      expect(conn.actualConnectSlackMin).toBeGreaterThanOrEqual(0);
    });

    // Verify all crews are compliant
    expect(result.crewList.length).toBe(16);
    result.crewList.forEach((crew) => {
      expect(crew.isBreached).toBe(false);
      expect(crew.actualDutyElapsedMin).toBeLessThanOrEqual(crew.max_duty_mins);
    });
  });

  it('2. Mumbai (BOM) 90-minute storm (08:00–09:30 IST): direct delays and cascade propagation', () => {
    const startMin = parseTimeToMinutes('08:00'); // 480
    const endMin = parseTimeToMinutes('09:30'); // 570

    const result = simulateDisruption({
      networkData: defaultNetworkData,
      closedAirportId: 'BOM',
      closureStartMin: startMin,
      closureEndMin: endMin,
      scenarioLabel: 'Mumbai 90M Storm',
    });

    // Directly affected departure flights:
    // DS0501 scheduled 08:15 BOM->BLR (should depart at 09:30, delay = 75m)
    const ds0501 = result.flights['DS0501'];
    expect(ds0501).toBeDefined();
    expect(ds0501.causeType).toBe('DIRECT_CLOSURE_DEP');
    expect(ds0501.actualDepMin).toBe(endMin);
    expect(ds0501.delayMinutes).toBe(75);

    // DS1202 scheduled 08:10 BOM->AMD (should depart at 09:30, delay = 80m)
    const ds1202 = result.flights['DS1202'];
    expect(ds1202).toBeDefined();
    expect(ds1202.causeType).toBe('DIRECT_CLOSURE_DEP');
    expect(ds1202.actualDepMin).toBe(endMin);
    expect(ds1202.delayMinutes).toBe(80);

    // Directly affected arrival flights:
    // DS0201 DEL->BOM dep 06:00, arr 08:10 (falls inside 08:00-09:30).
    // Dep is 06:00 < 08:00, so airborne holding at BOM until 09:30!
    const ds0201 = result.flights['DS0201'];
    expect(ds0201).toBeDefined();
    expect(ds0201.causeType).toBe('DIRECT_CLOSURE_ARR');
    expect(ds0201.actualArrMin).toBe(endMin);

    // Downstream cascade on VT-DS05:
    // DS0501 arrives at BLR at 09:30 + 105 = 11:15.
    // Turnaround buffer min = 30m -> ready at 11:45.
    // DS0502 scheduled dep was 11:10.
    // Earliest dep = 11:45 -> delayed by 35m!
    const ds0502 = result.flights['DS0502'];
    expect(ds0502).toBeDefined();
    expect(ds0502.causeType).toBe('AIRCRAFT_ROTATION_CASCADE');
    expect(ds0502.parentFlightId).toBe('DS0501');
    expect(ds0502.delayMinutes).toBe(35);

    // Total delayed flights should be > 0 and metrics updated
    expect(result.metrics.delayedFlights).toBeGreaterThan(0);
    expect(result.metrics.totalDelayMinutes).toBeGreaterThan(0);
    expect(result.metrics.brokenConnectionsCount).toBeGreaterThan(0);
  });

  it('3. Turnaround buffer absorption math: slack absorbs upstream delay', () => {
    const startMin = parseTimeToMinutes('08:00');
    const endMin = parseTimeToMinutes('09:30');

    const result = simulateDisruption({
      networkData: defaultNetworkData,
      closedAirportId: 'BOM',
      closureStartMin: startMin,
      closureEndMin: endMin,
    });

    // In DS0501 -> DS0502:
    // DS0501 scheduled arr: 10:00, actual arr: 11:15 (delay 75m).
    // DS0502 scheduled dep: 11:10.
    // Scheduled turnaround was 70m (10:00 to 11:10).
    // Minimum turnaround is 30m. Available slack was 70 - 30 = 40m.
    // Therefore, the 40m slack absorbed 40m of the 75m delay!
    // Remaining delay on DS0502 is 75 - 40 = 35m.
    const ds0502 = result.flights['DS0502'];
    expect(ds0502.bufferAbsorbedMin).toBe(40);
    expect(ds0502.delayMinutes).toBe(35);
  });

  it('4. Broken connection detection around min_connect_minutes boundary', () => {
    // CX01: BOM, from DS1201 (arr 07:40) to DS1502 (dep 08:50). min_connect = 45m.
    // Scheduled gap: 08:50 - 07:40 = 70m (slack = 25m).
    // If BOM closure delays DS1201 arrival or DS1502 dep:
    const startMin = parseTimeToMinutes('07:00');
    const endMin = parseTimeToMinutes('08:15'); // delays DS1201 arrival to 08:15

    const result = simulateDisruption({
      networkData: defaultNetworkData,
      closedAirportId: 'BOM',
      closureStartMin: startMin,
      closureEndMin: endMin,
    });

    // DS1201 was scheduled arr 07:40, airborne hold to 08:15.
    // DS1502 dep was scheduled 08:50, but delayed to ...
    // Transfer window = DS1502.actualDepMin - DS1201.actualArrMin
    const cx01 = result.connections['CX01'];
    expect(cx01).toBeDefined();
    const from = result.flights['DS1201'];
    const to = result.flights['DS1502'];
    const window = to.actualDepMin! - from.actualArrMin!;
    if (window < 45) {
      expect(cx01.status).toBe('BROKEN');
    } else {
      expect(cx01.status).toBe('MADE');
    }
  });

  it('5. Crew 600-minute max duty breach detection under severe cascade', () => {
    // Extended BOM closure from 07:00 to 10:00 pushes crew CR05 or CR04 beyond 600 mins
    const startMin = parseTimeToMinutes('07:00');
    const endMin = parseTimeToMinutes('10:00');

    const result = simulateDisruption({
      networkData: defaultNetworkData,
      closedAirportId: 'BOM',
      closureStartMin: startMin,
      closureEndMin: endMin,
    });

    expect(result.metrics.crewBreachesCount).toBeGreaterThan(0);
    const breachedCrews = result.crewList.filter((c) => c.isBreached);
    expect(breachedCrews.length).toBeGreaterThan(0);

    breachedCrews.forEach((c) => {
      expect(c.actualDutyElapsedMin).toBeGreaterThan(c.max_duty_mins);
      expect(c.breachMinutes).toBe(c.actualDutyElapsedMin - c.max_duty_mins);
    });
  });

  it('6. Edge case: empty closure (0 min duration) produces baseline', () => {
    const result = simulateDisruption({
      networkData: defaultNetworkData,
      closedAirportId: 'BOM',
      closureStartMin: 500,
      closureEndMin: 500,
    });

    expect(result.metrics.delayedFlights).toBe(0);
    expect(result.metrics.totalDelayMinutes).toBe(0);
    expect(result.metrics.crewBreachesCount).toBe(0);
  });

  it('7. Edge case: late-night rollover past 23:59 handles minutes >= 1440 cleanly', () => {
    expect(formatMinutesToTime(1440)).toBe('+1d 00:00');
    expect(formatMinutesToTime(1505)).toBe('+1d 01:05');
    expect(formatMinutesToTime(2885)).toBe('+2d 00:05');
    expect(formatDuration(150)).toBe('2h 30m');
    expect(formatDelay(0)).toBe('On Time');
    expect(formatDelay(75)).toBe('+1h 15m');
  });

  it('8. Edge case: unknown airport ID does not crash and produces baseline', () => {
    const result = simulateDisruption({
      networkData: defaultNetworkData,
      closedAirportId: 'INVALID_XYZ',
      closureStartMin: 400,
      closureEndMin: 600,
    });

    expect(result.metrics.delayedFlights).toBe(0);
    expect(result.metrics.totalDelayMinutes).toBe(0);
  });

  it('9. Delhi (DEL) morning fog (06:00-08:30 IST): tests hub ground stop & CR01/CR02 delays', () => {
    const startMin = parseTimeToMinutes('06:00');
    const endMin = parseTimeToMinutes('08:30');

    const result = simulateDisruption({
      networkData: defaultNetworkData,
      closedAirportId: 'DEL',
      closureStartMin: startMin,
      closureEndMin: endMin,
      scenarioLabel: 'Delhi Morning Fog',
    });

    // DS0201 scheduled 06:00 DEL->BOM held until 08:30
    const ds0201 = result.flights['DS0201'];
    expect(ds0201.causeType).toBe('DIRECT_CLOSURE_DEP');
    expect(ds0201.actualDepMin).toBe(endMin);
    expect(ds0201.delayMinutes).toBe(150); // 08:30 - 06:00

    // DS0101 scheduled 08:00 DEL->JAI held until 08:30
    const ds0101 = result.flights['DS0101'];
    expect(ds0101.causeType).toBe('DIRECT_CLOSURE_DEP');
    expect(ds0101.actualDepMin).toBe(endMin);
    expect(ds0101.delayMinutes).toBe(30);

    expect(result.metrics.totalDelayMinutes).toBeGreaterThan(0);
    expect(result.metrics.delayedFlights).toBeGreaterThan(0);
  });

  it('10. Bengaluru (BLR) ground stop (09:00-11:00 IST) cascades to southern feeder network', () => {
    const startMin = parseTimeToMinutes('09:00');
    const endMin = parseTimeToMinutes('11:00');

    const result = simulateDisruption({
      networkData: defaultNetworkData,
      closedAirportId: 'BLR',
      closureStartMin: startMin,
      closureEndMin: endMin,
      scenarioLabel: 'BLR Ground Stop',
    });

    // Inbound DS0501 BOM->BLR scheduled 08:15->10:00 lands during closure: airborne hold to 11:00!
    const ds0501 = result.flights['DS0501'];
    expect(ds0501.causeType).toBe('DIRECT_CLOSURE_ARR');
    expect(ds0501.actualArrMin).toBe(endMin);

    // DS0603 scheduled 09:40 BLR->MAA departs at 11:00
    const ds0603 = result.flights['DS0603'];
    expect(ds0603.causeType).toBe('DIRECT_CLOSURE_DEP');
    expect(ds0603.actualDepMin).toBe(endMin);
  });

  it('11. Exact connection boundary test: transfer window >= min_connect_minutes is MADE, < is BROKEN', () => {
    // Custom network data with exact 45m boundary
    const customData = JSON.parse(JSON.stringify(defaultNetworkData));
    // F1 arrives at 10:00 (600m). F2 departs at 10:45 (645m). min_connect = 45m.
    // Transfer window = 645 - 600 = 45m. Exactly min_connect_minutes!
    customData.flights = [
      { flight_id: 'F1', tail_id: 'T1', leg_order: 1, origin: 'DEL', destination: 'BOM', dep: '08:00', arr: '10:00', block_minutes: 120, pax: 100, turnaround_before_min: null },
      { flight_id: 'F2', tail_id: 'T2', leg_order: 1, origin: 'BOM', destination: 'BLR', dep: '10:45', arr: '12:00', block_minutes: 75, pax: 100, turnaround_before_min: null }
    ];
    customData.connections = [
      { connection_id: 'C1', airport: 'BOM', from_flight: 'F1', to_flight: 'F2', passengers: 30, min_connect_minutes: 45 }
    ];
    customData.crews = [];
    customData.spare_aircraft = [];

    // Case A: 45m window -> MADE
    const resultMade = simulateDisruption({ networkData: customData });
    expect(resultMade.connections['C1'].status).toBe('MADE');
    expect(resultMade.connections['C1'].actualConnectSlackMin).toBe(0);

    // Case B: Inbound F1 delayed by 1m (arrives 10:01 = 601m) -> window = 44m (< 45m) -> BROKEN
    customData.flights[0].arr = '10:01';
    customData.flights[0].block_minutes = 121;
    const resultBroken = simulateDisruption({ networkData: customData });
    expect(resultBroken.connections['C1'].status).toBe('BROKEN');
    expect(resultBroken.connections['C1'].actualConnectSlackMin).toBe(-1);
  });

  it('12. Exact crew duty boundary test: 600m duty is legal, 601m triggers breach', () => {
    const customData = JSON.parse(JSON.stringify(defaultNetworkData));
    // Crew duty_start = 06:00 (360m). Max duty = 600m. Curfew = 360 + 600 = 960m (16:00).
    customData.flights = [
      { flight_id: 'F1', tail_id: 'T1', leg_order: 1, origin: 'DEL', destination: 'BOM', dep: '07:00', arr: '16:00', block_minutes: 540, pax: 100, turnaround_before_min: null }
    ];
    customData.crews = [
      { crew_id: 'CR_TEST', tail_id: 'T1', base: 'DEL', duty_start: '06:00', max_duty_mins: 600, flight_ids: ['F1'] }
    ];
    customData.connections = [];
    customData.spare_aircraft = [];

    // Case A: Exactly 600m duty (arr at 16:00 = 960m, 960 - 360 = 600m) -> 100% LEGAL
    const resultLegal = simulateDisruption({ networkData: customData });
    expect(resultLegal.crews['CR_TEST'].isBreached).toBe(false);
    expect(resultLegal.crews['CR_TEST'].actualDutyElapsedMin).toBe(600);
    expect(resultLegal.metrics.crewBreachesCount).toBe(0);

    // Case B: 601m duty (arr at 16:01 = 961m, 961 - 360 = 601m) -> BREACH!
    customData.flights[0].arr = '16:01';
    customData.flights[0].block_minutes = 541;
    const resultBreach = simulateDisruption({ networkData: customData });
    expect(resultBreach.crews['CR_TEST'].isBreached).toBe(true);
    expect(resultBreach.crews['CR_TEST'].breachMinutes).toBe(1);
    expect(resultBreach.metrics.crewBreachesCount).toBe(1);
  });
});
