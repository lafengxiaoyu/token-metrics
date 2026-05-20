import type {
  EfficiencyCategorySummary,
  EfficiencyCoachBand,
  EfficiencyCoachDTO,
  EfficiencyCoachFinding,
  EfficiencyScoreBreakdown,
  EfficiencySessionReview,
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

function buildRecommendation(metrics: SessionMetrics, reasons: string[]): string {
  if (metrics.retries >= 2) {
    return '下次先设置重试上限：同一方案失败两次后停下来，让 Copilot 重新说明假设、证据和下一步验证命令。'
  }
  if (metrics.editTurns === 0 && isDeliveryCategory(metrics.category)) {
    return '把请求改成可交付形式：明确目标文件、期望行为和验证方式，并要求 Copilot 在定位后给出最小修改。'
  }
  if (metrics.readCalls > 30 || (metrics.editTurns > 0 && metrics.readCalls / Math.max(metrics.editTurns, 1) > 12)) {
    return '给探索加边界：指定最多先看哪些目录/文件，并要求先汇报定位结论，再继续扩大范围。'
  }
  if (metrics.promptScore < 55) {
    return '补上上下文三件套：目标、范围、成功标准。比如“只检查 X 和 Y，找出 Z 的原因，先不要改代码”。'
  }
  if (metrics.totalTokens > metrics.categoryP75Tokens && metrics.categoryP75Tokens > 0) {
    return '把长任务拆成 20-40 分钟的小会话，每段都要求产出一个结论、一个修改或一个验证结果。'
  }
  return reasons[0] ?? '保持这种节奏：目标清楚、探索收敛，并用验证命令确认结果。'
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
  if (deliveryTask && metrics.editTurns === 0 && metrics.totalTokens > 0) reasons.push('交付型任务没有编辑产出')
  if (metrics.readCalls > 30) reasons.push(`探索偏宽，读取/搜索 ${metrics.readCalls} 次`)
  if (deliveryTask && readEditRatio > 12) reasons.push(`读取与编辑比例偏高，约 ${readEditRatio.toFixed(1)}:1`)
  if (metrics.retries >= 2) reasons.push(`出现 ${metrics.retries} 次返工信号`)
  if (metrics.durationMinutes > 60 && metrics.editTurns <= 1) reasons.push(`长会话推进偏慢，${metrics.durationMinutes} 分钟内编辑较少`)
  if (metrics.promptScore < 55) reasons.push('初始请求缺少明确范围或成功标准')
  if (tokenRatio > 1.5 && metrics.categoryP75Tokens > 0) reasons.push('token 消耗高于同类任务常见水平')
  if (reasons.length === 0) reasons.push('目标、探索和产出比较平衡')

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
      title: `${lowSessions.length} 个会话值得复盘`,
      severity: lowSessions.some(s => s.band === 'low') ? 'high' : 'medium',
      detail: '这些会话通常同时出现高消耗、低产出、探索过宽或返工信号。',
      recommendation: '优先看下面的低效会话列表，把对应建议复制成下一次 Copilot CLI 的开场约束。',
    })
  }
  if (noEditDelivery.length > 0) {
    findings.push({
      title: '交付型任务存在低产出信号',
      severity: 'medium',
      detail: `${noEditDelivery.length} 个交付型会话没有明显编辑产出。`,
      recommendation: '对实现、调试、测试类任务，开场就定义“最终需要修改/验证什么”，避免只停留在探索。'
    })
  }
  if (retryHeavy.length > 0) {
    findings.push({
      title: '返工次数偏高',
      severity: 'medium',
      detail: `${retryHeavy.length} 个会话出现多次 edit-test-edit 式返工信号。`,
      recommendation: '让 Copilot 在第二次失败后停止试错，先重新列假设、证据和可验证的最小实验。'
    })
  }
  if (broadExploration.length > 0) {
    findings.push({
      title: '探索范围可以更收敛',
      severity: breakdown.focus < 60 ? 'high' : 'medium',
      detail: `${broadExploration.length} 个会话读取或搜索次数超过 30 次。`,
      recommendation: '给 Copilot 明确第一轮探索边界，比如“先只看 routes、service 和对应测试”。'
    })
  }
  if (vaguePrompts.length > 0) {
    findings.push({
      title: '提示词清晰度有提升空间',
      severity: 'low',
      detail: `${vaguePrompts.length} 个会话的请求较短，缺少范围、目标或成功标准。`,
      recommendation: '使用“目标 + 范围 + 验证标准”的格式开场，通常能减少无效读取和后续返工。'
    })
  }

  if (findings.length === 0) {
    findings.push({
      title: '整体使用节奏健康',
      severity: 'low',
      detail: '当前范围内没有明显的高消耗低产出模式。',
      recommendation: '继续保持明确范围、阶段性验证和小步交付的使用方式。'
    })
  }

  return findings.slice(0, 5)
}

export async function getEfficiencyCoach(query: UsageQuery): Promise<EfficiencyCoachDTO> {
  const projects = await loadProjects(query)
  const sessions = projects.flatMap(project => project.sessions.map(session => ({ project, session })))
  if (sessions.length === 0) {
    return {
      score: 0,
      band: 'watch',
      summary: '当前筛选范围内还没有可分析的 Copilot CLI 会话。',
      breakdown: { outcome: 0, focus: 0, reliability: 0, cost: 0, prompt: 0 },
      findings: [],
      lowEfficiencySessions: [],
      highEfficiencySessions: [],
      categories: [],
    }
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
    ? 'Copilot CLI 使用整体很高效：产出、聚焦和返工控制都不错。'
    : score >= 65
      ? 'Copilot CLI 使用整体健康，但有一些会话可以通过更清晰的范围和验证节奏继续提效。'
      : score >= 45
        ? 'Copilot CLI 使用有明显优化空间，主要关注高消耗低产出、探索过宽和返工。'
        : 'Copilot CLI 使用效率偏低，建议先用低效会话列表做复盘，重建开场提示和停止条件。'

  return {
    score,
    band: bandFor(score),
    summary,
    breakdown,
    findings: buildFindings(scored, breakdown),
    lowEfficiencySessions,
    highEfficiencySessions,
    categories,
  }
}
