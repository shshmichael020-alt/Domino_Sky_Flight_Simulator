import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDisruptionSimulation } from '../useDisruptionSimulation';
import { RecoveryAction } from '../../types/network';

describe('useDisruptionSimulation hook', () => {
  it('initializes with default Mumbai Storm preset and runs baseline simulation', () => {
    const { result } = renderHook(() => useDisruptionSimulation());

    expect(result.current.scenario.closedAirportId).toBe('BOM');
    expect(result.current.scenario.closureStartMin).toBe(480);
    expect(result.current.scenario.closureEndMin).toBe(570);
    expect(result.current.appliedRecoveryActions).toHaveLength(0);
    expect(result.current.baselineResult.metrics.delayedFlights).toBeGreaterThan(0);
    expect(result.current.rankedCandidates.length).toBeGreaterThan(0);
  });

  it('switches disruption scenarios via handleApplyPreset', () => {
    const { result } = renderHook(() => useDisruptionSimulation());

    act(() => {
      result.current.handleApplyPreset('DELHI_FOG');
    });

    expect(result.current.scenario.closedAirportId).toBe('DEL');
    expect(result.current.scenario.closureStartMin).toBe(360);
    expect(result.current.scenario.closureEndMin).toBe(510);

    act(() => {
      result.current.handleApplyPreset('RESET');
    });

    expect(result.current.scenario.closedAirportId).toBeNull();
    expect(result.current.baselineResult.metrics.delayedFlights).toBe(0);
  });

  it('toggles recovery actions in appliedRecoveryActions list', () => {
    const { result } = renderHook(() => useDisruptionSimulation());

    const mockAction: RecoveryAction = {
      id: 'SWAP_VT-DS17_DS0101',
      type: 'SWAP_SPARE',
      flightId: 'DS0101',
      tailId: 'VT-DS01',
      spareTailId: 'VT-DS17',
      description: 'Test spare swap',
      rationale: 'Test swap rationale',
    };

    act(() => {
      result.current.handleToggleRecoveryAction(mockAction);
    });

    expect(result.current.appliedRecoveryActions).toHaveLength(1);
    expect(result.current.appliedRecoveryActions[0].id).toBe('SWAP_VT-DS17_DS0101');

    // Toggle off
    act(() => {
      result.current.handleToggleRecoveryAction(mockAction);
    });

    expect(result.current.appliedRecoveryActions).toHaveLength(0);
  });

  it('updates custom airport closure via handleCustomClosureChange', () => {
    const { result } = renderHook(() => useDisruptionSimulation());

    act(() => {
      result.current.handleCustomClosureChange('BLR', '10:00', '12:00');
    });

    expect(result.current.scenario.closedAirportId).toBe('BLR');
    expect(result.current.scenario.closureStartMin).toBe(600);
    expect(result.current.scenario.closureEndMin).toBe(720);
    expect(result.current.appliedRecoveryActions).toHaveLength(0);
  });
});
