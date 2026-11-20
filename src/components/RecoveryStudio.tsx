import React from 'react';
import {
  EvaluatedRecoveryCandidate,
  RecoveryAction,
  SimulationMetrics,
  DisruptionScenario,
  SimulatedFlight,
} from '../types/network';
import { Zap } from 'lucide-react';
import { useAiDispatcher } from '../hooks/useAiDispatcher';
import { CandidateCard } from './recovery/CandidateCard';
import { DispatcherChat } from './recovery/DispatcherChat';

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
  const {
    dispatcherData,
    isLoadingDispatcher,
    userQuestion,
    setUserQuestion,
    fetchDispatcherBriefing,
    handleQuestionSubmit,
  } = useAiDispatcher({
    metrics,
    scenario,
    candidates,
    flights,
    appliedActionCount: appliedActions.length,
  });

  const appliedIds = new Set(appliedActions.map((a) => a.id));

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
              {candidates.map((cand, index) => (
                <CandidateCard
                  key={cand.action.id}
                  candidate={cand}
                  index={index}
                  isApplied={appliedIds.has(cand.action.id)}
                  onToggleAction={onToggleAction}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column (5 cols): AI Airline Operations Dispatcher */}
        <div className="lg:col-span-5">
          <DispatcherChat
            dispatcherData={dispatcherData}
            isLoading={isLoadingDispatcher}
            userQuestion={userQuestion}
            setUserQuestion={setUserQuestion}
            onAsk={fetchDispatcherBriefing}
            onSubmit={handleQuestionSubmit}
          />
        </div>
      </div>
    </div>
  );
};
