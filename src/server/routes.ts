import type { Request, Response } from 'express';
import type { ApiResult, ApiWarning } from '../shared/types.js';
import { parseQueryParams }from './request.js';
import {
  getProviderStatuses,
  getSummary,
  getDaily,
  getProjects,
  getModels,
  getProviderUsage,
} from '../usage/service.js';
import {getAnalytics } from './analyticsService.js';
import { getHourlyActivity } from './hourlyActivityService.js';
import { getEfficiencyCoach } from './efficiencyCoachService.js';
import { getPlanUsageOrNull } from '../plan-usage.js';
import { analyzeSecurityAudit, analyzeReasoningDepth, analyzeConversationQuality, classifyQuestions, analyzeToolEfficiency, analyzeFileActivity, analyzeSessionDurations } from './insightsService.js';
import { join } from 'path';
import { homedir } from 'os';
import { readdir } from 'fs/promises';

function ok<T>(data: T, cached = false): ApiResult<T> {
  return {
    data,
    meta: {
      generatedAt: new Date().toISOString(),
      cached,
      warnings: [],
    },
  };
}

function withWarning<T>(data: T, warnings: ApiWarning[], cached = false): ApiResult<T> {
  return {
    data,
    meta: {
      generatedAt: new Date().toISOString(),
      cached,
      warnings,
    },
  };
}

export function registerRoutes(app: import('express').Express): void {
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'tokenlens', timestamp: new Date().toISOString() });
  });

  app.get('/api/providers', async (_req, res) => {
    try {
      const statuses = await getProviderStatuses();
      res.json(ok(statuses));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json(withWarning([], [{ code: 'PROVIDER_ERROR', message }]));
    }
  });
