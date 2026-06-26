import { readPlan, savePlan, type Plan } from './config.js'
import { parseAllSessions } from './parser.js'
import { PRESET_PLANS } from './plans.js'
import type { DateRange, ProjectSummary } from './types.js'
import { fetchOfficialCreditsForPlan } from './github-billing.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const PLAN_NEAR_THRESHOLD_PCT = 80
const AI_CREDITS_PER_USD = 100
const DEFAULT_LOCAL_TO_OFFICIAL_FACTOR = 3.603

export const DEFAULT_COPILOT_CREDIT_PLAN: Plan = {
  ...PRESET_PLANS['copilot-business'],
  setAt: '2026-06-01T00:00:00.000Z',
}

export function normalizeCreditLimit(value: unknown): number {
  const credits = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(credits) || !Number.isInteger(credits) || credits < 1 || credits > 10_000_000) {
    throw new Error('Credit allowance must be a whole number between 1 and 10,000,000')
  }
  return credits
}

export function normalizeOfficialUsedCredits(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const credits = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(credits) || !Number.isInteger(credits) || credits < 0 || credits > 10_000_000) {
    throw new Error('Official credits used must be a whole number between 0 and 10,000,000')
  }
  return credits
}

export async function saveCopilotCreditSettings(monthlyValue: unknown, officialUsedValue: unknown): Promise<Plan> {
  const monthlyCredits = normalizeCreditLimit(monthlyValue)
  const officialUsedCredits = normalizeOfficialUsedCredits(officialUsedValue)
  const current = await readPlan()
  const plan: Plan = {
    id: 'custom',
    monthlyCredits,
    monthlyUsd: monthlyCredits / AI_CREDITS_PER_USD,
    officialUsedCredits,
    officialUsageUpdatedAt: officialUsedCredits === undefined ? undefined : new Date().toISOString(),
    provider: 'copilot',
    resetDay: current?.resetDay ?? 1,
    setAt: new Date().toISOString(),
  }
  await savePlan(plan)
  return plan
}

export type PlanStatus = 'under' | 'near' | 'exhausted' | 'over'

export type PlanUsage = {
  plan: Plan
  periodStart: Date
  periodEnd: Date
  spentApiEquivalentUsd: number
  budgetUsd: number
  localEstimatedCredits: number
  spentCredits: number
  creditLimit: number
  remainingCredits: number
  percentUsed: number
  status: PlanStatus
  projectedMonthUsd: number
  projectedCredits: number
  dailyCreditBudget: number
  projectedOverageUsd: number
  daysUntilReset: number
  usageSource: 'local-estimate' | 'local-estimate-calibrated' | 'official-manual' | 'official-api'
  officialUsageUpdatedAt?: string
  isEstimate: boolean
}

export function clampResetDay(resetDay: number | undefined): number {
  if (!Number.isInteger(resetDay)) return 1
  return Math.min(28, Math.max(1, resetDay ?? 1))
}

export function computePeriodFromResetDay(resetDay: number | undefined, today: Date): { periodStart: Date; periodEnd: Date } {
  const day = clampResetDay(resetDay)
  const year = today.getFullYear()
  const month = today.getMonth()

  if (today.getDate() >= day) {
    return {
      periodStart: new Date(year, month, day, 0, 0, 0, 0),
      periodEnd: new Date(year, month + 1, day, 0, 0, 0, 0),
    }
  }

  return {
    periodStart: new Date(year, month - 1, day, 0, 0, 0, 0),
    periodEnd: new Date(year, month, day, 0, 0, 0, 0),
  }
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]!
}

function toLocalDateKey(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toDayIndex(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_PER_DAY)
}

function diffCalendarDays(from: Date, to: Date): number {
  return toDayIndex(to) - toDayIndex(from)
}

function resolveLocalToOfficialFactor(): number {
  const configured = Number(process.env.TOKENLENS_LOCAL_TO_OFFICIAL_FACTOR)
  if (Number.isFinite(configured) && configured > 0) return configured
  return DEFAULT_LOCAL_TO_OFFICIAL_FACTOR
}

function sumCostAfterTimestamp(projects: ProjectSummary[], since: Date, now: Date): number {
  let total = 0
  for (const project of projects) {
    for (const session of project.sessions) {
      for (const turn of session.turns) {
        if (!turn.timestamp) continue
        const ts = new Date(turn.timestamp)
        if (Number.isNaN(ts.getTime())) continue
        if (ts <= since || ts > now) continue
        total += turn.assistantCalls.reduce((sum, call) => sum + call.costUSD, 0)
      }
    }
  }
  return total
}

export function projectMonthEnd(
  projects: ProjectSummary[],
  periodStart: Date,
  periodEnd: Date,
  today: Date,
  spent: number,
): number {
  const dayCosts = new Map<string, number>()

  for (const project of projects) {
    for (const session of project.sessions) {
      for (const turn of session.turns) {
        if (!turn.timestamp) continue
        const ts = new Date(turn.timestamp)
        if (Number.isNaN(ts.getTime())) continue
        if (ts < periodStart || ts > today) continue
        const dayKey = toLocalDateKey(ts)
        const turnCost = turn.assistantCalls.reduce((sum, call) => sum + call.costUSD, 0)
        dayCosts.set(dayKey, (dayCosts.get(dayKey) ?? 0) + turnCost)
      }
    }
  }

  const elapsedDays = Math.max(1, diffCalendarDays(periodStart, today) + 1)
  const elapsedDailyCosts: number[] = []
  for (let i = 0; i < elapsedDays; i++) {
    const date = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate() + i)
    elapsedDailyCosts.push(dayCosts.get(toLocalDateKey(date)) ?? 0)
  }

  const trailingWindow = elapsedDailyCosts.slice(-7)
  const medianDailyCost = median(trailingWindow)
  const daysRemaining = Math.max(0, diffCalendarDays(today, periodEnd) - 1)

  return spent + medianDailyCost * daysRemaining
}

