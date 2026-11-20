import React, { useState, useEffect } from 'react';
import {
  EvaluatedRecoveryCandidate,
  RecoveryAction,
  SimulationMetrics,
  DisruptionScenario,
  DispatcherResponse,
  SimulatedFlight,
} from '../types/network';
import {
  Bot,
  Zap,
  Plus,
  Minus,
  RefreshCw,
  Send,
} from 'lucide-react';

interface RecoveryStudioProps {
  candidates: EvaluatedRecoveryCandidate[];
  appliedActions: RecoveryAction[];
  onToggleAction: (action: RecoveryAction) => void;
  metrics: SimulationMetrics;
  scenario: DisruptionScenario;
  flights: SimulatedFlight[];
}

export const RecoveryStudio: React.FC<RecoveryStudioProps> = ({
  candidates,
  appliedActions,
  onToggleAction,
  metrics,
  scenario,
  flights,
}) => {
  const [dispatcherData, setDispatcherData] = useState<DispatcherResponse | null>(null);
  const [isLoadingDispatcher, setIsLoadingDispatcher] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);

  const appliedIds = new Set(appliedActions.map((a) => a.id));

  // Local deterministic fallback ensuring the app NEVER breaks even in pure offline/dev mode
  const generateLocalDeterministicFallback = React.useCallback((question?: string) => {
    let briefing: string;
    const recommendations: string[] = [];
    const keyRisks: string[] = [];

    if (metrics.delayedFlights === 0) {
      briefing = 'NOMINAL STATE: All 70 scheduled flights operating strictly on time. 0 broken connections, 0 crew duty exceedances. Standby fleet VT-DS17 (BLR) and VT-DS18 (DEL) ready.';
      recommendations.push('Maintain active watch on regional feeder routes.');
    } else {
      briefing = `DISRUPTION TELEMETRY: ${metrics.delayedFlights} flights delayed totaling ${metrics.totalDelayMinutes}m delay (max single delay +${metrics.maxDelayMinutes}m). Turnaround schedule buffers absorbed ${metrics.bufferAbsorbedTotalMin}m of cascade. ${metrics.brokenConnectionsCount} connections broken with ${metrics.uniqueStrandedPax} unique stranded passengers. ${metrics.crewBreachesCount} crew duty breach(es) under DGCA CAR SEC 7.`;

      candidates.slice(0, 3).forEach((cand, i) => {
        recommendations.push(
          `Rank ${i + 1}: ${cand.action.description} (${cand.summary})`
        );
      });

      if (metrics.crewBreachesCount > 0) {
        keyRisks.push(`CRITICAL: ${metrics.crewBreachesCount} crew exceedance(s) (>600m). Immediate swap or cancellation required.`);
      }
      if (metrics.uniqueStrandedPax > 0) {
        keyRisks.push(`PASSENGER IMPACT: ${metrics.uniqueStrandedPax} passengers stranded at hub stations.`);
      }
    }

    if (question) {
      briefing += `\n\nQ&A Response: "${question}"\nOperational telemetry indicates ${metrics.delayedFlights} flights impacted with ${metrics.totalDelayMinutes}m delay and ${metrics.crewBreachesCount} crew breaches. Recommend executing candidate recovery actions above.`;
    }

    setDispatcherData({
      briefing,
      recommendations,
      keyRisks,
      confidence: 0.99,
      mode: 'deterministic_fallback',
    });
  }, [metrics, candidates]);

  // Function to call AI Dispatcher endpoint
  const fetchDispatcherBriefing = React.useCallback(async (customQuestion?: string) => {
    setIsLoadingDispatcher(true);
    try {
      const topDelayed = flights
        .filter((f) => f.delayMinutes > 0)
        .sort((a, b) => b.delayMinutes - a.delayMinutes)
        .slice(0, 8)
        .map((f) => ({
          flightId: f.flight_id,
          tailId: f.operated_by_tail,
          origin: f.origin,
          dest: f.destination,
          delayMinutes: f.delayMinutes,
          causeType: f.causeType,
          causeExplanation: f.causeExplanation,
        }));

      const topCandidatesPayload = candidates.slice(0, 4).map((c) => ({
        id: c.action.id,
        type: c.action.type,
        description: c.action.description,
        rationale: c.action.rationale,
        delayMinutesSaved: c.delayMinutesSaved,
        strandedPaxSaved: c.strandedPaxSaved,
        crewBreachesResolved: c.crewBreachesResolved,
        brokenConnectionsSaved: c.brokenConnectionsSaved,
        score: c.score,
      }));

      const payload = {
        scenario,
        metrics,
        topDelayedFlights: topDelayed,
        topRecoveryCandidates: topCandidatesPayload,
        question: customQuestion || undefined,
      };

      const res = await fetch('/api/dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data: DispatcherResponse = await res.json();
        setDispatcherData(data);
      } else {
        generateLocalDeterministicFallback(customQuestion);
      }
    } catch {
      generateLocalDeterministicFallback(customQuestion);
    } finally {
      setIsLoadingDispatcher(false);
    }
  }, [flights, candidates, scenario, metrics]);

  // Initial fetch on disruption change
  useEffect(() => {
    fetchDispatcherBriefing();
  }, [fetchDispatcherBriefing, appliedActions.length]);

  return (
    <div className="w-full bg-[#151b2b] rounded-lg border border-[#242a3a] overflow-hidden flex flex-col gap-5 p-4 shadow-xl">
      {/* Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242a3a] pb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#4cd7f6]" />
          <div>
            <h2 className="text-sm font-bold text-[#dde2f8]">
              AUTOMATED RECOVERY SOLVER & AI DISPATCHER STUDIO
            </h2>
            <p className="text-xs text-[#869397]">
              Multi-criteria candidate evaluation with zero-hallucination deterministic grounding.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {dispatcherData && (
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                dispatcherData.mode === 'live_gemini'
                  ? 'bg-[#06b6d4]/20 text-[#4cd7f6] border border-[#06b6d4]/40'
                  : 'bg-[#1e293b] text-[#ffb95f] border border-[#ffb95f]/30'
              }`}
            >
              {dispatcherData.mode === 'live_gemini'
                ? 'LIVE GEMINI 2.5 FLASH'
                : 'DETERMINISTIC DISPATCHER'}
            </span>
          )}

          <button
            onClick={() => fetchDispatcherBriefing(activeQuestion || undefined)}
            disabled={isLoadingDispatcher}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1e293b] hover:bg-[#334155] text-xs font-mono text-[#dde2f8] transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoadingDispatcher ? 'animate-spin' : ''}`}
            />
            <span>Refresh AI Briefing</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols): Top Ranked Candidate Recovery Actions */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-[#869397] uppercase">
            <span>Ranked Recovery Candidates (Top {candidates.length})</span>
            <span>Weighted Operational Score</span>
          </div>

          {candidates.length === 0 ? (
            <div className="p-8 rounded bg-[#0d1322] border border-[#242a3a] text-center text-xs font-mono text-[#10b981]">
              Zero recovery actions needed. All rotations, crews, and connections are nominal.
            </div>
          ) : (
            <div className="space-y-3">
              {candidates.map((cand, index) => {
                const isApplied = appliedIds.has(cand.action.id);

                return (
                  <div
                    key={cand.action.id}
                    className={`p-4 rounded border transition-all flex flex-col gap-2.5 ${
                      isApplied
                        ? 'bg-[#06b6d4]/10 border-[#06b6d4] ring-1 ring-[#06b6d4]/30'
                        : 'bg-[#0d1322] border-[#242a3a] hover:border-[#334155]'
                    }`}
                  >
                    {/* Header of Action */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#1e293b] border border-[#334155] flex items-center justify-center font-mono text-xs font-bold text-[#4cd7f6]">
                          {index + 1}
                        </span>
                        <div>
                          <span className="font-mono text-xs font-bold text-[#dde2f8] block">
                            {cand.action.description}
                          </span>
                          <span className="text-[10px] font-mono text-[#869397]">
                            Action Type:{' '}
                            <span className="text-[#4cd7f6]">{cand.action.type}</span>
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onToggleAction(cand.action)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs font-bold transition-all shrink-0 ${
                          isApplied
                            ? 'bg-[#ef4444] text-white hover:bg-[#dc2626]'
                            : 'bg-[#06b6d4] text-[#003640] hover:brightness-110 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                        }`}
                      >
                        {isApplied ? (
                          <>
                            <Minus className="w-3.5 h-3.5" />
                            <span>REMOVE</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>APPLY RECOVERY</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Rationale */}
                    <div className="text-xs font-mono text-[#bcc9cd] bg-[#151b2b] p-2 rounded border border-[#242a3a]">
                      {cand.action.rationale}
                    </div>

                    {/* Projected Deltas / Impact Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#242a3a] text-xs font-mono">
                      {cand.crewBreachesResolved > 0 && (
                        <span className="px-2 py-0.5 rounded bg-[#10b981]/20 text-[#10b981] font-bold">
                          ✓ Resolves {cand.crewBreachesResolved} Crew Breach
                        </span>
                      )}
                      {cand.delayMinutesSaved > 0 && (
                        <span className="px-2 py-0.5 rounded bg-[#06b6d4]/20 text-[#4cd7f6] font-bold">
                          ✓ -{cand.delayMinutesSaved}m Network Delay
                        </span>
                      )}
                      {cand.strandedPaxSaved > 0 && (
                        <span className="px-2 py-0.5 rounded bg-[#10b981]/20 text-[#10b981] font-bold">
                          ✓ Saves {cand.strandedPaxSaved} Stranded Pax
                        </span>
                      )}
                      {cand.brokenConnectionsSaved > 0 && (
                        <span className="px-2 py-0.5 rounded bg-[#ffb95f]/20 text-[#ffb95f] font-bold">
                          ✓ Protects {cand.brokenConnectionsSaved} Connection(s)
                        </span>
                      )}
                      <span className="ml-auto text-[11px] text-[#869397]">
                        Score: {cand.score.toLocaleString()} pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (5 cols): AI Airline Operations Dispatcher */}
        <div className="lg:col-span-5 bg-[#0d1322] rounded border border-[#242a3a] p-4 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            {/* AI Header */}
            <div className="flex items-center gap-2 border-b border-[#242a3a] pb-2.5">
              <Bot className="w-4 h-4 text-[#4cd7f6]" />
              <span className="font-mono text-xs font-bold text-[#dde2f8]">
                AI DISPATCHER INTELLIGENCE
              </span>
              <span className="ml-auto text-[10px] font-mono text-[#869397]">
                Temp: 0.1 • Factual
              </span>
            </div>

            {/* AI Executive Briefing */}
            {isLoadingDispatcher ? (
              <div className="p-8 text-center text-xs font-mono text-[#869397] flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 text-[#4cd7f6] animate-spin" />
                <span>Synthesizing operational telemetry with Gemini...</span>
              </div>
            ) : dispatcherData ? (
              <div className="space-y-3 text-xs font-mono">
                {/* Briefing */}
                <div className="text-[#dde2f8] leading-relaxed bg-[#151b2b] p-3 rounded border border-[#242a3a] whitespace-pre-wrap">
                  {dispatcherData.briefing}
                </div>

                {/* Key Risks */}
                {dispatcherData.keyRisks && dispatcherData.keyRisks.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#ff817a] uppercase font-bold tracking-wider">
                      OPERATIONAL RISKS IDENTIFIED:
                    </span>
                    {dispatcherData.keyRisks.map((risk, i) => (
                      <div
                        key={i}
                        className="p-2 rounded bg-[#93000a]/20 border border-[#ffb4ab]/30 text-[#ffdad6] text-[11px]"
                      >
                        {risk}
                      </div>
                    ))}
                  </div>
                )}

                {/* Top Recommendations */}
                {dispatcherData.recommendations && dispatcherData.recommendations.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#4cd7f6] uppercase font-bold tracking-wider">
                      DISPATCHER RECOMMENDATIONS:
                    </span>
                    {dispatcherData.recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className="p-2 rounded bg-[#151b2b] border border-[#242a3a] text-[#bcc9cd] text-[11px]"
                      >
                        {rec}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Interactive "Ask AI Dispatcher" */}
          <div className="space-y-2 border-t border-[#242a3a] pt-3">
            <span className="text-[10px] font-mono text-[#869397] uppercase tracking-wider block">
              ASK AI DISPATCHER (GROUNDED IN CURRENT STATE):
            </span>

            {/* 1-Click Quick Prompts */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => {
                  const q = 'Why did DS0502 delay cascade across BLR?';
                  setUserQuestion(q);
                  setActiveQuestion(q);
                  fetchDispatcherBriefing(q);
                }}
                className="px-2 py-0.5 rounded bg-[#151b2b] hover:bg-[#1e293b] text-[10px] font-mono text-[#869397] hover:text-[#dde2f8] transition-colors"
              >
                "Why did DS0502 cascade?"
              </button>
              <button
                onClick={() => {
                  const q = 'Which spare aircraft swap gives maximum operational ROI?';
                  setUserQuestion(q);
                  setActiveQuestion(q);
                  fetchDispatcherBriefing(q);
                }}
                className="px-2 py-0.5 rounded bg-[#151b2b] hover:bg-[#1e293b] text-[10px] font-mono text-[#869397] hover:text-[#dde2f8] transition-colors"
              >
                "Best spare swap ROI?"
              </button>
              <button
                onClick={() => {
                  const q = 'How can we avoid the DGCA crew duty breach?';
                  setUserQuestion(q);
                  setActiveQuestion(q);
                  fetchDispatcherBriefing(q);
                }}
                className="px-2 py-0.5 rounded bg-[#151b2b] hover:bg-[#1e293b] text-[10px] font-mono text-[#869397] hover:text-[#dde2f8] transition-colors"
              >
                "Avoid crew breaches?"
              </button>
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (userQuestion.trim()) {
                  setActiveQuestion(userQuestion);
                  fetchDispatcherBriefing(userQuestion);
                }
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask specific operational question..."
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                className="flex-1 bg-[#151b2b] text-[#dde2f8] font-mono text-xs px-3 py-1.5 rounded border border-[#334155] focus:outline-none focus:border-[#4cd7f6]"
              />
              <button
                type="submit"
                disabled={isLoadingDispatcher || !userQuestion.trim()}
                className="px-3 py-1.5 rounded bg-[#06b6d4] text-[#003640] hover:brightness-110 disabled:opacity-40 font-mono text-xs font-bold flex items-center gap-1 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ASK</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
