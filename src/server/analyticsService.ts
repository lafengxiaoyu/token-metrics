import type { AnalyticsResponse, ToolUsageEntry, DailyToolCall } from '../shared/types.js';
import type { UsageQuery } from '../usage/query.js';
import { parseAllSessions } from '../parser.js';
import type { ProjectSummary } from '../types.js';
import { applyProjectFilter } from '../usage/projectFilter.js';

function getDateKey(timestamp: string): string {
  return timestamp.slice(0, 10);
}

function toDateRange(query: UsageQuery) {
  return { start: query.from, end: query.to };
}

export async function getAnalytics(query: UsageQuery): Promise<AnalyticsResponse> {
  const dateRange = toDateRange(query);
  const projects: ProjectSummary[] = [];

  if (query.providers.includes('all')) {
    projects.push(...await parseAllSessions(dateRange, undefined));
  } else {
    for (const provider of query.providers) {
      projects.push(...await parseAllSessions(dateRange, provider));
    }
  }

  const filteredProjects = applyProjectFilter(projects, query.project);

  const toolCountMap = new Map<string, number>();
  const trendMap = new Map<string, Map<string, number>>();

  for (const project of filteredProjects) {
    for (const session of project.sessions) {
      for (const turn of session.turns) {
        for (const call of turn.assistantCalls) {
          const date = getDateKey(call.timestamp);

          // Track tool usage
          for (const tool of call.tools) {
            toolCountMap.set(tool, (toolCountMap.get(tool) || 0) + 1);

            // Tool call trend
            if (!trendMap.has(date)) trendMap.set(date, new Map());
            const dayTools = trendMap.get(date)!;
            dayTools.set(tool, (dayTools.get(tool) || 0) + 1);
          }
        }
      }
    }
  }

  // Build tool usage distribution
  const toolUsageDistribution: ToolUsageEntry[] = [...toolCountMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Build tool call trend
  const toolCallTrend: DailyToolCall[] = [];
  for (const [date, dayTools] of trendMap) {
    const entry: DailyToolCall = { date };
    for (const [tool, count] of dayTools) {
      entry[tool] = count;
    }
    toolCallTrend.push(entry);
  }
  toolCallTrend.sort((a, b) => a.date.localeCompare(b.date));

  return {
    toolUsageDistribution,
    toolCallTrend,
  };
}
