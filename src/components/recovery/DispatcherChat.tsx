import React from 'react';
import { DispatcherResponse } from '../../types/network';
import { Bot, RefreshCw, Send } from 'lucide-react';

interface DispatcherChatProps {
  dispatcherData: DispatcherResponse | null;
  isLoading: boolean;
  userQuestion: string;
  setUserQuestion: (q: string) => void;
  onAsk: (question?: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const DispatcherChat: React.FC<DispatcherChatProps> = ({
  dispatcherData,
  isLoading,
  userQuestion,
  setUserQuestion,
  onAsk,
  onSubmit,
}) => {
  return (
    <div className="bg-[#0d1322] rounded border border-[#242a3a] p-4 flex flex-col justify-between gap-4">
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
        {isLoading ? (
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

      {/* Interactive Ask AI Dispatcher */}
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
              onAsk(q);
            }}
            className="px-2 py-0.5 rounded bg-[#151b2b] hover:bg-[#1e293b] text-[10px] font-mono text-[#869397] hover:text-[#dde2f8] transition-colors"
          >
            &quot;Why did DS0502 cascade?&quot;
          </button>
          <button
            onClick={() => {
              const q = 'Which spare aircraft swap gives maximum operational ROI?';
              setUserQuestion(q);
              onAsk(q);
            }}
            className="px-2 py-0.5 rounded bg-[#151b2b] hover:bg-[#1e293b] text-[10px] font-mono text-[#869397] hover:text-[#dde2f8] transition-colors"
          >
            &quot;Best spare swap ROI?&quot;
          </button>
          <button
            onClick={() => {
              const q = 'How can we avoid the DGCA crew duty breach?';
              setUserQuestion(q);
              onAsk(q);
            }}
            className="px-2 py-0.5 rounded bg-[#151b2b] hover:bg-[#1e293b] text-[10px] font-mono text-[#869397] hover:text-[#dde2f8] transition-colors"
          >
            &quot;Avoid crew breaches?&quot;
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask specific operational question..."
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            className="flex-1 bg-[#151b2b] text-[#dde2f8] font-mono text-xs px-3 py-1.5 rounded border border-[#334155] focus:outline-none focus:border-[#4cd7f6]"
          />
          <button
            type="submit"
            disabled={isLoading || !userQuestion.trim()}
            className="px-3 py-1.5 rounded bg-[#06b6d4] text-[#003640] hover:brightness-110 disabled:opacity-40 font-mono text-xs font-bold flex items-center gap-1 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>ASK</span>
          </button>
        </form>
      </div>
    </div>
  );
};
