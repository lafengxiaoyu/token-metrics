import { describe, expect, it } from 'vitest'
import { analyzeEfficiencyCoach } from '../../server/efficiencyCoachService.js'
import type { ClassifiedTurn, ParsedApiCall, ProjectSummary, SessionSummary, TaskCategory } from '../../types.js'

function call(overrides: Partial<ParsedApiCall> = {}): ParsedApiCall {
  const inputTokens = overrides.usage?.inputTokens ?? 1000
  const outputTokens = overrides.usage?.outputTokens ?? 500
  return {
    provider: 'copilot',
    model: 'claude-sonnet-4-5',
    usage: {
      inputTokens,
      outputTokens,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      cachedInputTokens: 0,
      reasoningTokens: 0,
      webSearchRequests: 0,
    },
    costUSD: overrides.costUSD ?? 0.01,
    tools: overrides.tools ?? [],
    mcpTools: [],
    skills: [],
    hasAgentSpawn: false,
    hasPlanMode: false,
    speed: 'standard',
    timestamp: '2026-05-13T10:05:00Z',
    bashCommands: [],
    deduplicationKey: Math.random().toString(36),
    linesAdded: 0,
    linesDeleted: 0,
    ...overrides,
  }
}

function turn(
  userMessage: string,
  category: TaskCategory,
  assistantCalls: ParsedApiCall[],
  overrides: Partial<ClassifiedTurn> = {},
): ClassifiedTurn {
  return {
    userMessage,
    assistantCalls,
    timestamp: '2026-05-13T10:00:00Z',
    sessionId: 'session',
    category,
    retries: 0,
    hasEdits: assistantCalls.some(item => item.tools.includes('Edit') || item.tools.includes('Write')),
    ...overrides,
  }
}

function session(
  id: string,
  category: TaskCategory,
  turns: ClassifiedTurn[],
  overrides: Partial<SessionSummary> = {},
): SessionSummary {
  const totalInputTokens = turns.reduce((sum, item) => sum + item.assistantCalls.reduce((callSum, itemCall) => callSum + itemCall.usage.inputTokens, 0), 0)
  const totalOutputTokens = turns.reduce((sum, item) => sum + item.assistantCalls.reduce((callSum, itemCall) => callSum + itemCall.usage.outputTokens, 0), 0)
  const totalCostUSD = turns.reduce((sum, item) => sum + item.assistantCalls.reduce((callSum, itemCall) => callSum + itemCall.costUSD, 0), 0)
  const editTurns = turns.filter(item => item.hasEdits).length
  const retries = turns.reduce((sum, item) => sum + item.retries, 0)
  return {
    sessionId: id,
    project: 'alpha',
    firstTimestamp: '2026-05-13T10:00:00Z',
    lastTimestamp: '2026-05-13T10:30:00Z',
    totalCostUSD,
    totalInputTokens,
    totalOutputTokens,
    totalCacheReadTokens: 0,
    totalCacheWriteTokens: 0,
    apiCalls: turns.reduce((sum, item) => sum + item.assistantCalls.length, 0),
    turns,
    modelBreakdown: {},
    toolBreakdown: {},
    mcpBreakdown: {},
    bashBreakdown: {},
    categoryBreakdown: {
      [category]: {
        turns: turns.length,
        costUSD: totalCostUSD,
        retries,
        editTurns,
        oneShotTurns: turns.filter(item => item.hasEdits && item.retries === 0).length,
      },
    } as Record<TaskCategory, { turns: number; costUSD: number; retries: number; editTurns: number; oneShotTurns: number }>,
    skillBreakdown: {},
    ...overrides,
  }
}

function project(sessions: SessionSummary[]): ProjectSummary {
  return {
    project: 'alpha',
    projectPath: '/tmp/alpha',
    sessions,
    totalCostUSD: sessions.reduce((sum, item) => sum + item.totalCostUSD, 0),
    totalApiCalls: sessions.reduce((sum, item) => sum + item.apiCalls, 0),
  }
}

describe('efficiency coach service', () => {
  it('scores efficient implementation sessions higher than broad low-output exploration', () => {
    const efficient = session('efficient', 'feature', [
      turn('Implement src/server/routes.ts support for the health check and run the route test.', 'feature', [
        call({ tools: ['Read'], usage: { ...call().usage, inputTokens: 600, outputTokens: 200 } }),
        call({ tools: ['Edit'], usage: { ...call().usage, inputTokens: 800, outputTokens: 400 } }),
        call({ tools: ['Bash'], usage: { ...call().usage, inputTokens: 500, outputTokens: 200 } }),
      ]),
    ])

    const broad = session('broad', 'feature', [
      turn('fix it', 'feature', Array.from({ length: 36 }, () => call({ tools: ['Read'], costUSD: 0.02 }))),
    ], {
      lastTimestamp: '2026-05-13T12:20:00Z',
    })

    const result = analyzeEfficiencyCoach([project([efficient, broad])])
    const low = result.lowEfficiencySessions.find(item => item.sessionId === 'broad')

    expect(low).toBeDefined()
    expect(low?.reasons).toContain('No edit output for a delivery-oriented task')
    expect(result.lowEfficiencySessions.some(item => item.sessionId === 'efficient')).toBe(false)
    expect(result.findings.map(item => item.title)).toContain('Delivery tasks show weak output signals')
  })

  it('flags retry-heavy debugging and creates prompt rewrite examples', () => {
    const retryDebug = session('retry-debug', 'debugging', [
      turn('broken', 'debugging', [
        call({ tools: ['Read'] }),
        call({ tools: ['Edit'] }),
        call({ tools: ['Bash'] }),
        call({ tools: ['Edit'] }),
      ], { retries: 2 }),
    ])

    const result = analyzeEfficiencyCoach([project([retryDebug])])

    expect(result.findings.map(item => item.title)).toContain('Retry rate is elevated')
    expect(result.categories[0].retryRate).toBe(100)
    expect(result.promptCoach.vaguePromptRate).toBe(100)
    expect(result.promptCoach.examples[0].after).toContain('Goal:')
    expect(result.weeklyReview.improvements.some(item => item.includes('stop conditions'))).toBe(true)
  })

  it('keeps pure code understanding sessions out of low-efficiency review when exploration is focused', () => {
    const understanding = session('understanding', 'exploration', [
      turn('Explain how src/server/routes.ts connects the dashboard API to usage data.', 'exploration', [
        call({ tools: ['Read'] }),
        call({ tools: ['Grep'] }),
      ]),
    ])

    const result = analyzeEfficiencyCoach([project([understanding])])

    expect(result.lowEfficiencySessions).toHaveLength(0)
    expect(result.score).toBeGreaterThanOrEqual(65)
  })
})
