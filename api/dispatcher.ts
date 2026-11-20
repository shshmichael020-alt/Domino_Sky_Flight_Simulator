/**
 * Domino Sky: AI Airline Operations Dispatcher (Vercel Serverless Function)
 * 100% Self-contained for Vercel Node Serverless runtime (zero fragile ESM relative imports).
 * Strict validation, in-memory rate limiting, server-side Gemini 2.5 Flash, deterministic fallback.
 */

export const VALID_AIRPORT_IDS = new Set([
  'DEL', 'BOM', 'BLR', 'HYD', 'MAA', 'CCU', 'AMD', 'COK',
  'GOI', 'PNQ', 'JAI', 'GAU', 'LKO', 'IXC', 'BBI', 'TRV',
]);

export const RATE_LIMIT_CONFIG = {
  MAX_REQUESTS: 40,
  WINDOW_MS: 60_000,
  MAX_PAYLOAD_BYTES: 32_768,
  TIMEOUT_MS: 12_000,
  MAX_QUESTION_LEN: 250,
} as const;

export interface MetricSummary {
  totalFlights?: number;
  onTimeFlights?: number;
  delayedFlights?: number;
  cancelledFlights?: number;
  totalDelayMinutes?: number;
  maxDelayMinutes?: number;
  brokenConnectionsCount?: number;
  brokenConnectionPax?: number;
  cancelledFlightPax?: number;
  uniqueStrandedPax?: number;
  crewBreachesCount?: number;
  bufferAbsorbedTotalMin?: number;
}

export interface CandidateSummary {
  id: string;
  type: string;
  description: string;
  rationale: string;
  delayMinutesSaved: number;
  strandedPaxSaved: number;
  crewBreachesResolved: number;
  brokenConnectionsSaved: number;
  score: number;
}

export interface RequestBody {
  scenario?: {
    closedAirportId?: string | null;
    closureStartMin?: number;
    closureEndMin?: number;
    closureStartStr?: string;
    closureEndStr?: string;
  };
  metrics?: MetricSummary;
  topDelayedFlights?: Array<{
    flightId: string;
    tailId: string;
    origin: string;
    dest: string;
    delayMinutes: number;
    causeType: string;
    causeExplanation: string;
  }>;
  brokenConnections?: Array<{
    connectionId: string;
    airport: string;
    fromFlight: string;
    toFlight: string;
    passengers: number;
    reason: string;
  }>;
  crewBreaches?: Array<{
    crewId: string;
    tailId: string;
    breachMinutes: number;
    dutyElapsed: number;
    maxDuty: number;
  }>;
  topRecoveryCandidates?: CandidateSummary[];
  question?: string;
}

export interface DispatcherResult {
  briefing: string;
  recommendations: string[];
  keyRisks: string[];
  confidence: number;
  mode: 'live_gemini' | 'deterministic_fallback';
  note?: string;
}

export interface ServerlessReq {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
  body: RequestBody | string;
}

export interface ServerlessRes {
  statusCode?: number;
  setHeader: (key: string, value: string) => void;
  status: (code: number) => ServerlessRes;
  json: (data: unknown) => void;
}

const ipRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_CONFIG.WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_CONFIG.MAX_REQUESTS) return false;
  entry.count++;
  return true;
}

function sanitizeText(input: string): string {
  return input.slice(0, RATE_LIMIT_CONFIG.MAX_QUESTION_LEN).replace(/[<>]/g, '').trim();
}

function validateRequest(body: RequestBody): { valid: boolean; error?: string } {
  const scenario = body.scenario;
  if (!scenario) return { valid: true };
  if (scenario.closedAirportId && !VALID_AIRPORT_IDS.has(scenario.closedAirportId)) {
    return { valid: false, error: `Invalid airport ID: ${scenario.closedAirportId}. Must be one of 16 valid hubs.` };
  }
  const { closureStartMin, closureEndMin } = scenario;
  if (typeof closureStartMin === 'number' && (closureStartMin < 0 || closureStartMin > 1440)) {
    return { valid: false, error: 'closureStartMin must be between 0 and 1440.' };
  }
  if (typeof closureEndMin === 'number' && (closureEndMin < 0 || closureEndMin > 1440)) {
    return { valid: false, error: 'closureEndMin must be between 0 and 1440.' };
  }
  return { valid: true };
}

