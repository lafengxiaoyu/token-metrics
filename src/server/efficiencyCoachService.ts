import type {
  EfficiencyCategorySummary,
  EfficiencyCoachBand,
  EfficiencyCoachDTO,
  EfficiencyCoachFinding,
  EfficiencyModelInsight,
  EfficiencyProjectInsight,
  EfficiencyPromptCoach,
  EfficiencyScoreBreakdown,
  EfficiencySessionReview,
  EfficiencyWeeklyReview,
} from '../shared/types.js'
import type { ProjectSummary, SessionSummary, TaskCategory } from '../types.js'
import { CATEGORY_LABELS } from '../types.js'
import type { UsageQuery } from '../usage/query.js'
import { applyProjectFilter } from '../usage/projectFilter.js'
import { parseAllSessions } from '../parser.js'

const READ_TOOLS = new Set(['Read', 'Grep', 'Glob', 'FileReadTool', 'GrepTool', 'GlobTool', 'LS'])
const EDIT_TOOLS = new Set(['Edit', 'Write', 'FileEditTool', 'FileWriteTool', 'NotebookEdit', 'cursor:edit'])
const BASH_TOOLS = new Set(['Bash', 'BashTool', 'PowerShellTool'])

type SessionMetrics = {
  session: SessionSummary
  project: ProjectSummary
  category: TaskCategory
  label: string
  totalTokens: number
  durationMinutes: number
  turns: number
  editTurns: number
  readCalls: number
  editCalls: number
  bashCalls: number
  retries: number
  promptScore: number
  avgPromptLength: number
  hasExplicitScope: boolean
  categoryP75Tokens: number
  firstPrompt: string
  rewrittenPrompt: string
  models: string[]
}

