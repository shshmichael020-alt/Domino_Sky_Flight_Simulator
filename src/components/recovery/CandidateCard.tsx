import React from 'react';
import { EvaluatedRecoveryCandidate, RecoveryAction } from '../../types/network';
import { Plus, Minus } from 'lucide-react';

interface CandidateCardProps {
  candidate: EvaluatedRecoveryCandidate;
  index: number;
  isApplied: boolean;
  onToggleAction: (action: RecoveryAction) => void;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  index,
  isApplied,
  onToggleAction,
}) => {
  const { action } = candidate;

  return (
    <div
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
              {action.description}
            </span>
            <span className="text-[10px] font-mono text-[#869397]">
              Action Type: <span className="text-[#4cd7f6]">{action.type}</span>
            </span>
          </div>
        </div>

        <button
          onClick={() => onToggleAction(action)}
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
        {action.rationale}
      </div>

      {/* Projected Deltas / Impact Badges */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#242a3a] text-xs font-mono">
        {candidate.crewBreachesResolved > 0 && (
          <span className="px-2 py-0.5 rounded bg-[#10b981]/20 text-[#10b981] font-bold">
            ✓ Resolves {candidate.crewBreachesResolved} Crew Breach
          </span>
        )}
        {candidate.delayMinutesSaved > 0 && (
          <span className="px-2 py-0.5 rounded bg-[#06b6d4]/20 text-[#4cd7f6] font-bold">
            ✓ -{candidate.delayMinutesSaved}m Network Delay
          </span>
        )}
        {candidate.strandedPaxSaved > 0 && (
          <span className="px-2 py-0.5 rounded bg-[#10b981]/20 text-[#10b981] font-bold">
            ✓ Saves {candidate.strandedPaxSaved} Stranded Pax
          </span>
        )}
        {candidate.brokenConnectionsSaved > 0 && (
          <span className="px-2 py-0.5 rounded bg-[#ffb95f]/20 text-[#ffb95f] font-bold">
            ✓ Protects {candidate.brokenConnectionsSaved} Connection(s)
          </span>
        )}
        <span className="ml-auto text-[11px] text-[#869397]">
          Score: {candidate.score.toLocaleString()} pts
        </span>
      </div>
    </div>
  );
};
