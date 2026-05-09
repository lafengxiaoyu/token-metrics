import type { DailyEntry } from '../daily-cache.js';
import type { ProjectSummary } from '../types.js';
import { aggregateProjectsIntoDays } from '../day-aggregator.js';

export function aggregateProjectsIntoDaysFromParser(projects: ProjectSummary[]): DailyEntry[] {
  return aggregateProjectsIntoDays(projects);
}

export function aggregateProjectsByProvider(projects: ProjectSummary[]) {
  const providerMap = new Map<string, {
    provider: string
    displayName: string
    inputTokens: number
    outputTokens: number
totalTokens: number
    totalCost: number
    estimatedCost: boolean
    calls: number
    sessions: number
    projects: number
  }>();

  for (const project of projects) {
    for (const session of project.sessions) {
      for (const turn of session.turns) {
        for (const call of turn.assistantCalls) {
          const existing = providerMap.get(call.provider) ?? {
            provider: call.provider,
            displayName: call.provider,
            inputTokens:0,
            outputTokens: 0,
            totalTokens: 0,
            totalCost: 0,
            estimatedCost: false,
            calls: 0,
            sessions: 0,
            projects: 0,
          };

          existing.inputTokens += call.usage.inputTokens;
          existing.outputTokens += call.usage.outputTokens;
          existing.totalTokens += call.usage.inputTokens + call.usage.outputTokens;
          existing.totalCost += call.costUSD;
          existing.calls += 1;

providerMap.set(call.provider, existing);
        }
      }
    }
  }

  // Deduplicate projects per provider
  const providerProjects = new Map<string, Set<string>>();
  for (const project of projects) {
    for (const session of project.sessions) {
      for (const turn of session.turns) {
        for (const call of turn.assistantCalls) {
          const existing = providerProjects.get(call.provider) ?? new Set();
          existing.add(project.project);
          providerProjects.set(call.provider, existing);
        }
      }
    }
  }

  const result: Array<{
    provider: string
    displayName: string
    inputTokens: number
    outputTokens:number
    totalTokens: number
    totalCost: number
    estimatedCost: boolean
    calls: number
    sessions: number
    projects: number
  }> = [];

  for (const [provider, data] of providerMap) {
    data.sessions = new Set(
      projects.flatMap(p => p.sessions).filter(s =>
        s.turns.some(t => t.assistantCalls.some(c => c.provider === provider))
      ).map(s => s.sessionId)
    ).size;
    data.projects = providerProjects.get(provider)?.size ?? 0;
    result.push(data);
  }

  return result;
}
