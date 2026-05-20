import type {
  DailyResponse,
  MonthlyResponse,
  SessionResponse,
  ProjectsResponse,
  BlocksResponse,
  ApiResult,
  DailyUsageDTO,
  ProjectUsageDTO,
  AnalyticsResponse,
  DailyEntry,
  ProviderStatusDTO,
//   AnalyticsDTO,
//   HourlyActivityDTO,
  QuotaUsage,
  InsightsDTO,
  SecurityAuditDTO,
  ReasoningAnalysisDTO,
  ConversationQualityDTO,
  QuestionClassificationDTO,
  ToolEfficiencyDTO,
  FileActivityDTO,
  SessionDurationDTO,
  EfficiencyCoachDTO,
} from '../../shared/types';

export interface HourlyActivityEntry {
  date: string;
  hour: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
  calls: number;
}

export interface HourlyActivityResponse {
  entries: HourlyActivityEntry[];
}

const BASE = '/api';

export type TimeRangeKey = 'today' | '7d' | 'mtd' | '30d' | '60d' | 'all';

function timeRangeToDates(range: TimeRangeKey): { from?: string; to?: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const to = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;

  switch (range) {
    case 'today': {
      const from = to;
      return { from, to };
    }
    case '7d': {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      const from = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      return { from, to };
    }
    case 'mtd': {
      // Month to Date: first day of current month
      const from = `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`;
      return { from, to };
    }
    case '30d': {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      const from = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      return { from, to };
    }
    case '60d': {
      const d = new Date(now); d.setDate(d.getDate() - 60);
      const from = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      return { from, to };
    }
    case 'all': {
      // Use Unix epoch as the earliest possible date for true ALL semantics
      return { from: '1970-01-01', to };
    }
  }
}

function qs(provider: string, extra?: Record<string, string | undefined>): string {
  const parts: string[] = [];
  if (provider !== 'all') parts.push('provider=' + encodeURIComponent(provider));
  if (extra) {
    for (const [key, val] of Object.entries(extra)) {
      if (val) parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(val));
    }
  }
  return parts.length > 0 ? '?' + parts.join('&') : '';
}

export async function fetchProviders(): Promise<ProviderStatusDTO[]> {
  const res = await fetch(BASE + '/providers');
  if (!res.ok) throw new Error('Failed to fetch providers: ' + res.status);
const json = await res.json() as ApiResult<ProviderStatusDTO[]>;
  return json.data;
}

export async function fetchDaily(provider = 'all', project?: string, range: TimeRangeKey = '30d'): Promise<DailyResponse> {
  const { from, to } =timeRangeToDates(range);
  const res = await fetch(BASE + '/daily' + qs(provider, { project: project || undefined, from, to }));
  if (!res.ok) throw new Error('Failed to fetch daily: ' + res.status);
  const json = await res.json() as ApiResult<DailyUsageDTO[]>;
  return {
    daily: json.data.map((d: DailyUsageDTO): DailyEntry => ({
      date: d.date,
      inputTokens: d.inputTokens,
      outputTokens: d.outputTokens,
      totalTokens: d.totalTokens,
      totalCost: d.totalCost,
      modelsUsed: (d.models || []).map((m) => m.modelName),
      modelBreakdowns: (d.models || []).map((m) => ({
        modelName:m.modelName,
        inputTokens: m.inputTokens,
        outputTokens: m.outputTokens,
        cost: m.totalCost,
      })),
    })),
    totals: {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
    },
  };
}

export async function fetchMonthly(provider = 'all'): Promise<MonthlyResponse> {
  return fetchDaily(provider);
}

export async function fetchSession(provider = 'all'): Promise<SessionResponse> {
  return fetchDaily(provider);
}

export async function fetchProjects(provider = 'all', range: TimeRangeKey = '30d'): Promise<ProjectsResponse> {
  const { from, to } = timeRangeToDates(range);
  const res = await fetch(BASE + '/projects' + qs(provider, { from, to }));
  if (!res.ok) throw new Error('Failed to fetch projects: ' + res.status);
  const json = await res.json() as ApiResult<ProjectUsageDTO[]>;
  const byProject: Record<string, DailyEntry[]> = {};
  for (const p of json.data) {
    byProject[p.projectPath] = [{
      date: '',
      inputTokens: p.inputTokens,
      outputTokens: p.outputTokens,
      totalTokens: p.totalTokens,
      totalCost: p.totalCost,
      modelsUsed: [],
      modelBreakdowns: [],
    }];
  }
  return { projects: byProject };
}