type ScoredSession = SessionMetrics & {
  score: number
  band: EfficiencyCoachBand
  breakdown: EfficiencyScoreBreakdown
  reasons: string[]
  recommendation: string
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function bandFor(score: number): EfficiencyCoachBand {
  if (score >= 85) return 'high'
  if (score >= 65) return 'healthy'
  if (score >= 45) return 'watch'
  return 'low'
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[index] ?? 0
}

function dominantCategory(session: SessionSummary): TaskCategory {
  const entries = Object.entries(session.categoryBreakdown ?? {}) as Array<[TaskCategory, { turns: number; costUSD: number }]>
  if (entries.length === 0) return session.turns[0]?.category ?? 'general'
  return entries.sort((a, b) => b[1].turns - a[1].turns || b[1].costUSD - a[1].costUSD)[0]?.[0] ?? 'general'
}

function countTool(session: SessionSummary, tools: Set<string>): number {
  let count = 0
  for (const turn of session.turns) {
    for (const call of turn.assistantCalls) {
      count += call.tools.filter(tool => tools.has(tool)).length
    }
  }
  return count
}

function sessionDurationMinutes(session: SessionSummary): number {
  const start = Date.parse(session.firstTimestamp)
  const end = Date.parse(session.lastTimestamp)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  return Math.round((end - start) / 60000)
}

function scorePrompt(messages: string[]): { score: number; avgLength: number; hasExplicitScope: boolean } {
  const nonEmpty = messages.map(m => m.trim()).filter(Boolean)
  if (nonEmpty.length === 0) return { score: 45, avgLength: 0, hasExplicitScope: false }

  let total = 0
  let scoped = false
  for (const message of nonEmpty) {
    let score = 35
    if (message.length >= 40) score += 15
    if (message.length >= 120) score += 10
    if (/\b(src|app|lib|server|client|components|pages|tests?|docs?)\/|\.\w{1,8}\b/.test(message)) {
      score += 15
      scoped = true
    }
    if (/\b(error|failed|failing|bug|expected|actual|stack|trace|repro|steps?|goal|output|result)\b/i.test(message)) score += 15
    if (/\b(only|just|first|do not|don't|without|scope|limit|specific)\b/i.test(message)) score += 10
    total += clampScore(score)
  }

  const avgLength = Math.round(nonEmpty.reduce((sum, msg) => sum + msg.length, 0) / nonEmpty.length)
  return { score: clampScore(total / nonEmpty.length), avgLength, hasExplicitScope: scoped }
}

function isDeliveryCategory(category: TaskCategory): boolean {
  return ['coding', 'debugging', 'feature', 'refactoring', 'testing', 'build/deploy'].includes(category)
}

function isSimpleCategory(category: TaskCategory): boolean {
  return ['conversation', 'exploration', 'planning', 'brainstorming', 'general'].includes(category)
}

function rewritePrompt(prompt: string, category: TaskCategory, project: string): string {
  const compact = prompt.trim().replace(/\s+/g, ' ')
  const target = compact.length > 0 ? compact.slice(0, 180) : 'the issue'
  if (isDeliveryCategory(category)) {
    return `Goal: ${target}. Scope: start with the most likely files in ${project}. Success: identify the cause, make the smallest safe change, and run one verification command. Stop if the same approach fails twice.`
  }
  return `Goal: ${target}. Scope: inspect only the smallest relevant area first. Success: return a concise finding with the files or evidence used before expanding the search.`
}

function sessionModels(session: SessionSummary): string[] {
  const models = new Set<string>()
  for (const turn of session.turns) {
    for (const call of turn.assistantCalls) {
      if (call.model && call.model !== 'synthetic' && call.model !== '<synthetic>') models.add(call.model)
    }
  }
  return [...models]
}

function sessionTimeline(scored: ScoredSession): Array<{ label: string; detail: string }> {
  return [
    { label: 'Start', detail: scored.session.firstTimestamp.slice(0, 16).replace('T', ' ') },
    { label: 'Prompt', detail: scored.firstPrompt || 'No user prompt captured' },
    { label: 'Activity', detail: `${scored.readCalls} reads/searches, ${scored.editCalls} edits, ${scored.bashCalls} shell calls` },
    { label: 'Result', detail: `${scored.score}/100 with ${scored.retries} retry signals` },
  ]
}

function buildRecommendation(metrics: SessionMetrics, reasons: string[]): string {
  if (metrics.retries >= 2) {
    return 'Set a retry limit: after the same approach fails twice, ask Copilot to restate its assumptions, evidence, and next verification step.'
  }
  if (metrics.editTurns === 0 && isDeliveryCategory(metrics.category)) {
    return 'Start narrower: name the likely files or module first, then ask Copilot to confirm the cause before expanding the search.'
  }
  if (metrics.readCalls > 30 || (metrics.editTurns > 0 && metrics.readCalls / Math.max(metrics.editTurns, 1) > 12)) {
    return 'Bound the first pass: limit the initial search area and ask for a short finding before opening more files.'
  }
  if (metrics.promptScore < 55) {
    return 'Add three pieces of context up front: goal, scope, and success criteria.'
  }
  if (metrics.totalTokens > metrics.categoryP75Tokens && metrics.categoryP75Tokens > 0) {
    return 'Split long work into 20-40 minute checkpoints, each ending with a finding, change, or verification result.'
  }
  return reasons[0] ?? 'Keep this pattern: clear scope, focused exploration, and a concrete verification step.'
}

function scoreSession(metrics: SessionMetrics): ScoredSession {
  const deliveryTask = isDeliveryCategory(metrics.category)
  const readEditRatio = metrics.readCalls / Math.max(metrics.editTurns, 1)
  const tokenRatio = metrics.categoryP75Tokens > 0 ? metrics.totalTokens / metrics.categoryP75Tokens : 1

  let outcome = deliveryTask
    ? 45 + metrics.editTurns * 18 + Math.min(metrics.editCalls, 4) * 6
    : 72 + Math.min(metrics.readCalls, 12)
  if (deliveryTask && metrics.editTurns === 0) outcome -= 35
  if (!deliveryTask && metrics.readCalls === 0 && metrics.turns > 1) outcome -= 10

  let focus = 82
  if (metrics.readCalls > 20) focus -= Math.min(35, (metrics.readCalls - 20) * 1.4)
  if (readEditRatio > 10 && deliveryTask) focus -= Math.min(25, (readEditRatio - 10) * 2)
  if (metrics.durationMinutes > 60 && metrics.editTurns <= 1) focus -= 15

  let reliability = 92 - metrics.retries * 18
  if (metrics.bashCalls > 12 && metrics.retries > 0) reliability -= 10

  let cost = 86
  if (tokenRatio > 1.5) cost -= Math.min(45, (tokenRatio - 1.5) * 30)
  if (metrics.totalTokens > 0 && metrics.editTurns === 0 && deliveryTask) cost -= 20

  const prompt = metrics.promptScore

  const breakdown = {
    outcome: clampScore(outcome),
    focus: clampScore(focus),
    reliability: clampScore(reliability),
    cost: clampScore(cost),
    prompt,
  }

  const score = clampScore(
    breakdown.outcome * 0.3
    + breakdown.focus * 0.2
    + breakdown.reliability * 0.2
    + breakdown.cost * 0.15
    + breakdown.prompt * 0.15,
  )

  const reasons: string[] = []
  if (deliveryTask && metrics.editTurns === 0 && metrics.totalTokens > 0) reasons.push('No edit output for a delivery-oriented task')
  if (metrics.readCalls > 30) reasons.push(`Broad exploration: ${metrics.readCalls} read/search calls`)
  if (deliveryTask && readEditRatio > 12) reasons.push(`High read-to-edit ratio: about ${readEditRatio.toFixed(1)}:1`)
  if (metrics.retries >= 2) reasons.push(`${metrics.retries} retry signals`)
  if (metrics.durationMinutes > 60 && metrics.editTurns <= 1) reasons.push(`Slow progress: ${metrics.durationMinutes} minutes with little editing`)
  if (metrics.promptScore < 55) reasons.push('Opening prompt lacks clear scope or success criteria')
  if (tokenRatio > 1.5 && metrics.categoryP75Tokens > 0) reasons.push('Token usage is above the usual level for this task type')
  if (reasons.length === 0) reasons.push('Scope, exploration, and output are balanced')

  return {
    ...metrics,
    score,
    band: bandFor(score),
    breakdown,
    reasons,
    recommendation: buildRecommendation(metrics, reasons),
  }
}

function toReview(scored: ScoredSession): EfficiencySessionReview {
  return {
    sessionId: scored.session.sessionId,
    project: scored.project.project,
    date: scored.session.firstTimestamp.slice(0, 10),
    category: scored.label,
    score: scored.score,
    band: scored.band,
    totalTokens: scored.totalTokens,
    totalCost: Number(scored.session.totalCostUSD.toFixed(4)),
    durationMinutes: scored.durationMinutes,
    turns: scored.turns,
    editTurns: scored.editTurns,
    readCalls: scored.readCalls,
    bashCalls: scored.bashCalls,
    retries: scored.retries,
    promptScore: scored.promptScore,
    firstPrompt: scored.firstPrompt,
    rewrittenPrompt: scored.rewrittenPrompt,
    models: scored.models,
    timeline: sessionTimeline(scored),
    reasons: scored.reasons,
    recommendation: scored.recommendation,
  }
}

async function loadProjects(query: UsageQuery): Promise<ProjectSummary[]> {
  const range = { start: query.from, end: query.to }
  const projects = query.providers.includes('all')
    ? await parseAllSessions(range, undefined)
    : (await Promise.all(query.providers.map(provider => parseAllSessions(range, provider)))).flat()
  return applyProjectFilter(projects, query.project)
}

function buildFindings(scored: ScoredSession[], breakdown: EfficiencyScoreBreakdown): EfficiencyCoachFinding[] {
  const findings: EfficiencyCoachFinding[] = []
  const lowSessions = scored.filter(s => s.band === 'low' || s.band === 'watch')
  const noEditDelivery = scored.filter(s => isDeliveryCategory(s.category) && s.editTurns === 0 && s.totalTokens > 0)
  const retryHeavy = scored.filter(s => s.retries >= 2)
  const broadExploration = scored.filter(s => s.readCalls > 30)
  const vaguePrompts = scored.filter(s => s.promptScore < 55)

  if (lowSessions.length > 0) {
    findings.push({
      title: `${lowSessions.length} sessions worth reviewing`,
      severity: lowSessions.some(s => s.band === 'low') ? 'high' : 'medium',
      detail: 'These sessions combine higher spend with weak output, broad exploration, or retry signals.',
      recommendation: 'Review the candidates below and reuse only the most relevant constraint next time.',
    })
  }
  if (noEditDelivery.length > 0) {
    findings.push({
      title: 'Delivery tasks show weak output signals',
      severity: 'medium',
      detail: `${noEditDelivery.length} delivery-oriented sessions had no clear edit output.`,
      recommendation: 'For implementation, debugging, or testing work, define the expected verification step before exploration expands.'
    })
  }
  if (retryHeavy.length > 0) {
    findings.push({
      title: 'Retry rate is elevated',
      severity: 'medium',
      detail: `${retryHeavy.length} sessions show repeated edit-test-edit retry patterns.`,
      recommendation: 'After the second failed attempt, pause trial-and-error and ask for assumptions, evidence, and the smallest testable experiment.'
    })
  }
  if (broadExploration.length > 0) {
    findings.push({
      title: 'Exploration can be more focused',
      severity: breakdown.focus < 60 ? 'high' : 'medium',
      detail: `${broadExploration.length} sessions used more than 30 read or search calls.`,
      recommendation: 'Set a first-pass boundary, such as checking only routes, services, and related tests before expanding.'
    })
  }
  if (vaguePrompts.length > 0) {
    findings.push({
      title: 'Prompt clarity can improve',
      severity: 'low',
      detail: `${vaguePrompts.length} sessions started with short prompts that missed scope, goal, or success criteria.`,
      recommendation: 'Use a goal + scope + success criteria format to reduce unnecessary reads and follow-up retries.'
    })
  }

  if (findings.length === 0) {
    findings.push({
      title: 'Overall usage rhythm is healthy',
      severity: 'low',
      detail: 'No obvious high-spend, low-output pattern was detected in the selected range.',
      recommendation: 'Keep using clear scope, staged verification, and small delivery steps.'
    })
  }

  return findings.slice(0, 5)
}

function emptyCoach(summary: string): EfficiencyCoachDTO {
  return {
    score: 0,
    band: 'watch',
    summary,
    breakdown: { outcome: 0, focus: 0, reliability: 0, cost: 0, prompt: 0 },
    findings: [],
    lowEfficiencySessions: [],
    highEfficiencySessions: [],
    categories: [],
    weeklyReview: {
      sessions: 0,
      totalTokens: 0,
      totalCost: 0,
      avgScore: 0,
      topTaskType: 'N/A',
      bestDay: null,
      focus: 'No sessions available yet.',
      wins: [],
      improvements: [],
    },
    promptCoach: {
      avgPromptScore: 0,
      vaguePromptRate: 0,
      commonGaps: [],
      examples: [],
    },
    modelInsights: [],
    projectInsights: [],
  }
}

function buildWeeklyReview(scored: ScoredSession[], categories: EfficiencyCategorySummary[], findings: EfficiencyCoachFinding[]): EfficiencyWeeklyReview {
  const byDate = new Map<string, ScoredSession[]>()
  for (const session of scored) {
    const date = session.session.firstTimestamp.slice(0, 10)
    byDate.set(date, [...(byDate.get(date) ?? []), session])
  }
  const bestDay = [...byDate.entries()]
    .map(([date, sessions]) => ({
      date,
      score: sessions.reduce((sum, session) => sum + session.score, 0) / sessions.length,
    }))
    .sort((a, b) => b.score - a.score)[0]?.date ?? null

  const totalTokens = scored.reduce((sum, session) => sum + session.totalTokens, 0)
  const totalCost = scored.reduce((sum, session) => sum + session.session.totalCostUSD, 0)
  const highSessions = scored.filter(session => session.band === 'high')
  const broadSessions = scored.filter(session => session.readCalls > 30)
  const retrySessions = scored.filter(session => session.retries > 0)
  const vagueSessions = scored.filter(session => session.promptScore < 55)

  return {
    sessions: scored.length,
    totalTokens,
    totalCost: Number(totalCost.toFixed(4)),
    avgScore: clampScore(scored.reduce((sum, session) => sum + session.score, 0) / scored.length),
    topTaskType: categories[0]?.category ?? 'N/A',
    bestDay,
    focus: findings[0]?.title ?? 'Keep the current workflow steady.',
    wins: [
      highSessions.length > 0 ? `${highSessions.length} sessions scored in the high-efficiency band.` : '',
      retrySessions.length === 0 ? 'No retry-heavy sessions detected.' : '',
      broadSessions.length === 0 ? 'Exploration stayed focused across the selected range.' : '',
    ].filter(Boolean),
    improvements: [
      broadSessions.length > 0 ? `Constrain first-pass exploration in ${broadSessions.length} sessions.` : '',
      retrySessions.length > 0 ? `Add stop conditions for ${retrySessions.length} sessions with retry signals.` : '',
      vagueSessions.length > 0 ? `Clarify scope and success criteria in ${vagueSessions.length} opening prompts.` : '',
    ].filter(Boolean).slice(0, 3),
  }
}

function buildPromptCoach(scored: ScoredSession[]): EfficiencyPromptCoach {
  const vague = scored.filter(session => session.promptScore < 55)
  const missingScope = scored.filter(session => !session.hasExplicitScope)
  const longSpendVague = vague.filter(session => session.totalTokens > session.categoryP75Tokens)
  const commonGaps = [
    missingScope.length > 0 ? `${missingScope.length} sessions did not name a file, folder, or clear scope.` : '',
    vague.length > 0 ? `${vague.length} sessions started without enough goal/scope/success detail.` : '',
    longSpendVague.length > 0 ? `${longSpendVague.length} vague prompts led to above-baseline token usage.` : '',
  ].filter(Boolean)

  const examples = vague
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .slice(0, 3)
    .map(session => ({
      before: session.firstPrompt || 'No prompt captured',
      after: session.rewrittenPrompt,
      reason: session.reasons.find(reason => reason.includes('prompt') || reason.includes('scope')) ?? 'The rewritten prompt adds scope and a measurable stopping point.',
    }))

  return {
    avgPromptScore: clampScore(scored.reduce((sum, session) => sum + session.promptScore, 0) / scored.length),
    vaguePromptRate: Math.round((vague.length / scored.length) * 100),
    commonGaps,
    examples,
  }
}

function buildModelInsights(scored: ScoredSession[]): EfficiencyModelInsight[] {
  const byModel = new Map<string, ScoredSession[]>()
  for (const session of scored) {
    for (const model of session.models.length > 0 ? session.models : ['Unknown']) {
      byModel.set(model, [...(byModel.get(model) ?? []), session])
    }
  }

  return [...byModel.entries()].map(([model, sessions]) => {
    const totalCost = sessions.reduce((sum, session) => sum + session.session.totalCostUSD, 0)
    const simpleTaskShare = Math.round((sessions.filter(session => isSimpleCategory(session.category)).length / sessions.length) * 100)
    const avgScore = clampScore(sessions.reduce((sum, session) => sum + session.score, 0) / sessions.length)
    return {
      model,
      sessions: sessions.length,
      avgScore,
      totalTokens: sessions.reduce((sum, session) => sum + session.totalTokens, 0),
      totalCost: Number(totalCost.toFixed(4)),
      simpleTaskShare,
      recommendation: simpleTaskShare >= 60 && totalCost > 0
        ? 'This model is often used for simpler tasks; consider reserving it for complex debugging, refactors, or architecture work.'
        : avgScore < 60
          ? 'Low score for this model usually points to task framing or retry loops, not necessarily model quality.'
          : 'Usage looks reasonable for the observed task mix.',
    }
  }).sort((a, b) => b.totalCost - a.totalCost || b.totalTokens - a.totalTokens).slice(0, 5)
}

function buildProjectInsights(scored: ScoredSession[]): EfficiencyProjectInsight[] {
  const byProject = new Map<string, ScoredSession[]>()
  for (const session of scored) {
    byProject.set(session.project.project, [...(byProject.get(session.project.project) ?? []), session])
  }

  return [...byProject.entries()].map(([project, sessions]) => {
    const retryRate = Math.round((sessions.filter(session => session.retries > 0).length / sessions.length) * 100)
    const broadExplorationRate = Math.round((sessions.filter(session => session.readCalls > 30).length / sessions.length) * 100)
    const avgScore = clampScore(sessions.reduce((sum, session) => sum + session.score, 0) / sessions.length)
    const totalCost = sessions.reduce((sum, session) => sum + session.session.totalCostUSD, 0)
    return {
      project,
      sessions: sessions.length,
      avgScore,
      totalTokens: sessions.reduce((sum, session) => sum + session.totalTokens, 0),
      totalCost: Number(totalCost.toFixed(4)),
      retryRate,
      broadExplorationRate,
      recommendation: broadExplorationRate >= 40
        ? 'Create a small project map or ask Copilot to start from known entry points before searching broadly.'
        : retryRate >= 40
          ? 'Add verification checkpoints and stop conditions before allowing repeated fixes.'
          : avgScore >= 75
            ? 'This project is using Copilot efficiently; keep the current workflow.'
            : 'Review the lowest-scoring sessions for this project and tighten the first-pass scope.',
    }
  }).sort((a, b) => a.avgScore - b.avgScore || b.totalCost - a.totalCost).slice(0, 6)
}

export function analyzeEfficiencyCoach(projects: ProjectSummary[]): EfficiencyCoachDTO {
  const sessions = projects.flatMap(project => project.sessions.map(session => ({ project, session })))
  if (sessions.length === 0) {
    return emptyCoach('No Copilot CLI sessions are available in the selected range yet.')
  }

  const categoryTokens = new Map<TaskCategory, number[]>()
  for (const { session } of sessions) {
    const category = dominantCategory(session)
    const tokens = session.totalInputTokens + session.totalOutputTokens
    categoryTokens.set(category, [...(categoryTokens.get(category) ?? []), tokens])
  }

  const scored = sessions.map(({ project, session }) => {
    const category = dominantCategory(session)
    const prompt = scorePrompt(session.turns.map(turn => turn.userMessage))
    const firstPrompt = session.turns.map(turn => turn.userMessage.trim()).find(Boolean) ?? ''
    const metrics: SessionMetrics = {
      session,
      project,
      category,
      label: CATEGORY_LABELS[category] ?? category,
      totalTokens: session.totalInputTokens + session.totalOutputTokens,
      durationMinutes: sessionDurationMinutes(session),
      turns: session.turns.length,
      editTurns: session.turns.filter(turn => turn.hasEdits).length,
      readCalls: countTool(session, READ_TOOLS),
      editCalls: countTool(session, EDIT_TOOLS),
      bashCalls: countTool(session, BASH_TOOLS),
      retries: session.turns.reduce((sum, turn) => sum + turn.retries, 0),
      promptScore: prompt.score,
      avgPromptLength: prompt.avgLength,
      hasExplicitScope: prompt.hasExplicitScope,
      categoryP75Tokens: percentile(categoryTokens.get(category) ?? [], 75),
      firstPrompt,
      rewrittenPrompt: rewritePrompt(firstPrompt, category, project.project),
      models: sessionModels(session),
    }
    return scoreSession(metrics)
  })

  const avg = (values: number[]) => values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
  const breakdown: EfficiencyScoreBreakdown = {
    outcome: clampScore(avg(scored.map(s => s.breakdown.outcome))),
    focus: clampScore(avg(scored.map(s => s.breakdown.focus))),
    reliability: clampScore(avg(scored.map(s => s.breakdown.reliability))),
    cost: clampScore(avg(scored.map(s => s.breakdown.cost))),
    prompt: clampScore(avg(scored.map(s => s.breakdown.prompt))),
  }
  const score = clampScore(avg(scored.map(s => s.score)))

  const byCategory = new Map<string, ScoredSession[]>()
  for (const session of scored) {
    byCategory.set(session.label, [...(byCategory.get(session.label) ?? []), session])
  }
  const categories: EfficiencyCategorySummary[] = [...byCategory.entries()].map(([category, items]) => ({
    category,
    sessions: items.length,
    avgScore: clampScore(avg(items.map(item => item.score))),
    avgTokens: Math.round(avg(items.map(item => item.totalTokens))),
    editRate: Math.round((items.filter(item => item.editTurns > 0).length / items.length) * 100),
    retryRate: Math.round((items.filter(item => item.retries > 0).length / items.length) * 100),
  })).sort((a, b) => b.sessions - a.sessions || b.avgTokens - a.avgTokens)

  const lowEfficiencySessions = scored
    .filter(s => s.band === 'low' || s.band === 'watch')
    .sort((a, b) => a.score - b.score || b.totalTokens - a.totalTokens)
    .slice(0, 6)
    .map(toReview)

  const highEfficiencySessions = scored
    .filter(s => s.band === 'high')
    .sort((a, b) => b.score - a.score || b.totalTokens - a.totalTokens)
    .slice(0, 3)
    .map(toReview)

  const summary = score >= 85
    ? 'Copilot CLI usage looks highly efficient: output, focus, and retry control are all strong.'
    : score >= 65
      ? 'Copilot CLI usage looks healthy, with room to improve scope clarity and verification rhythm in some sessions.'
      : score >= 45
        ? 'Copilot CLI usage has clear optimization opportunities, especially high-spend low-output sessions, broad exploration, and retries.'
        : 'Copilot CLI usage looks inefficient in this range. Start by reviewing the flagged sessions and adding clearer stopping conditions.'

  const findings = buildFindings(scored, breakdown)

  return {
    score,
    band: bandFor(score),
    summary,
    breakdown,
    findings,
    lowEfficiencySessions,
    highEfficiencySessions,
    categories,
    weeklyReview: buildWeeklyReview(scored, categories, findings),
    promptCoach: buildPromptCoach(scored),
    modelInsights: buildModelInsights(scored),
    projectInsights: buildProjectInsights(scored),
  }
}

export async function getEfficiencyCoach(query: UsageQuery): Promise<EfficiencyCoachDTO> {
  const projects = await loadProjects(query)
  return analyzeEfficiencyCoach(projects)
}
