import React from 'react';
import {
  Map,
  Calendar,
  GitBranch,
  BadgeAlert,
  Sparkles,
} from 'lucide-react';

export type NavigationTab = 'map' | 'gantt' | 'causal' | 'crew' | 'recovery';

interface TabBarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  delayedFlightsCount: number;
  crewBreachesCount: number;
  appliedActionsCount: number;
}

export const TabBar: React.FC<TabBarProps> = ({
  activeTab,
  setActiveTab,
  delayedFlightsCount,
  crewBreachesCount,
  appliedActionsCount,
}) => {
  return (
    <nav
      role="tablist"
      aria-label="Operations Control Views"
      className="w-full bg-[#080e1d] rounded-lg border border-[#242a3a] px-3 py-1 flex items-center justify-between overflow-x-auto shadow-md"
    >
      <div className="flex items-center gap-1 shrink-0">
        <button
          role="tab"
          id="tab-map"
          aria-controls="panel-map"
          aria-selected={activeTab === 'map'}
          onClick={() => setActiveTab('map')}
          className={`px-3 py-2 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4cd7f6] ${
            activeTab === 'map'
              ? 'bg-[#1e293b] text-[#4cd7f6] border border-[#4cd7f6]/40 shadow-sm'
              : 'text-[#869397] hover:text-[#dde2f8]'
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          <span>TAB 1: INDIA ROUTE MAP</span>
        </button>

        <button
          role="tab"
          id="tab-gantt"
          aria-controls="panel-gantt"
          aria-selected={activeTab === 'gantt'}
          onClick={() => setActiveTab('gantt')}
          className={`px-3 py-2 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4cd7f6] ${
            activeTab === 'gantt'
              ? 'bg-[#1e293b] text-[#4cd7f6] border border-[#4cd7f6]/40 shadow-sm'
              : 'text-[#869397] hover:text-[#dde2f8]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>TAB 2: TACTICAL GANTT (70)</span>
        </button>

        <button
          role="tab"
          id="tab-causal"
          aria-controls="panel-causal"
          aria-selected={activeTab === 'causal'}
          onClick={() => setActiveTab('causal')}
          className={`px-3 py-2 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4cd7f6] ${
            activeTab === 'causal'
              ? 'bg-[#1e293b] text-[#4cd7f6] border border-[#4cd7f6]/40 shadow-sm'
              : 'text-[#869397] hover:text-[#dde2f8]'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>TAB 3: CAUSAL IMPACT MATRIX</span>
          {delayedFlightsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#f97316]/20 text-[#f97316]">
              {delayedFlightsCount}
            </span>
          )}
        </button>

        <button
          role="tab"
          id="tab-crew"
          aria-controls="panel-crew"
          aria-selected={activeTab === 'crew'}
          onClick={() => setActiveTab('crew')}
          className={`px-3 py-2 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4cd7f6] ${
            activeTab === 'crew'
              ? 'bg-[#1e293b] text-[#4cd7f6] border border-[#4cd7f6]/40 shadow-sm'
              : 'text-[#869397] hover:text-[#dde2f8]'
          }`}
        >
          <BadgeAlert className="w-3.5 h-3.5" />
          <span>TAB 4: CREW ROSTER & FDP</span>
          {crewBreachesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#93000a] text-[#ffdad6] font-bold animate-pulse">
              {crewBreachesCount} BREACH
            </span>
          )}
        </button>

        <button
          role="tab"
          id="tab-recovery"
          aria-controls="panel-recovery"
          aria-selected={activeTab === 'recovery'}
          onClick={() => setActiveTab('recovery')}
          className={`px-3 py-2 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4cd7f6] ${
            activeTab === 'recovery'
              ? 'bg-[#06b6d4] text-[#003640] shadow-[0_0_8px_rgba(6,182,212,0.4)]'
              : 'text-[#4cd7f6] hover:bg-[#151b2b]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>TAB 5: RECOVERY SOLVER & AI</span>
          {appliedActionsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#003640] text-[#4cd7f6] font-bold">
              {appliedActionsCount} APPLIED
            </span>
          )}
        </button>
      </div>

      <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono text-[#869397] shrink-0 pr-2">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping"></span>
          <span>DGCA CAR SEC 7 COMPLIANT ENGINE</span>
        </span>
        <span>•</span>
        <span className="text-[#4cd7f6]">ZERO HALLUCINATION EVALUATOR</span>
      </div>
    </nav>
  );
};
