import { z } from 'zod';

export const ApiWarningSchema = z.object({
  provider: z.string().optional(),
  code: z.string(),
  message: z.string(),
});

export const ApiMetaSchema = z.object({
  generatedAt: z.string(),
  cached: z.boolean(),
  warnings: z.array(ApiWarningSchema),
});

export const ApiResultSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    meta: ApiMetaSchema,
  });

export const ProviderStatusSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  available: z.boolean(),
  sourceCount: z.number(),
  toolSources: z.array(z.string()),
  error: z.string().optional(),
});

export const TokenTotalsSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadTokens: z.number(),
  cacheWriteTokens: z.number(),
  reasoningTokens: z.number(),
  totalTokens: z.number(),
  totalCost: z.number(),
  estimatedCost: z.boolean(),
  calls: z.number(),
  sessions: z.number(),
  activeDays: z.number(),
});

export const ModelUsageSchema = z.object({
  modelName: z.string(),
  provider: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadTokens: z.number(),
  cacheWriteTokens: z.number(),
  reasoningTokens: z.number(),
  totalTokens:z.number(),
  totalCost: z.number(),
  estimatedCost: z.boolean(),
  calls: z.number(),
});

export const ProviderUsageSchema = z.object({
  provider: z.string(),
  displayName: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
totalTokens: z.number(),
  totalCost: z.number(),
  estimatedCost: z.boolean(),
  calls: z.number(),
  sessions: z.number(),
  projects: z.number(),
});

export const DailyUsageSchema = z.object({
  date: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadTokens: z.number(),
  cacheWriteTokens: z.number(),
  reasoningTokens: z.number(),
  totalTokens: z.number(),
  totalCost: z.number(),
  estimatedCost: z.boolean(),
  calls: z.number(),
sessions: z.number(),
  providers: z.array(ProviderUsageSchema),
  models: z.array(ModelUsageSchema),
});

export const ProjectUsageSchema = z.object({
  project: z.string(),
  projectPath: z.string(),
  providers: z.array(z.string()),
  inputTokens: z.number(),
  outputTokens: z.number(),
  totalTokens: z.number(),
  totalCost: z.number(),
  estimatedCost: z.boolean(),
  calls: z.number(),
  sessions: z.number(),
});

export const SummarySchema = z.object({
  totals: TokenTotalsSchema,
  providers: z.array(ProviderUsageSchema),
  models: z.array(ModelUsageSchema),
  projects: z.array(ProjectUsageSchema),
});