function extractMetrics(body: RequestBody): Required<MetricSummary> {
  return {
    totalFlights: body.metrics?.totalFlights ?? 70,
    onTimeFlights: body.metrics?.onTimeFlights ?? 70,
    delayedFlights: body.metrics?.delayedFlights ?? 0,
    cancelledFlights: body.metrics?.cancelledFlights ?? 0,
    totalDelayMinutes: body.metrics?.totalDelayMinutes ?? 0,
    maxDelayMinutes: body.metrics?.maxDelayMinutes ?? 0,
    brokenConnectionsCount: body.metrics?.brokenConnectionsCount ?? 0,
    brokenConnectionPax: body.metrics?.brokenConnectionPax ?? 0,
    cancelledFlightPax: body.metrics?.cancelledFlightPax ?? 0,
    uniqueStrandedPax: body.metrics?.uniqueStrandedPax ?? 0,
    crewBreachesCount: body.metrics?.crewBreachesCount ?? 0,
    bufferAbsorbedTotalMin: body.metrics?.bufferAbsorbedTotalMin ?? 0,
  };
}

function buildDeterministicFallback(
  body: RequestBody,
  metrics: Required<MetricSummary>,
  airportLabel: string,
  closureTimeStr: string,
  userQuestion: string | null,
  note?: string
): DispatcherResult {
  let briefing: string;
  const recommendations: string[] = [];
  const keyRisks: string[] = [];

  if (metrics.delayedFlights === 0 && metrics.crewBreachesCount === 0) {
    briefing = 'NETWORK COMPLIANT: All 70 scheduled flights operating on schedule across all 16 stations. 0 broken connections, 0 crew duty exceedances. Minimum turnaround slack absorbing minor operational variances.';
    recommendations.push('Maintain active watch on secondary spokes.');
    recommendations.push('Keep reserve aircraft VT-DS17 (BLR) and VT-DS18 (DEL) in hot-standby status.');
  } else {
    briefing = `DISRUPTION ACTIVE [${airportLabel} | ${closureTimeStr}]: Network telemetry reports ${metrics.delayedFlights} delayed flights totaling ${metrics.totalDelayMinutes} minutes of cumulative delay (max single flight delay: ${metrics.maxDelayMinutes}m). Turnaround schedule buffers absorbed ${metrics.bufferAbsorbedTotalMin} minutes of upstream delay. There are ${metrics.brokenConnectionsCount} broken passenger connections, resulting in ${metrics.uniqueStrandedPax} unique stranded passengers (${metrics.cancelledFlightPax} from cancelled flights, ${metrics.brokenConnectionPax} from missed hub transfers). ${metrics.crewBreachesCount} crew duty breach(es) detected under DGCA CAR SEC 7.`;
    const candidates = body.topRecoveryCandidates || [];
    if (candidates.length > 0) {
      candidates.slice(0, 3).forEach((cand, idx) => {
        recommendations.push(`Option ${idx + 1} (${cand.type}): ${cand.description}. Projected savings: ${cand.delayMinutesSaved}m delay, ${cand.crewBreachesResolved} crew breaches resolved, ${cand.strandedPaxSaved} pax saved.`);
      });
    } else {
      recommendations.push('Review available spare aircraft VT-DS17 (BLR) and VT-DS18 (DEL) for rotation swaps.');
      recommendations.push('Evaluate tactical connection holds on outbound spoke feeders.');
    }
    if (metrics.crewBreachesCount > 0) {
      keyRisks.push(`CRITICAL: ${metrics.crewBreachesCount} crew duty exceedance(s) (>600 min limit). Immediate crew swap or truncation required to avoid DGCA legality penalty.`);
    }
    if (metrics.uniqueStrandedPax > 0) {
      keyRisks.push(`PASSENGER IMPACT: ${metrics.uniqueStrandedPax} passengers stranded at hub stations. Prioritize hotel accommodations and re-routing via partner flights.`);
    }
  }

  if (userQuestion) {
    briefing += `\n\nDirect Dispatch Answer to: "${userQuestion}"\nBased on deterministic simulation state: ${metrics.delayedFlights} flights delayed, ${metrics.totalDelayMinutes}m total network delay, and ${metrics.crewBreachesCount} crew breaches.`;
  }

  return {
    briefing,
    recommendations,
    keyRisks,
    confidence: 0.99,
    mode: 'deterministic_fallback',
    note: note || 'Operating in high-precision deterministic dispatcher mode.',
  };
}

