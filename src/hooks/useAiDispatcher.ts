/**
 * Domino Sky: useAiDispatcher Hook
 * Manages operational briefing queries, serverless API communication,
 * and deterministic offline fallback.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  EvaluatedRecoveryCandidate,
  SimulationMetrics,
  DisruptionScenario,
  DispatcherResponse,
  SimulatedFlight,
} from '../types/network';

export interface UseAiDispatcherParams {
  metrics: SimulationMetrics;
  scenario: DisruptionScenario;
  candidates: EvaluatedRecoveryCandidate[];
  flights: SimulatedFlight[];
  appliedActionCount: number;
}

export interface UseAiDispatcherReturn {
  dispatcherData: DispatcherResponse | null;
  isLoadingDispatcher: boolean;
  userQuestion: string;
  setUserQuestion: (q: string) => void;
  activeQuestion: string | null;
  fetchDispatcherBriefing: (customQuestion?: string) => Promise<void>;
  handleQuestionSubmit: (e: React.FormEvent) => void;
}

/**
 * Custom React hook for orchestrating AI Dispatcher interactions and fallback briefings.
 */
export function useAiDispatcher({
  metrics,
  scenario,
  candidates,
  flights,
  appliedActionCount,
}: UseAiDispatcherParams): UseAiDispatcherReturn {
  const [dispatcherData, setDispatcherData] = useState<DispatcherResponse | null>(null);
  const [isLoadingDispatcher, setIsLoadingDispatcher] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);

  // Local deterministic fallback ensuring zero crashes in offline or key-missing environments
  const generateLocalDeterministicFallback = useCallback((question?: string) => {
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

  const fetchDispatcherBriefing = useCallback(async (customQuestion?: string) => {
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
  }, [flights, candidates, scenario, metrics, generateLocalDeterministicFallback]);

  // Handle Question Submission
  const handleQuestionSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim()) return;
    const q = userQuestion.trim();
    setActiveQuestion(q);
    fetchDispatcherBriefing(q);
    setUserQuestion('');
  }, [userQuestion, fetchDispatcherBriefing]);

  useEffect(() => {
    fetchDispatcherBriefing();
  }, [fetchDispatcherBriefing, appliedActionCount]);

  return {
    dispatcherData,
    isLoadingDispatcher,
    userQuestion,
    setUserQuestion,
    activeQuestion,
    fetchDispatcherBriefing,
    handleQuestionSubmit,
  };
}
