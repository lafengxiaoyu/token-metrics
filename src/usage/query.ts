export interface UsageQuery {
  providers: string[]
  project: string | null
  from: Date
  to: Date
}

export function normalizeUsageQuery(input: Record<string, unknown>): UsageQuery {
  const rawProvider = typeof input['provider'] === 'string' ? input['provider'] : 'all'
  const providers = rawProvider === 'all'
    ? ['all']
    : rawProvider.split(',').map(item => item.trim()).filter(Boolean)

  const project = typeof input['project'] === 'string' && input['project'].trim()
    ? input['project'].trim()
    : null

  const now = new Date()
  const defaultFrom = new Date(now)
  defaultFrom.setDate(defaultFrom.getDate() - 30)

  const from = parseDate(input['from'], defaultFrom, 'from')
  const to = parseDate(input['to'], now, 'to')

  if (from.getTime() > to.getTime()) {
throw new Error('from must be before to')
  }

  return { providers, project, from, to }
}

function parseDate(value: unknown, fallback: Date, field: string): Date {
  if (typeof value !== 'string' || value.trim() === '') return fallback
const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${field} date`)
  }
  return parsed
}
