import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { App } from '../../App';

describe('Domino Sky OCC Dashboard (App.tsx Integration)', () => {
  beforeEach(() => {
    // Mock global fetch for API calls in tests
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          briefing: 'Mocked OCC Dispatcher briefing',
          recommendations: ['Option 1'],
          keyRisks: [],
          confidence: 0.98,
          mode: 'deterministic_fallback',
        }),
      })
    );
  });

  it('19. Renders header, brand title, and default BOM 90m storm disruption', () => {
    render(<App />);
    expect(screen.getByText(/DOMINO/i)).toBeInTheDocument();
    expect(screen.getByText(/SKY/i)).toBeInTheDocument();
    expect(screen.getByText(/16 AIRPORTS • 70 FLIGHTS/i)).toBeInTheDocument();
    // Default BOM scenario should show delayed flights in KPI
    expect(screen.getByText(/FLIGHT OPERATIONS/i)).toBeInTheDocument();
    expect(screen.getByText(/NETWORK DELAY/i)).toBeInTheDocument();
  });

  it('20. Switches between all 5 OCC navigation tabs cleanly', () => {
    render(<App />);

    // Click Tab 2: Gantt
    const ganttTab = screen.getByRole('tab', { name: /TAB 2: TACTICAL GANTT/i });
    fireEvent.click(ganttTab);
    expect(screen.getByText(/TACTICAL ROTATION TIMELINE/i)).toBeInTheDocument();

    // Click Tab 3: Causal Matrix
    const causalTab = screen.getByRole('tab', { name: /TAB 3: CAUSAL IMPACT/i });
    fireEvent.click(causalTab);
    expect(screen.getByText(/CAUSAL IMPACT MATRIX & PROPAGATION/i)).toBeInTheDocument();

    // Click Tab 4: Crew Roster
    const crewTab = screen.getByRole('tab', { name: /TAB 4: CREW ROSTER/i });
    fireEvent.click(crewTab);
    expect(screen.getByText(/CREW ROSTER & FLIGHT DUTY PERIOD/i)).toBeInTheDocument();

    // Click Tab 5: Recovery Solver & AI
    const recoveryTab = screen.getByRole('tab', { name: /TAB 5: RECOVERY SOLVER/i });
    fireEvent.click(recoveryTab);
    expect(screen.getByText(/AUTOMATED RECOVERY SOLVER & AI DISPATCHER/i)).toBeInTheDocument();

    // Switch back to Tab 1: India Route Map
    const mapTab = screen.getByRole('tab', { name: /TAB 1: INDIA ROUTE MAP/i });
    fireEvent.click(mapTab);
    expect(screen.getByLabelText(/Interactive India Flight Network Map/i)).toBeInTheDocument();
  });

  it('21. Toggles Before vs After Recovery Diff mode to display side-by-side delta matrix', () => {
    render(<App />);

    const afterRecoveryBtn = screen.getByRole('button', { name: /AFTER RECOVERY/i });
    fireEvent.click(afterRecoveryBtn);

    // Should render the Before vs After delta matrix
    expect(screen.getByText(/BEFORE VS AFTER RECOVERY DELTA MATRIX/i)).toBeInTheDocument();
    expect(screen.getByText(/DISRUPTED BASELINE/i)).toBeInTheDocument();
    expect(screen.getByText(/OPTIMIZED RECOVERY/i)).toBeInTheDocument();
  });

  it('22. Preset buttons switch disruption targets and RESET restores 100% on-time baseline', () => {
    render(<App />);

    // Apply Delhi Fog preset
    const delhiBtn = screen.getByRole('button', { name: /DELHI FOG/i });
    fireEvent.click(delhiBtn);

    // Apply Reset preset
    const resetBtn = screen.getByRole('button', { name: /RESET/i });
    fireEvent.click(resetBtn);

    // With reset, delayed flights must be 0
    expect(screen.getByText(/70 On-Time/i)).toBeInTheDocument();
    expect(screen.getByText(/0 Delayed/i)).toBeInTheDocument();
  });
});
