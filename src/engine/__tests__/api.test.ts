import { describe, it, expect } from 'vitest';
import handler from '../../../api/dispatcher';

describe('AI Dispatcher Serverless Function (api/dispatcher.ts)', () => {
  const createMockRes = () => {
    const res: any = {};
    res.statusCode = 200;
    res.headers = {};
    res.setHeader = (key: string, value: string) => {
      res.headers[key] = value;
      return res;
    };
    res.status = (code: number) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data: any) => {
      res.body = data;
      return res;
    };
    return res;
  };

  it('15. Rejects non-POST requests with HTTP 405 Method Not Allowed', async () => {
    const req: any = { method: 'GET', headers: {} };
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toContain('Method Not Allowed');
  });

  it('16. Validates airport ID against 16-hub whitelist and rejects unknown with HTTP 400', async () => {
    const req: any = {
      method: 'POST',
      headers: {},
      body: {
        scenario: { closedAirportId: 'INVALID_XYZ' },
      },
    };
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Invalid airport ID');
  });

  it('17. Validates numeric closure bounds (rejects negative or >1440 mins) with HTTP 400', async () => {
    const req: any = {
      method: 'POST',
      headers: {},
      body: {
        scenario: { closedAirportId: 'BOM', closureStartMin: -50 },
      },
    };
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('closureStartMin');
  });

  it('18. Seamlessly returns grounded deterministic fallback when GEMINI_API_KEY is not set', async () => {
    const req: any = {
      method: 'POST',
      headers: {},
      body: {
        scenario: {
          closedAirportId: 'BOM',
          closureStartMin: 480,
          closureEndMin: 570,
          closureStartStr: '08:00',
          closureEndStr: '09:30',
        },
        metrics: {
          totalFlights: 70,
          onTimeFlights: 56,
          delayedFlights: 14,
          cancelledFlights: 0,
          totalDelayMinutes: 540,
          maxDelayMinutes: 80,
          brokenConnectionsCount: 4,
          brokenConnectionPax: 148,
          cancelledFlightPax: 0,
          uniqueStrandedPax: 148,
          crewBreachesCount: 2,
          bufferAbsorbedTotalMin: 140,
        },
        topRecoveryCandidates: [
          {
            id: 'SWAP_VT-DS17_DS0502',
            type: 'SWAP_SPARE',
            description: 'Deploy spare VT-DS17 at BLR onto DS0502',
            rationale: 'Severs delay',
            delayMinutesSaved: 110,
            strandedPaxSaved: 44,
            crewBreachesResolved: 1,
            brokenConnectionsSaved: 1,
            score: 12500,
          },
        ],
      },
    };
    const res = createMockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.mode).toBe('deterministic_fallback');
    expect(res.body.briefing).toContain('14 delayed flights');
    expect(res.body.briefing).toContain('540 minutes');
    expect(res.body.briefing).toContain('148 unique stranded passengers');
    expect(res.body.briefing).toContain('2 crew duty breach(es)');
    expect(res.body.recommendations.length).toBeGreaterThan(0);
    expect(res.body.keyRisks.length).toBeGreaterThan(0);
  });
});
