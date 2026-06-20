import { describe, expect, it } from 'vitest'

import { DEFAULT_COPILOT_CREDIT_PLAN, getPlanUsageFromProjects, normalizeCreditLimit } from '../plan-usage.js'
import type { ProjectSummary } from '../types.js'

function projectWithCost(costUSD: number, timestamp = '2026-06-20T10:00:00.000Z'): ProjectSummary {
  return {
    project: 'token-metrics',
    projectPath: '/work/token-metrics',
    totalCostUSD: costUSD,
    totalApiCalls: 1,
    sessions: [{
      sessionId: 'session-1',
      project: 'token-metrics',
      firstTimestamp: timestamp,
      lastTimestamp: timestamp,
      totalCostUSD: costUSD,
      totalInputTokens: 100,
      totalOutputTokens: 50,
      totalCacheReadTokens: 0,
      totalCacheWriteTokens: 0,
      apiCalls: 1,
      turns: [{
        userMessage: 'Make the requested change',
        timestamp,
        sessionId: 'session-1',
        category: 'coding',
        retries: 0,
        hasEdits: true,
        assistantCalls: [{
          provider: 'copilot',
          model: 'claude-sonnet-4-6',
          usage: {
            inputTokens: 100,
            outputTokens: 50,
            cacheCreationInputTokens: 0,
            cacheReadInputTokens: 0,
            cachedInputTokens: 0,
            reasoningTokens: 0,
            webSearchRequests: 0,
          },
          costUSD,
          tools: ['Edit'],
          mcpTools: [],
          skills: [],
          hasAgentSpawn: false,
          hasPlanMode: false,
          speed: 'standard',
          timestamp,
          bashCommands: [],
          deduplicationKey: 'call-1',
          linesAdded: 1,
          linesDeleted: 0,
        }],
      }],
      modelBreakdown: {},
      toolBreakdown: {},
      mcpBreakdown: {},
      bashBreakdown: {},
      categoryBreakdown: {} as never,
      skillBreakdown: {},
    }],
  }
}

describe('Copilot AI credit usage', () => {
  it('validates user-configured credit allowances', () => {
    expect(normalizeCreditLimit(4500)).toBe(4500)
    expect(normalizeCreditLimit('1900')).toBe(1900)
    expect(() => normalizeCreditLimit(0)).toThrow('between 1 and 10,000,000')
    expect(() => normalizeCreditLimit(12.5)).toThrow('whole number')
  })

  it('converts API-equivalent cost to AI credits against the 3,000 credit allowance', () => {
    const usage = getPlanUsageFromProjects(
      DEFAULT_COPILOT_CREDIT_PLAN,
      [projectWithCost(12.5)],
      new Date(2026, 5, 20, 12),
    )

    expect(usage.creditLimit).toBe(3000)
    expect(usage.spentCredits).toBe(1250)
    expect(usage.remainingCredits).toBe(1750)
    expect(usage.percentUsed).toBeCloseTo(41.67, 1)
    expect(usage.isEstimate).toBe(true)
  })

  it('reports overage in credits and dollars', () => {
    const usage = getPlanUsageFromProjects(
      DEFAULT_COPILOT_CREDIT_PLAN,
      [projectWithCost(35)],
      new Date(2026, 5, 20, 12),
    )

    expect(usage.status).toBe('over')
    expect(usage.spentCredits).toBe(3500)
    expect(usage.remainingCredits).toBe(0)
    expect(usage.projectedOverageUsd).toBeGreaterThanOrEqual(5)
  })
})
