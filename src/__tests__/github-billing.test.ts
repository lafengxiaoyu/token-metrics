import { describe, expect, it } from 'vitest'
import { sumAiCreditsFromUsageItems } from '../github-billing.js'

describe('GitHub billing credit parsing', () => {
  it('uses net quantity when unit type is credit-like', () => {
    const credits = sumAiCreditsFromUsageItems([
      { unitType: 'AI_CREDITS', netQuantity: 1234, netAmount: 12.34 },
    ])
    expect(credits).toBe(1234)
  })

  it('falls back to dollar amount conversion when quantity is unavailable', () => {
    const credits = sumAiCreditsFromUsageItems([
      { unitType: 'unknown', netAmount: 8.33 },
    ])
    expect(credits).toBeCloseTo(833, 4)
  })
})

