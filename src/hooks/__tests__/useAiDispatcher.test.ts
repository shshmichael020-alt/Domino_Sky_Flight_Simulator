import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAiDispatcher } from '../useAiDispatcher';
import { SimulationMetrics, DisruptionScenario } from '../../types/network';

describe('useAiDispatcher hook', () => {
  const mockMetrics: SimulationMetrics = {
    totalFlights: 70,
    onTimeFlights: 65,
    delayedFlights: 5,
    cancelledFlights: 0,
    totalDelayMinutes: 210,
    maxDelayMinutes: 60,
    brokenConnectionsCount: 2,
    brokenConnectionPax: 34,
    cancelledFlightPax: 0,
    uniqueStrandedPax: 34,
    crewBreachesCount: 1,
    bufferAbsorbedTotalMin: 45,
  };

  const mockScenario: DisruptionScenario = {
    closedAirportId: 'BOM',
    closureStartMin: 480,
    closureEndMin: 570,
    closureStartStr: '08:00',
    closureEndStr: '09:30',
    label: 'Mumbai Storm',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generates grounded deterministic fallback when API is unavailable or returns 500', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

    const { result } = renderHook(() =>
      useAiDispatcher({
        metrics: mockMetrics,
        scenario: mockScenario,
        candidates: [],
        flights: [],
        appliedActionCount: 0,
      })
    );

    await waitFor(() => {
      expect(result.current.dispatcherData).not.toBeNull();
    });

    expect(result.current.dispatcherData?.mode).toBe('deterministic_fallback');
    expect(result.current.dispatcherData?.briefing).toContain('5 flights delayed');
    expect(result.current.dispatcherData?.briefing).toContain('210m delay');
  });

  it('sets live_gemini mode when endpoint returns successful response', async () => {
    const mockApiResponse = {
      briefing: '[VERIFIED DISPATCH TELEMETRY] All flights stable.',
      recommendations: ['Option 1: Monitor BLR'],
      keyRisks: ['Secondary spoke delays'],
      confidence: 0.98,
      mode: 'live_gemini',
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      } as Response)
    );

    const { result } = renderHook(() =>
      useAiDispatcher({
        metrics: mockMetrics,
        scenario: mockScenario,
        candidates: [],
        flights: [],
        appliedActionCount: 0,
      })
    );

    await waitFor(() => {
      expect(result.current.dispatcherData?.mode).toBe('live_gemini');
    });

    expect(result.current.dispatcherData?.recommendations).toHaveLength(1);
    expect(result.current.dispatcherData?.recommendations[0]).toContain('Monitor BLR');
  });
});
