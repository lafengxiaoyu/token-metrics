import { describe, it, expect } from 'vitest';
import {
  ProviderStatusSchema,
  DailyUsageSchema,
  SummarySchema,
  ApiMetaSchema,
  ApiWarningSchema,
  TokenTotalsSchema,
  ModelUsageSchema,
  ProviderUsageSchema,
  ProjectUsageSchema,
} from '../../shared/schemas';

describe('ProviderStatusSchema', () => {
  it('parses valid provider status', () => {
    const input = {
      name: 'claude',
      displayName: 'Claude',
      available: true,
      sourceCount: 2,
      toolSources: ['Claude Code', 'Claude Desktop'],
    };
    const result = ProviderStatusSchema.parse(input);
    expect(result.name).toBe('claude');
    expect(result.available).toBe(true);
  });

  it('parses provider status with error', () => {
    const input = {
      name: 'codex',
displayName: 'Codex',
      available: false,
      sourceCount: 0,
      toolSources: [],
      error: 'Session file not found',
    };
    const result = ProviderStatusSchema.parse(input);
    expect(result.error).toBe('Session file not found');
  });
});

describe('ApiMetaSchema', () => {
  it('parses warning metadata', () => {
    const input = {
      generatedAt: '2026-05-09T00:00:00Z',
      cached: false,
      warnings: [
        { code: 'PROVIDER_ERROR', message: 'Failed to read session', provider: 'codex' },
      ],
    };
    const result = ApiMetaSchema.parse(input);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].provider).toBe('codex');
  });

  it('parses empty warnings', () => {
    const input = {
      generatedAt: '2026-05-09T00:00:00Z',
      cached: true,
      warnings: [],
    };
    const result = ApiMetaSchema.parse(input);
    expect(result.warnings).toHaveLength(0);
    expect(result.cached).toBe(true);
  });
});

describe('DailyUsageSchema', () => {
  it('parses daily usage', () => {
    const input = {
      date: '2026-05-09',
      inputTokens: 1000,
      outputTokens: 500,
      cacheReadTokens: 100,
      cacheWriteTokens: 50,
      reasoningTokens: 200,
      totalTokens: 1500,
      totalCost: 0.05,
      estimatedCost: false,
      calls: 10,
      sessions: 3,
      providers: [],
      models: [],
    };
    const result = DailyUsageSchema.parse(input);
    expect(result.date).toBe('2026-05-09');
    expect(result.totalTokens).toBe(1500);
  });
});

describe('SummarySchema', () => {
  it('parses summary', () => {
    const input = {
      totals: {
        inputTokens: 10000,
        outputTokens: 5000,
        cacheReadTokens: 1000,
        cacheWriteTokens: 500,
        reasoningTokens: 2000,
        totalTokens: 15000,
        totalCost: 0.5,
        estimatedCost: false,
        calls: 100,
        sessions: 20,
        activeDays: 5,
      },
      providers: [],
      models: [],
      projects: [],
    };
    const result = SummarySchema.parse(input);
    expect(result.totals.totalTokens).toBe(15000);
    expect(result.totals.activeDays).toBe(5);
  });
});