app.get('/api/summary', async (req: Request, res) => {
    try {
      const query = parseQueryParams(req.query as Record<string, unknown>);
      const summary = await getSummary(query);
      res.json(ok(summary));
    } catch (err) {
if (err instanceof Error && err.message.includes('Invalid')) {
        res.status(400).json({ error: err.message });
      } else {
        res.status(500).json(withWarning(null as unknown as never[], [{ code: 'SUMMARY_ERROR', message: err instanceof Error ?err.message : String(err) }]));
      }
    }
  });

  app.get('/api/daily', async (req: Request, res) => {
    try {
      const query = parseQueryParams(req.query as Record<string, unknown>);
      const daily = await getDaily(query);
res.json(ok(daily));
    } catch (err) {
      if (err instanceof Error && err.message.includes('Invalid')) {
        res.status(400).json({ error: err.message });
      } else {
        res.status(500).json(withWarning([]as never[], [{ code: 'DAILY_ERROR', message: err instanceof Error ? err.message : String(err) }]));
      }
    }
  });

  app.get('/api/projects', async (req: Request, res) => {
    try {
      const query = parseQueryParams(req.query as Record<string, unknown>);
      const projects = await getProjects(query);
      res.json(ok(projects));
    } catch (err) {
      if (err instanceof Error && err.message.includes('Invalid')) {
        res.status(400).json({ error: err.message });
      } else{
        res.status(500).json(withWarning([] as never[], [{ code: 'PROJECTS_ERROR', message: err instanceof Error ? err.message : String(err) }]));
      }
    }
  });

  app.get('/api/models', async (req: Request, res) => {
try {
      const query = parseQueryParams(req.query as Record<string, unknown>);
      const models = await getModels(query);
      res.json(ok(models));
    } catch (err) {
      if (err instanceof Error && err.message.includes('Invalid')) {
        res.status(400).json({ error: err.message });
      } else {
        res.status(500).json(withWarning([] as never[], [{ code: 'MODELS_ERROR', message: err instanceof Error ? err.message : String(err) }]));
      }
    }
  });

  app.get('/api/provider-usage', async (req: Request, res) => {
    try {
      const query = parseQueryParams(req.query as Record<string, unknown>);
      const usage = await getProviderUsage(query);
      res.json(ok(usage));
    } catch (err) {
      if (err instanceof Error && err.message.includes('Invalid')) {
        res.status(400).json({ error: err.message });
      } else {
        res.status(500).json(withWarning([] as never[], [{ code: 'PROVIDER_USAGE_ERROR', message: err instanceof Error ? err.message : String(err) }]));
      }
    }
  });

  app.get('/api/analytics', async (req: Request, res) => {
    try {
      const query = parseQueryParams(req.query as Record<string, unknown>);
      const analytics = await getAnalytics(query);
      res.json(ok(analytics));
    } catch (err) {
      if (err instanceof Error && err.message.includes('Invalid')) {
        res.status(400).json({ error: err.message });
      } else {
        res.status(500).json(withWarning({
          codeChangeTrend: [],
          toolUsageDistribution: [],
          productivityKPIs: {
            avgLinesPerEdit: 0,
            filesModifiedPerDay: 0,
            addDeleteRatio: 0,
            totalEdits: 0,
            totalFilesModified: 0,
            activeDaysWithEdits: 0,
          },
          toolCallTrend: [],
        }, [{ code: 'ANALYTICS_ERROR', message: err instanceof Error ? err.message: String(err) }]));
      }
    }
  });

  app.get('/api/hourly-activity', async (req: Request, res) => {
    try {
      const query = parseQueryParams(req.query as Record<string, unknown>);
      const hourly = await getHourlyActivity(query);
      res.json(ok(hourly));
    } catch (err) {
      if (err instanceof Error && err.message.includes('Invalid')) {
        res.status(400).json({ error: err.message });
      } else {
        res.status(500).json(withWarning({ entries: [] }, [{ code: 'HOURLY_ERROR', message: err instanceof Error ? err.message : String(err) }]));
      }
    }
  });

  app.get('/api/quota', async (_req, res) => {
    try {
      const planUsage = await getPlanUsageOrNull();
      res.json(ok(planUsage));
    } catch (err) {
      res.status(500).json(withWarning(null, [{ code: 'QUOTA_ERROR', message: err instanceof Error ? err.message : String(err) }]));
    }
  });

  app.get('/api/insights', async (req: Request, res) => {
    try {
      const query = parseQueryParams(req.query as Record<string, unknown>);
      const summary = await getSummary(query);
      const daily = await getDaily(query);
      const hourly = await getHourlyActivity(query);
      
      // Calculate insights
      const totals = summary.totals;
      const avgTokensPerSession = totals.sessions > 0 ? Math.round(totals.totalTokens / totals.sessions) : 0;
      const avgCostPerDay = totals.activeDays > 0 ? totals.totalCost / totals.activeDays : 0;
      const avgCallsPerDay = totals.activeDays > 0 ? Math.round(totals.calls / totals.activeDays) : 0;
      
      // Find peak hour from hourly data
      const peakHourEntry = hourly.entries.reduce((max, entry) => 
        entry.totalTokens > max.totalTokens ? entry : max
      , hourly.entries[0] || { hour: 0, totalTokens: 0 });
      const peakHour = peakHourEntry ? peakHourEntry.hour : null;
      
      // Trend: compare last week vs previous week
      const today = new Date();
      const lastWeekData = daily.filter(d => {
        const date = new Date(d.date);
        const daysAgo = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        return daysAgo >= 0 && daysAgo < 7;
      });
      const prevWeekData = daily.filter(d => {
        const date = new Date(d.date);
        const daysAgo = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        return daysAgo >= 7 && daysAgo < 14;
      });
      
      const lastWeekCost = lastWeekData.reduce((sum, d) => sum + d.totalCost, 0);
      const prevWeekCost = prevWeekData.reduce((sum, d) => sum + d.totalCost, 0);
      const weeklyTrend = prevWeekCost > 0 ? ((lastWeekCost - prevWeekCost) / prevWeekCost) * 100 : 0;
      
      res.json(ok({
        avgTokensPerSession,
        avgCostPerDay,
        avgCallsPerDay,
        peakHour,
        weeklyTrend,
        lastWeekCost,
        prevWeekCost,
      }));
    } catch (err) {
      res.status(500).json(withWarning({
        avgTokensPerSession: 0,
        avgCostPerDay: 0,
        avgCallsPerDay: 0,
        peakHour: null,
        weeklyTrend: 0,
        lastWeekCost: 0,
        prevWeekCost: 0,
      }, [{ code: 'INSIGHTS_ERROR', message: err instanceof Error ? err.message : String(err) }]));
    }
  });

  app.get('/api/efficiency-coach', async (req: Request, res) => {
    try {
      const query = parseQueryParams(req.query as Record<string, unknown>);
      const coach = await getEfficiencyCoach(query);
      res.json(ok(coach));
    } catch (err) {
      if (err instanceof Error && err.message.includes('Invalid')) {
        res.status(400).json({ error: err.message });
      } else {
        res.status(500).json(withWarning({
          score: 0,
          band: 'watch',
          summary: 'Efficiency coach analysis is temporarily unavailable.',
          breakdown: { outcome: 0, focus: 0, reliability: 0, cost: 0, prompt: 0 },
          findings: [],
          lowEfficiencySessions: [],
          highEfficiencySessions: [],
          categories: [],
          weeklyReview: {
            sessions: 0,
            totalTokens: 0,
            totalCost: 0,
            avgScore: 0,
            topTaskType: 'N/A',
            bestDay: null,
            focus: 'Efficiency coach analysis is temporarily unavailable.',
            wins: [],
            improvements: [],
          },
          promptCoach: {
            avgPromptScore: 0,
            vaguePromptRate: 0,
            commonGaps: [],
            examples: [],
          },
          modelInsights: [],
          projectInsights: [],
        }, [{ code: 'EFFICIENCY_COACH_ERROR', message: err instanceof Error ? err.message : String(err) }]));
      }
    }
  });

  // Advanced Insights endpoints
  app.get('/api/insights/security', async (_req, res) => {
    try {
      const sessionDir = join(homedir(), '.copilot', 'session-state');
      const sessions = await readdir(sessionDir);
      const sessionPaths = sessions.map(s => join(sessionDir, s));
      
      const audit = await analyzeSecurityAudit(sessionPaths);
      res.json(ok(audit));
    } catch (err) {
      res.status(500).json(withWarning({
        totalCommands: 0,
        writeOperations: 0,
        readOperations: 0,
        riskLevel: 'low' as const,
        sensitiveCommands: [],
        pathsAccessed: [],
        commandsByRisk: { low: 0, medium: 0, high: 0 }
      }, [{ code: 'SECURITY_AUDIT_ERROR', message: err instanceof Error ? err.message : String(err) }]));
    }
  });

  app.get('/api/insights/reasoning', async (_req, res) => {
    try {
      const sessionDir = join(homedir(), '.copilot', 'session-state');
      const sessions = await readdir(sessionDir);
      const sessionPaths = sessions.map(s => join(sessionDir, s));
      
      const reasoning = await analyzeReasoningDepth(sessionPaths);
      res.json(ok(reasoning));
    } catch (err) {
      res.status(500).json(withWarning({
        avgReasoningLength: 0,
        deepThinkingRate: 0,
        reasoningTokenRatio: 0,
        distribution: { light: 0, medium: 0, deep: 0 },
        totalWithReasoning: 0,
        totalMessages: 0
      }, [{ code: 'REASONING_ANALYSIS_ERROR', message: err instanceof Error ? err.message : String(err) }]));
    }
  });

  app.get('/api/insights/conversation', async (_req, res) => {
    try {
      const sessionDir = join(homedir(), '.copilot', 'session-state');
      const sessions = await readdir(sessionDir);
      const sessionPaths = sessions.map(s => join(sessionDir, s));
      
      const quality = await analyzeConversationQuality(sessionPaths);
      res.json(ok(quality));
    } catch (err) {
      res.status(500).json(withWarning({
        avgQuestionLength: 0,
        avgResponseTokens: 0,
        multiTurnRate: 0,
        avgToolsPerQuestion: 0,
        totalConversations: 0,
        totalTurns: 0
      }, [{ code: 'CONVERSATION_QUALITY_ERROR', message: err instanceof Error ? err.message : String(err) }]));
    }
  });

  app.get('/api/insights/classification', async (_req, res) => {
    try {
      const sessionDir = join(homedir(), '.copilot', 'session-state');
      const sessions = await readdir(sessionDir);
      const sessionPaths = sessions.map(s => join(sessionDir, s));
      
      const classification = await classifyQuestions(sessionPaths);
      res.json(ok(classification));
    } catch (err) {
      res.status(500).json(withWarning({
        debugging: 0,
        learning: 0,
        implementation: 0,
        investigation: 0,
        analysis: 0,
        deployment: 0,
        other: 0,
        total: 0,
        percentages: { debugging: 0, learning: 0, implementation: 0, investigation: 0, analysis: 0, deployment: 0, other: 0 }
      }, [{ code: 'CLASSIFICATION_ERROR', message: err instanceof Error ? err.message : String(err) }]));
    }
  });

  app.get('/api/insights/efficiency', async (_req, res) => {
    try {
      const sessionDir = join(homedir(), '.copilot', 'session-state');
      const sessions = await readdir(sessionDir);
      const sessionPaths = sessions.map(s => join(sessionDir, s));
      
      const efficiency = await analyzeToolEfficiency(sessionPaths);
      res.json(ok(efficiency));
    } catch (err) {
      res.status(500).json(withWarning({
        overallSuccessRate: 0,
        avgRetries: 0,
        totalTools: 0,
        byTool: []
      }, [{ code: 'EFFICIENCY_ERROR', message: err instanceof Error ? err.message : String(err) }]));
    }
  })

  app.get('/api/insights/file-activity', async (_req, res) => {
    try {
      const sessionDir = join(homedir(), '.copilot', 'session-state');
      const sessions = await readdir(sessionDir);
      const sessionPaths = sessions.map(s => join(sessionDir, s));
      
      const fileActivity = await analyzeFileActivity(sessionPaths);
      res.json(ok(fileActivity));
    } catch (err) {
      res.status(500).json(withWarning({
        editVsViewRatio: 0,
        totalEdits: 0,
        totalViews: 0,
        totalCreates: 0,
        languageDistribution: [],
        topFiles: []
      }, [{ code: 'FILE_ACTIVITY_ERROR', message: err instanceof Error ? err.message : String(err) }]));
    }
  })

  app.get('/api/insights/session-durations', async (_req, res) => {
    try {
      const sessionDir = join(homedir(), '.copilot', 'session-state');
      const sessions = await readdir(sessionDir);
      const sessionPaths = sessions.map(s => join(sessionDir, s));
      
      const durations = await analyzeSessionDurations(sessionPaths);
      res.json(ok(durations));
    } catch (err) {
      res.status(500).json(withWarning({
        avgDurationMinutes: 0,
        medianDurationMinutes: 0,
        totalSessions: 0,
        durationDistribution: { short: 0, medium: 0, long: 0, veryLong: 0 },
        longestSession: { durationMinutes: 0, date: '' }
      }, [{ code: 'DURATION_ERROR', message: err instanceof Error ? err.message : String(err) }]));
    }
  })
}
