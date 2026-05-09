export interface ModelBreakdown {
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  cost: number;
}

export interface DailyEntry {
  date: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  totalCost: number;
  modelsUsed: string[];
  modelBreakdowns: ModelBreakdown[];
}

export interface Totals {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  totalCost: number;
}

export interface DailyResponse {
  daily: DailyEntry[];
  totals: Totals;
}

export interface MonthlyResponse {
  daily: DailyEntry[];
  totals: Totals;
}

export interface SessionResponse {
  daily: DailyEntry[];
  totals: Totals;
}

export interface ProjectsResponse {
  projects: Record<string, DailyEntry[]>;
}

export interface BlockEntry {
  id: string;
  startTime: string;
  endTime: string;
  actualEndTime: string | null;
  isActive: boolean;
  isGap: boolean;
  entries: number;
  tokenCounts:{
    inputTokens: number;
    outputTokens: number;
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
  };
  totalTokens: number;
  costUSD: number;
  models: string[];
}

export interface BlocksResponse {
  blocks: BlockEntry[];
}

export type MetricMode = 'tokens' | 'usd' | 'cost';
export type GranularityMode = 'day' | 'hour';

export interface ToolUsageEntry {
  name: string;
  count: number;
}

export interface DailyCodeChange {
  date: string;
  linesAdded: number;
  linesDeleted: number;
  netChange: number;
  filesModified: number;
}

export interface DailyToolCall {
  date: string;
  [toolName: string]: string | number;
}

export interface ProductivityKPIs {
  avgLinesPerEdit: number;
  filesModifiedPerDay: number;
  addDeleteRatio: number;
  totalEdits: number;
  totalFilesModified: number;
  activeDaysWithEdits: number;
}

export interface AnalyticsResponse {
codeChangeTrend: DailyCodeChange[];
  toolUsageDistribution: ToolUsageEntry[];
  productivityKPIs: ProductivityKPIs;
  toolCallTrend: DailyToolCall[];
}

export interface AgentsResponse {
  available: string[];
  default: string | null;
}

export interface ApiResult<T> {
  data: T;
  meta: {
    generatedAt: string;
    cached: boolean;
    warnings: ApiWarning[];
  };
}

export interface ApiWarning {
  provider?: string;
  code: string;
  message: string;
}

export interface ProviderStatusDTO {
  name: string;
  displayName: string;
  available: boolean;
  sourceCount: number;
  toolSources: string[];
  error?: string;
}

export interface TokenTotalsDTO {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  totalCost: number;
  estimatedCost: boolean;
  calls: number;
  sessions: number;
  activeDays: number;
}

export interface ModelUsageDTO {
  modelName: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  totalCost: number;
  estimatedCost: boolean;
calls: number;
}

export interface ProviderUsageDTO {
  provider: string;
  displayName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
  estimatedCost: boolean;
  calls: number;
  sessions: number;
  projects: number;
}

export interface DailyUsageDTO {
  date: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  totalCost: number;
  estimatedCost: boolean;
  calls: number;
  sessions: number;
  providers: ProviderUsageDTO[];
  models: ModelUsageDTO[];
}

export interface ProjectUsageDTO {
  project: string;
  projectPath: string;
  providers: string[];
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
  estimatedCost: boolean;
  calls: number;
  sessions: number;
}

export interface SummaryDTO {
  totals: TokenTotalsDTO;
  providers:ProviderUsageDTO[];
  models: ModelUsageDTO[];
  projects: ProjectUsageDTO[];
}