export function getPlanUsageFromProjects(plan: Plan, projects: ProjectSummary[], today = new Date()): PlanUsage {
  const { periodStart, periodEnd } = computePeriodFromResetDay(plan.resetDay, today)
  const spent = projects.reduce((sum, p) => sum + p.totalCostUSD, 0)
  const localEstimatedCredits = spent * AI_CREDITS_PER_USD
  const localFactor = resolveLocalToOfficialFactor()
  const localCalibratedCredits = localEstimatedCredits * localFactor
  let usageSource: PlanUsage['usageSource'] = plan.officialUsedCredits === undefined
    ? (Math.abs(localFactor - 1) > 1e-9 ? 'local-estimate-calibrated' : 'local-estimate')
    : 'official-manual'
  let spentCredits = localCalibratedCredits
  if (plan.officialUsedCredits !== undefined) {
    spentCredits = plan.officialUsedCredits
    if (plan.officialUsageUpdatedAt) {
      const officialUpdatedAt = new Date(plan.officialUsageUpdatedAt)
      if (!Number.isNaN(officialUpdatedAt.getTime())) {
        const localDeltaCredits = sumCostAfterTimestamp(projects, officialUpdatedAt, today) * AI_CREDITS_PER_USD
        spentCredits += localDeltaCredits
      }
    }
  }
  const creditLimit = plan.monthlyCredits ?? plan.monthlyUsd * AI_CREDITS_PER_USD
  const budgetUsd = creditLimit / AI_CREDITS_PER_USD
  const remainingCredits = Math.max(0, creditLimit - spentCredits)
  const percentUsed = creditLimit > 0 ? (spentCredits / creditLimit) * 100 : 0
  const status: PlanStatus = percentUsed > 100
    ? 'over'
    : percentUsed >= 100
      ? 'exhausted'
      : percentUsed >= PLAN_NEAR_THRESHOLD_PCT ? 'near' : 'under'
  const projectedMonthUsd = projectMonthEnd(projects, periodStart, periodEnd, today, spent)
  const localProjectedCredits = projectedMonthUsd * AI_CREDITS_PER_USD * localFactor
  const projectedCredits = usageSource === 'official-manual'
    ? spentCredits + Math.max(0, localProjectedCredits - localCalibratedCredits)
    : localProjectedCredits
  const daysUntilReset = Math.max(0, diffCalendarDays(today, periodEnd))
  const dailyCreditBudget = daysUntilReset > 0 ? remainingCredits / daysUntilReset : 0
  const projectedOverageUsd = Math.max(0, projectedCredits - creditLimit) / AI_CREDITS_PER_USD

  return {
    plan,
    periodStart,
    periodEnd,
    spentApiEquivalentUsd: spent,
    budgetUsd,
    localEstimatedCredits,
    spentCredits,
    creditLimit,
    remainingCredits,
    percentUsed,
    status,
    projectedMonthUsd,
    projectedCredits,
    dailyCreditBudget,
    projectedOverageUsd,
    daysUntilReset,
    usageSource,
    officialUsageUpdatedAt: plan.officialUsageUpdatedAt,
    isEstimate: usageSource === 'local-estimate',
  }
}

export async function getPlanUsage(plan: Plan, today = new Date()): Promise<PlanUsage> {
  const { periodStart } = computePeriodFromResetDay(plan.resetDay, today)
  const range: DateRange = {
    start: periodStart,
    end: today,
  }
  const provider = plan.provider === 'all' ? 'all' : plan.provider
  const projects = await parseAllSessions(range, provider)
  const autoOfficial = await fetchOfficialCreditsForPlan(plan, today)
  if (autoOfficial) {
    const syncedPlan: Plan = {
      ...plan,
      officialUsedCredits: autoOfficial.credits,
      officialUsageUpdatedAt: autoOfficial.updatedAt,
    }
    const usage = getPlanUsageFromProjects(syncedPlan, projects, today)
    return {
      ...usage,
      usageSource: 'official-api',
    }
  }
  return getPlanUsageFromProjects(plan, projects, today)
}

export async function getPlanUsageOrNull(today = new Date()): Promise<PlanUsage | null> {
  const configuredPlan = await readPlan()
  if (configuredPlan?.id === 'none') return null
  const plan = isActivePlan(configuredPlan) ? configuredPlan : DEFAULT_COPILOT_CREDIT_PLAN
  return getPlanUsage(plan, today)
}

export function isActivePlan(plan: Plan | undefined): plan is Plan {
  return plan !== undefined
    && plan.id !== 'none'
    && ((Number.isFinite(plan.monthlyCredits) && (plan.monthlyCredits ?? 0) > 0)
      || (Number.isFinite(plan.monthlyUsd) && plan.monthlyUsd > 0))
}
