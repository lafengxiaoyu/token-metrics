import { describe, it, expect } from 'vitest';
import { normalizeUsageQuery } from '../../usage/query.js';

describe('normalizeUsageQuery', () => {
  it('defaultsprovider to all', () => {
    const result = normalizeUsageQuery({});
    expect(result.providers).toEqual(['all']);
  });

  it('converts comma-separated provider string to array', () =>{
    const result = normalizeUsageQuery({ provider: 'claude,codex,cursor' });
    expect(result.providers).toEqual(['claude', 'codex', 'cursor']);
  });

  it('throwson invalid from date', () => {
    expect(() => normalizeUsageQuery({ from: 'not-a-date' })).toThrow('Invalid from date');
  });

  it('defaults daterange to last 30 days', () => {
    const result = normalizeUsageQuery({});
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    expect(result.from.getTime()).toBeCloseTo(thirtyDaysAgo.getTime(), -3);
    expect(result.to.getTime()).toBeCloseTo(now.getTime(), -3);
  });

  it('throws when from is after to', () => {
    expect(() => normalizeUsageQuery({ from: '2026-05-10', to: '2026-05-01' })).toThrow('from must be before to');
  });
});
