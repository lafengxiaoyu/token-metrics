export interface ModelBreakdown {
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface DailyEntry {
  date: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
  modelsUsed: string[];
  modelBreakdowns: ModelBreakdown[];
}

export interface Totals {
  inputTokens: number;
  outputTokens: number;
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
  tokenCounts: {
    inputTokens: number;
    outputTokens: number;
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

export interface DailyToolCall {
  date: string;
  [toolName: string]: string | number;
}

export interface AnalyticsResponse {
  toolUsageDistribution: ToolUsageEntry[];
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
  reasoningTokens: number;
  totalTokens: number;
  totalCost: number;
  calls: number;
  sessions: number;
  activeDays: number;
}

export interface ModelUsageDTO {
  modelName: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  totalCost: number;
  calls: number;
}

export interface ProviderUsageDTO {
  provider: string;
  displayName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
  calls: number;
  sessions: number;
  projects: number;
}

export interface DailyUsageDTO {
  date: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  totalCost: number;
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
  calls: number;
  sessions: number;
}

export interface SummaryDTO {
  totals: TokenTotalsDTO;
  providers: ProviderUsageDTO[];
  models: ModelUsageDTO[];
  projects: ProjectUsageDTO[];
}

export interface QuotaUsage {
  plan: {
    id: string;
    monthlyUsd: number;
    provider: string;
    resetDay?: number;
  };
  periodStart: string;
  periodEnd: string;
  spentApiEquivalentUsd: number;
  budgetUsd: number;
  percentUsed: number;
  status: 'under' | 'near' | 'over';
  projectedMonthUsd: number;
  daysUntilReset: number;
}

export interface InsightsDTO {
  avgTokensPerSession: number;
  avgCostPerDay: number;
  avgCallsPerDay: number;
  peakHour: number | null;
  weeklyTrend: number;
  lastWeekCost: number;
  prevWeekCost: number;
}

export type SensitiveCommand = {
  command: string
  count: number
  risk: 'low' | 'medium' | 'high'
  timestamp: string
}

export type SecurityAuditDTO = {
  totalCommands: number
  writeOperations: number
  readOperations: number
  riskLevel: 'low' | 'medium' | 'high'
  sensitiveCommands: SensitiveCommand[]
  pathsAccessed: string[]
  commandsByRisk: {
    low: number
    medium: number
    high: number
  }
  allCommandsByRisk: {
    low: SensitiveCommand[]
    medium: SensitiveCommand[]
    high: SensitiveCommand[]
  }
}

export type ReasoningDistribution = {
  light: number   // reasoning < 100 chars
  medium: number  // 100-300 chars
  deep: number    // > 300 chars
}

export type ReasoningAnalysisDTO = {
  avgReasoningLength: number
  deepThinkingRate: number  // % with high reasoning ratio
  reasoningTokenRatio: number
  distribution: ReasoningDistribution
  totalWithReasoning: number
  totalMessages: number
}

export type ConversationQualityDTO = {
  avgQuestionLength: number
  avgResponseTokens: number
  multiTurnRate: number
  avgToolsPerQuestion: number
  totalConversations: number
  totalTurns: number
  toolBreakdown: Array<{ name: string; count: number }>
}

export type QuestionCategory = 'debugging' | 'learning' | 'implementation' | 'investigation' | 'analysis' | 'deployment' | 'configuration' | 'other'

export type QuestionClassificationDTO = {
  debugging: number
  learning: number
  implementation: number
  investigation: number
  analysis: number
  deployment: number
  configuration: number
  other: number
  total: number
  percentages: {
    debugging: number
    learning: number
    implementation: number
    investigation: number
    analysis: number
    deployment: number
    configuration: number
    other: number
  }
}

export type ToolEfficiencyItem = {
  name: string
  total: number
  succeeded: number
  failed: number
  successRate: number
  avgDuration?: number
}

export type ToolEfficiencyDTO = {
  overallSuccessRate: number
  avgRetries: number
  totalTools: number
  byTool: ToolEfficiencyItem[]
}

// New analytics types
export type FileActivityDTO = {
  editVsViewRatio: number  // percentage of edits vs total file operations
  totalEdits: number
  totalViews: number
  totalCreates: number
  languageDistribution: Array<{
    language: string
    count: number
    percentage: number
  }>
  topFiles: Array<{
    path: string
    edits: number
    views: number
    language: string
  }>
}

export type SessionDurationDTO = {
  avgDurationMinutes: number
  medianDurationMinutes: number
  totalSessions: number
  durationDistribution: {
    short: number      // < 15 min
    medium: number     // 15-60 min
    long: number       // 1-4 hours
    veryLong: number   // > 4 hours
  }
  longestSession: {
    durationMinutes: number
    date: string
  }
}

export type EfficiencyCoachBand = 'high' | 'healthy' | 'watch' | 'low'

export type EfficiencyCoachFinding = {
  title: string
  severity: 'low' | 'medium' | 'high'
  detail: string
  recommendation: string
}

export type EfficiencyScoreBreakdown = {
  outcome: number
  focus: number
  reliability: number
  cost: number
  prompt: number
}

export type EfficiencySessionReview = {
  sessionId: string
  project: string
  date: string
  category: string
  score: number
  band: EfficiencyCoachBand
  totalTokens: number
  totalCost: number
  durationMinutes: number
  turns: number
  editTurns: number
  readCalls: number
  bashCalls: number
  retries: number
  promptScore: number
  reasons: string[]
  recommendation: string
}

export type EfficiencyCategorySummary = {
  category: string
  sessions: number
  avgScore: number
  avgTokens: number
  editRate: number
  retryRate: number
}

export type EfficiencyCoachDTO = {
  score: number
  band: EfficiencyCoachBand
  summary: string
  breakdown: EfficiencyScoreBreakdown
  findings: EfficiencyCoachFinding[]
  lowEfficiencySessions: EfficiencySessionReview[]
  highEfficiencySessions: EfficiencySessionReview[]
  categories: EfficiencyCategorySummary[]
}