export async function fetchAnalytics(provider = 'all', project?: string, range: TimeRangeKey = '30d'): Promise<AnalyticsResponse> {
  const { from, to } = timeRangeToDates(range);
  const res = await fetch(BASE + '/analytics' + qs(provider, { project: project || undefined, from, to }));
  if (!res.ok) throw new Error('Failed to fetch analytics: ' + res.status);
  const json = await res.json() as ApiResult<AnalyticsResponse>;
  return json.data;
}

export async function fetchHourlyActivity(provider ='all', project?: string, range: TimeRangeKey = '30d'): Promise<HourlyActivityResponse> {
  const { from, to } = timeRangeToDates(range);
  const res = await fetch(BASE + '/hourly-activity' + qs(provider, { project:project || undefined, from, to }));
  if (!res.ok) throw new Error('Failed to fetch hourly activity: ' + res.status);
  const json = await res.json() as ApiResult<HourlyActivityResponse>;
  return json.data;
}

export async function fetchBlocks(_provider ='all', _project = ''): Promise<BlocksResponse> {
  return { blocks: [] };
}

export async function fetchQuota(): Promise<QuotaUsage | null> {
  const res = await fetch(BASE + '/quota');
  if (!res.ok) return null;
  const json = await res.json() as ApiResult<QuotaUsage | null>;
  return json.data;
}

export async function fetchInsights(provider = 'all', range: TimeRangeKey = '30d'): Promise<InsightsDTO> {
  const { from, to } = timeRangeToDates(range);
  const res = await fetch(BASE + '/insights' + qs(provider, { from, to }));
  if (!res.ok) throw new Error('Failed to fetch insights: ' + res.status);
  const json = await res.json() as ApiResult<InsightsDTO>;
  return json.data;
}

export async function fetchSecurityAudit(): Promise<SecurityAuditDTO> {
  const res = await fetch(BASE + '/insights/security');
  if (!res.ok) throw new Error('Failed to fetch security audit: ' + res.status);
  const json = await res.json() as ApiResult<SecurityAuditDTO>;
  return json.data;
}

export async function fetchReasoningAnalysis(): Promise<ReasoningAnalysisDTO> {
  const res = await fetch(BASE + '/insights/reasoning');
  if (!res.ok) throw new Error('Failed to fetch reasoning analysis: ' + res.status);
  const json = await res.json() as ApiResult<ReasoningAnalysisDTO>;
  return json.data;
}

export async function fetchConversationQuality(): Promise<ConversationQualityDTO> {
  const res = await fetch(BASE + '/insights/conversation');
  if (!res.ok) throw new Error('Failed to fetch conversation quality: ' + res.status);
  const json = await res.json() as ApiResult<ConversationQualityDTO>;
  return json.data;
}

export async function fetchQuestionClassification(): Promise<QuestionClassificationDTO> {
  const res = await fetch(BASE + '/insights/classification');
  if (!res.ok) throw new Error('Failed to fetch question classification: ' + res.status);
  const json = await res.json() as ApiResult<QuestionClassificationDTO>;
  return json.data;
}

export async function fetchToolEfficiency(): Promise<ToolEfficiencyDTO> {
  const res = await fetch(BASE + '/insights/efficiency');
  if (!res.ok) throw new Error('Failed to fetch tool efficiency: ' + res.status);
  const json = await res.json() as ApiResult<ToolEfficiencyDTO>;
  return json.data;
}

export async function fetchFileActivity(): Promise<{ data: FileActivityDTO; meta: any }> {
  const res = await fetch(BASE + '/insights/file-activity');
  if (!res.ok) throw new Error('Failed to fetch file activity: ' + res.status);
  return res.json();
}

export async function fetchSessionDurations(): Promise<{ data: SessionDurationDTO; meta: any }> {
  const res = await fetch(BASE + '/insights/session-durations');
  if (!res.ok) throw new Error('Failed to fetch session durations: ' + res.status);
  return res.json();
}

export async function fetchEfficiencyCoach(provider = 'all', project?: string, range: TimeRangeKey = '30d'): Promise<EfficiencyCoachDTO> {
  const { from, to } = timeRangeToDates(range);
  const res = await fetch(BASE + '/efficiency-coach' + qs(provider, { project: project || undefined, from, to }));
  if (!res.ok) throw new Error('Failed to fetch efficiency coach: ' + res.status);
  const json = await res.json() as ApiResult<EfficiencyCoachDTO>;
  return json.data;
}
