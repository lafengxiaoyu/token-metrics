import { describe, it, expect } from 'vitest';
import { aggregateProjectsIntoDays } from '../../day-aggregator.js';
import type { ProjectSummary, SessionSummary } from '../../types.js';
import type { TaskCategory } from '../../types.js';

const emptyCategoryBreakdown = {} as Record<TaskCategory, { turns: number; costUSD: number; retries: number; editTurns:number; oneShotTurns: number; }>;

const mockSession: SessionSummary = {
  sessionId: 'session-1',
  project: 'test-project',
  firstTimestamp: '2026-05-09T10:00:00Z',
  lastTimestamp: '2026-05-09T11:00:00Z',
  totalCostUSD: 0.05,
  totalInputTokens: 1000,
  totalOutputTokens: 500,
  totalCacheReadTokens: 100,
  totalCacheWriteTokens: 50,
apiCalls: 10,
  turns: [],
  modelBreakdown: {},
  toolBreakdown: {},
  bashBreakdown: {},
  categoryBreakdown: emptyCategoryBreakdown,
  mcpBreakdown: {},
  skillBreakdown: {},
};

const mockProject: ProjectSummary= {
  project: 'test-project',
  projectPath: '/Users/test/test-project',
  sessions: [mockSession],
  totalCostUSD: 0.05,
  totalApiCalls: 10,
};

describe('adapter', () => {
  it('handles empty projects array', () => {
    const result = aggregateProjectsIntoDays([]);
    expect(result).toHaveLength(0);
  });

  it('aggregates single project into days', () => {
    const result = aggregateProjectsIntoDays([mockProject]);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-05-09');
  });
});
