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
} from '../../shared/types';

export interface HourlyActivityEntry {
  date: string;
  hour: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
  totalCost: number;
  calls: number;
}

export interface HourlyActivityResponse {
  entries: HourlyActivityEntry[];
}

const BASE = '/api';

function qs(provider: string, extra?: Record<string, string>): string {
  const parts: string[] = [];
  if (provider !== 'all') parts.push('provider=' + encodeURIComponent(provider));
  if (extra){
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

export async function fetchDaily(provider = 'all', project?: string): Promise<DailyResponse> {
  const res = await fetch(BASE + '/daily' + qs(provider, project ? { project } : undefined));
  if (!res.ok) throw new Error('Failed to fetch daily: ' + res.status);
  const json = await res.json() as ApiResult<DailyUsageDTO[]>;
  return {
    daily: json.data.map((d: DailyUsageDTO): DailyEntry => ({
      date: d.date,
      inputTokens:d.inputTokens,
      outputTokens: d.outputTokens,
      cacheCreationTokens: d.cacheWriteTokens,
      cacheReadTokens: d.cacheReadTokens,
      totalTokens: d.totalTokens,
      totalCost: d.totalCost,
      modelsUsed: d.models.map((m) => m.modelName),
      modelBreakdowns: d.models.map((m) => ({
        modelName: m.modelName,
        inputTokens: m.inputTokens,
        outputTokens: m.outputTokens,
        cacheCreationTokens: m.cacheWriteTokens,
        cacheReadTokens: m.cacheReadTokens,
cost: m.totalCost,
      })),
    })),
    totals: {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
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

export async function fetchProjects(provider = 'all'): Promise<ProjectsResponse> {
  const res = await fetch(BASE + '/projects' + qs(provider));
  if (!res.ok) throw new Error('Failed to fetch projects: ' + res.status);
  const json = await res.json() as ApiResult<ProjectUsageDTO[]>;
  const byProject: Record<string, DailyEntry[]> = {};
  for (const p of json.data) {
    byProject[p.project] = [{
      date: '',
      inputTokens: p.inputTokens,
      outputTokens: p.outputTokens,
      cacheCreationTokens: 0,
cacheReadTokens: 0,
      totalTokens: p.totalTokens,
      totalCost: p.totalCost,
      modelsUsed: [],
      modelBreakdowns: [],
    }];
  }
  return { projects: byProject };
}

export async function fetchAnalytics(provider ='all', project?: string): Promise<AnalyticsResponse> {
  const res = await fetch(BASE + '/analytics' + qs(provider, project ? { project } : undefined));
  if (!res.ok) throw new Error('Failed to fetch analytics: ' + res.status);
  const json= await res.json() as ApiResult<AnalyticsResponse>;
  return json.data;
}

export async function fetchHourlyActivity(provider = 'all', project?: string): Promise<HourlyActivityResponse> {
  const res = await fetch(BASE + '/hourly-activity' + qs(provider, project ? { project } : undefined));
  if (!res.ok) throw new Error('Failed to fetch hourly activity: ' + res.status);
  const json = await res.json() as ApiResult<HourlyActivityResponse>;
  return json.data;
}

export async function fetchBlocks(_provider = 'all', _project = ''): Promise<BlocksResponse> {
  return { blocks: [] };
}
