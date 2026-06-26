import { execFile } from 'child_process'
import { promisify } from 'util'
import type { Plan } from './config.js'

const execFileAsync = promisify(execFile)
const AI_CREDIT_USD_PER_UNIT = 0.01

type AiCreditUsageItem = {
  unitType?: string
  netQuantity?: number
  netAmount?: number
  grossQuantity?: number
  grossAmount?: number
  pricePerUnit?: number
}

type BillingUsageResponse = {
  usageItems?: AiCreditUsageItem[]
}

export function sumAiCreditsFromUsageItems(items: AiCreditUsageItem[] | undefined): number {
  if (!items || items.length === 0) return 0

  return items.reduce((sum, item) => {
    const unitType = (item.unitType ?? '').toLowerCase()
    const netQuantity = Number(item.netQuantity)
    const grossQuantity = Number(item.grossQuantity)
    const netAmount = Number(item.netAmount)
    const grossAmount = Number(item.grossAmount)
    const pricePerUnit = Number(item.pricePerUnit)

    if (unitType.includes('credit') && Number.isFinite(netQuantity) && netQuantity >= 0) {
      return sum + netQuantity
    }
    if (unitType.includes('credit') && Number.isFinite(grossQuantity) && grossQuantity >= 0) {
      return sum + grossQuantity
    }
    if (Number.isFinite(netAmount) && netAmount > 0) {
      return sum + (netAmount / AI_CREDIT_USD_PER_UNIT)
    }
    if (Number.isFinite(grossAmount) && grossAmount > 0) {
      return sum + (grossAmount / AI_CREDIT_USD_PER_UNIT)
    }
    if (Number.isFinite(pricePerUnit) && pricePerUnit > 0 && Number.isFinite(netQuantity) && netQuantity > 0) {
      return sum + ((netQuantity * pricePerUnit) / AI_CREDIT_USD_PER_UNIT)
    }
    return sum
  }, 0)
}

async function resolveGithubToken(): Promise<string | null> {
  const envToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? process.env.TOKENLENS_GITHUB_TOKEN
  if (envToken && envToken.trim()) return envToken.trim()

  try {
    const { stdout } = await execFileAsync('gh', ['auth', 'token'], { timeout: 1500 })
    const token = stdout.trim()
    return token || null
  } catch {
    return null
  }
}

async function githubJson<T>(path: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10',
      },
    })
    if (!res.ok) return null
    return await res.json() as T
  } catch {
    return null
  }
}

async function resolveLogin(token: string): Promise<string | null> {
  const envUser = process.env.TOKENLENS_GITHUB_USERNAME
  if (envUser && envUser.trim()) return envUser.trim()
  const user = await githubJson<{ login?: string }>('/user', token)
  return user?.login ?? null
}

async function fetchUserAiCredits(token: string, username: string, year: number, month: number): Promise<number | null> {
  const data = await githubJson<BillingUsageResponse>(
    `/users/${encodeURIComponent(username)}/settings/billing/ai_credit/usage?year=${year}&month=${month}`,
    token,
  )
  if (!data) return null
  return sumAiCreditsFromUsageItems(data.usageItems)
}

async function fetchOrgAiCredits(token: string, org: string, username: string, year: number, month: number): Promise<number | null> {
  const data = await githubJson<BillingUsageResponse>(
    `/organizations/${encodeURIComponent(org)}/settings/billing/ai_credit/usage?year=${year}&month=${month}&user=${encodeURIComponent(username)}`,
    token,
  )
  if (!data) return null
  return sumAiCreditsFromUsageItems(data.usageItems)
}

export type OfficialCreditSync = {
  credits: number
  updatedAt: string
}

export async function fetchOfficialCreditsForPlan(plan: Plan, today = new Date()): Promise<OfficialCreditSync | null> {
  if (plan.provider !== 'copilot' && plan.provider !== 'all') return null
  if (plan.officialUsedCredits !== undefined) return null
  if ((plan.resetDay ?? 1) !== 1) return null

  const token = await resolveGithubToken()
  if (!token) return null

  const login = await resolveLogin(token)
  if (!login) return null

  const year = today.getFullYear()
  const month = today.getMonth() + 1

  const org = process.env.TOKENLENS_GITHUB_ORG
  if (org && org.trim()) {
    const orgCredits = await fetchOrgAiCredits(token, org.trim(), login, year, month)
    if (orgCredits !== null && orgCredits > 0) {
      return { credits: Math.round(orgCredits), updatedAt: new Date().toISOString() }
    }
  }

  const userCredits = await fetchUserAiCredits(token, login, year, month)
  if (userCredits === null || userCredits <= 0) return null

  return { credits: Math.round(userCredits), updatedAt: new Date().toISOString() }
}