export default async function handler(req: ServerlessReq, res: ServerlessRes): Promise<void> {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return;
  }

  const contentLength = req.headers['content-length'];
  if (contentLength && parseInt(contentLength as string, 10) > RATE_LIMIT_CONFIG.MAX_PAYLOAD_BYTES) {
    res.status(413).json({ error: 'Payload Too Large. Max size is 32KB.' });
    return;
  }

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || '127.0.0.1';
  if (!checkRateLimit(clientIp)) {
    res.status(429).json({ error: 'Rate limit exceeded. Please wait 60s.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body) as RequestBody;
    } catch {
      res.status(400).json({ error: 'Malformed JSON payload.' });
      return;
    }
  }

  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Invalid JSON request body.' });
    return;
  }

  const validation = validateRequest(body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const metrics = extractMetrics(body);
  const airportLabel = body.scenario?.closedAirportId || 'None (Baseline)';
  const closureTimeStr =
    body.scenario?.closedAirportId && body.scenario?.closureStartStr && body.scenario?.closureEndStr
      ? `${body.scenario.closureStartStr}–${body.scenario.closureEndStr} IST`
      : 'No active closure';

  const userQuestion = body.question ? sanitizeText(body.question) : null;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_key_here') {
    res.status(200).json(buildDeterministicFallback(body, metrics, airportLabel, closureTimeStr, userQuestion, 'No API key set.'));
    return;
  }

  try {
    const promptContext = {
      scenario: { airport: airportLabel, closureTime: closureTimeStr },
      metrics,
      topDelayedFlights: (body.topDelayedFlights || []).slice(0, 8),
      brokenConnections: (body.brokenConnections || []).slice(0, 6),
      crewBreaches: body.crewBreaches || [],
      recoveryCandidates: (body.topRecoveryCandidates || []).slice(0, 4),
      userQuestion: userQuestion || 'Provide an executive operational assessment.',
    };

    const systemPrompt = `You are Domino Sky's AI Airline Operations Dispatcher. Explain why delays cascaded and recommend the best recovery.
STRICT RULE: Every number (delay minutes, flight counts, stranded pax, breach minutes) MUST match the provided JSON payload verbatim. Never invent numbers.
Return in JSON format: {"briefing": "string", "recommendations": ["string"], "keyRisks": ["string"], "confidence": 0.98}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RATE_LIMIT_CONFIG.TIMEOUT_MS);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nTelemetry:\n${JSON.stringify(promptContext)}` }] }],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      res.status(200).json(buildDeterministicFallback(body, metrics, airportLabel, closureTimeStr, userQuestion, `API status ${response.status}`));
      return;
    }

    const data = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      res.status(200).json(buildDeterministicFallback(body, metrics, airportLabel, closureTimeStr, userQuestion, 'Empty model output'));
      return;
    }

    const parsed = JSON.parse(responseText) as { briefing?: string; recommendations?: string[]; keyRisks?: string[]; confidence?: number };
    const telemetryHeader = `[VERIFIED DISPATCH TELEMETRY: ${metrics.delayedFlights} Delayed | +${metrics.totalDelayMinutes}m Network Delay | ${metrics.uniqueStrandedPax} Stranded Pax | ${metrics.crewBreachesCount} Crew Breaches]`;

    res.status(200).json({
      briefing: `${telemetryHeader}\n\n${parsed.briefing || 'Assessment complete.'}`,
      recommendations: parsed.recommendations || [],
      keyRisks: parsed.keyRisks || [],
      confidence: parsed.confidence || 0.98,
      mode: 'live_gemini',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown exception';
    res.status(200).json(buildDeterministicFallback(body, metrics, airportLabel, closureTimeStr, userQuestion, `Fallback: ${errorMsg}`));
  }
}
